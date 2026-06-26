import type { SupabaseClient } from "@supabase/supabase-js";

import {
  resolveEmailConfig,
  resolveWhatsappConfig,
  type EmailConfig,
  type WhatsappConfig,
} from "@/lib/integrations/config";
import { sendToLead } from "@/lib/integrations/send";
import type { Channel } from "@/lib/config";
import type { Database, Tables } from "@/lib/supabase/types";

type DB = SupabaseClient<Database>;
type Lead = Tables<"leads">;

export type OrgIntegrations = {
  whatsapp: WhatsappConfig;
  email: EmailConfig;
};

export async function loadOrgIntegrations(
  supabase: DB,
  orgId: string,
): Promise<OrgIntegrations> {
  const { data } = await supabase
    .from("integrations")
    .select("type, config")
    .eq("org_id", orgId);
  const rows = data ?? [];
  const wa = rows.find((r) => r.type === "whatsapp")?.config as
    | Record<string, unknown>
    | undefined;
  const em = rows.find((r) => r.type === "email")?.config as
    | Record<string, unknown>
    | undefined;
  return {
    whatsapp: resolveWhatsappConfig(wa),
    email: resolveEmailConfig(em),
  };
}

/**
 * Creates queued message rows for a campaign: one per (lead, applicable channel).
 * A WhatsApp message needs the lead's phone; an email message needs the email.
 */
export async function enqueueCampaignMessages(
  supabase: DB,
  opts: {
    orgId: string;
    campaignId: string;
    channels: Channel[];
    leads: Pick<Lead, "id" | "phone" | "email">[];
    whatsappBody: string | null;
    emailBody: string | null;
    scheduledAt: string | null;
  },
): Promise<number> {
  const rows: Database["public"]["Tables"]["messages"]["Insert"][] = [];

  for (const lead of opts.leads) {
    if (
      opts.channels.includes("whatsapp") &&
      opts.whatsappBody &&
      lead.phone
    ) {
      rows.push({
        org_id: opts.orgId,
        campaign_id: opts.campaignId,
        lead_id: lead.id,
        channel: "whatsapp",
        body: opts.whatsappBody,
        status: "queued",
        scheduled_at: opts.scheduledAt,
      });
    }
    if (opts.channels.includes("email") && opts.emailBody && lead.email) {
      rows.push({
        org_id: opts.orgId,
        campaign_id: opts.campaignId,
        lead_id: lead.id,
        channel: "email",
        body: opts.emailBody,
        status: "queued",
        scheduled_at: opts.scheduledAt,
      });
    }
  }

  if (rows.length === 0) return 0;
  const { error } = await supabase.from("messages").insert(rows);
  if (error) throw new Error(error.message);
  return rows.length;
}

/**
 * Processes due queued messages and sends them. Works both with an admin
 * session client (RLS-scoped) and the service-role client (cron, bypasses RLS).
 */
export async function processQueue(
  supabase: DB,
  opts: { orgId?: string; limit?: number; nowIso?: string } = {},
): Promise<{ processed: number; sent: number; failed: number }> {
  const now = opts.nowIso ?? new Date().toISOString();
  const limit = opts.limit ?? 25;

  let query = supabase
    .from("messages")
    .select("*")
    .eq("status", "queued")
    .or(`scheduled_at.is.null,scheduled_at.lte.${now}`)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (opts.orgId) query = query.eq("org_id", opts.orgId);

  const { data: messages, error } = await query;
  if (error) throw new Error(error.message);
  if (!messages || messages.length === 0) {
    return { processed: 0, sent: 0, failed: 0 };
  }

  // Preload related leads and campaigns.
  const leadIds = [...new Set(messages.map((m) => m.lead_id).filter(Boolean))];
  const campaignIds = [
    ...new Set(messages.map((m) => m.campaign_id).filter(Boolean)),
  ];

  const { data: leads } = leadIds.length
    ? await supabase
        .from("leads")
        .select("id, name, company, email, phone, city, niche, status")
        .in("id", leadIds as string[])
    : { data: [] as Lead[] };
  const leadById = new Map((leads ?? []).map((l) => [l.id, l]));

  const { data: campaigns } = campaignIds.length
    ? await supabase
        .from("campaigns")
        .select("id, email_subject, status")
        .in("id", campaignIds as string[])
    : {
        data: [] as {
          id: string;
          email_subject: string | null;
          status: string;
        }[],
      };
  const subjectByCampaign = new Map(
    (campaigns ?? []).map((c) => [c.id, c.email_subject]),
  );
  const statusByCampaign = new Map(
    (campaigns ?? []).map((c) => [c.id, c.status]),
  );

  const integrationsCache = new Map<string, OrgIntegrations>();
  let sent = 0;
  let failed = 0;

  for (const m of messages) {
    // Skip messages whose campaign is paused (leave them queued).
    if (m.campaign_id && statusByCampaign.get(m.campaign_id) === "paused") {
      continue;
    }

    const lead = m.lead_id ? leadById.get(m.lead_id) : undefined;
    if (!lead || !m.body) {
      await supabase
        .from("messages")
        .update({ status: "skipped", error: "Lead ou conteúdo em falta." })
        .eq("id", m.id);
      continue;
    }

    let integrations = integrationsCache.get(m.org_id);
    if (!integrations) {
      integrations = await loadOrgIntegrations(supabase, m.org_id);
      integrationsCache.set(m.org_id, integrations);
    }

    try {
      await sendToLead({
        channel: m.channel as Channel,
        body: m.body,
        subject:
          (m.campaign_id ? subjectByCampaign.get(m.campaign_id) : null) ??
          "Mensagem",
        lead,
        whatsapp: integrations.whatsapp,
        email: integrations.email,
      });

      await supabase
        .from("messages")
        .update({ status: "sent", sent_at: now, error: null })
        .eq("id", m.id);

      if (m.campaign_id) {
        await supabase
          .from("campaign_leads")
          .update({ status: "sent" })
          .eq("campaign_id", m.campaign_id)
          .eq("lead_id", lead.id);
      }

      // Advance lead pipeline from "novo" to "contatado".
      if (lead.status === "novo") {
        await supabase
          .from("leads")
          .update({ status: "contatado" })
          .eq("id", lead.id);
      }
      sent++;
    } catch (e) {
      await supabase
        .from("messages")
        .update({
          status: "failed",
          error: e instanceof Error ? e.message : "Erro de envio.",
        })
        .eq("id", m.id);
      failed++;
    }
  }

  // Mark campaigns with no remaining queued messages as completed.
  for (const campaignId of campaignIds as string[]) {
    const { count } = await supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", campaignId)
      .eq("status", "queued");
    if ((count ?? 0) === 0) {
      await supabase
        .from("campaigns")
        .update({ status: "completed" })
        .eq("id", campaignId)
        .neq("status", "paused");
    }
  }

  return { processed: messages.length, sent, failed };
}
