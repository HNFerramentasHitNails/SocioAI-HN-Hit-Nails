import { NextResponse, type NextRequest } from "next/server";

import { createAdminClient } from "@/lib/supabase/server";
import {
  resolveAgentConfig,
  resolveAiConfig,
  resolveWhatsappConfig,
} from "@/lib/integrations/config";
import { sendText } from "@/lib/integrations/evolution";
import {
  generateAgentReply,
  detectOptOut,
  detectHandoff,
} from "@/lib/agent/agent";

type EvoMessage = {
  key?: { remoteJid?: string; fromMe?: boolean };
  message?: {
    conversation?: string;
    extendedTextMessage?: { text?: string };
    imageMessage?: { caption?: string };
    videoMessage?: { caption?: string };
    buttonsResponseMessage?: { selectedDisplayText?: string };
    listResponseMessage?: { title?: string };
  };
};

function extractText(m: EvoMessage): string {
  const msg = m.message ?? {};
  return (
    msg.conversation ||
    msg.extendedTextMessage?.text ||
    msg.imageMessage?.caption ||
    msg.videoMessage?.caption ||
    msg.buttonsResponseMessage?.selectedDisplayText ||
    msg.listResponseMessage?.title ||
    ""
  );
}

export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const provided =
      request.nextUrl.searchParams.get("secret") ??
      request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
      "";
    if (provided !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ ok: false, reason: "service role missing" });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: true });
  }

  const event = (payload as { event?: string })?.event ?? "";
  const isUpsert = /messages.?upsert/i.test(event);
  const isUpdate = /messages.?update/i.test(event);
  if (!isUpsert && !isUpdate) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const raw = (payload as { data?: unknown }).data;
  const items = Array.isArray(raw) ? raw : [raw];
  const supabase = createAdminClient();
  const nowIso = new Date().toISOString();

  // --- Delivery / read receipts -> mark messages as delivered ---
  if (isUpdate) {
    const DELIVERED = ["DELIVERY_ACK", "DELIVERED", "READ", "PLAYED"];
    let updated = 0;
    for (const item of items) {
      const it = item as {
        keyId?: string;
        messageId?: string;
        status?: string;
        key?: { id?: string };
        update?: { status?: string };
      } | null;
      const id = it?.keyId ?? it?.key?.id ?? it?.messageId;
      const status = (it?.status ?? it?.update?.status ?? "").toString().toUpperCase();
      if (!id || !DELIVERED.includes(status)) continue;
      const { error } = await supabase
        .from("messages")
        .update({ status: "delivered" })
        .eq("provider_message_id", id)
        .eq("status", "sent");
      if (!error) updated++;
    }
    return NextResponse.json({ ok: true, updated });
  }

  // --- Incoming messages -> reply + AI agent ---
  const { data: leads } = await supabase
    .from("leads")
    .select("id, phone, status, org_id, ai_paused")
    .not("phone", "is", null)
    .limit(5000);

  const normalized = (leads ?? []).map((l) => ({
    ...l,
    digits: (l.phone ?? "").replace(/\D/g, ""),
  }));

  function findLead(jidDigits: string) {
    const last9 = jidDigits.slice(-9);
    return normalized.find(
      (l) => l.digits.endsWith(last9) || jidDigits.endsWith(l.digits.slice(-9)),
    );
  }

  // Cache org-level configs.
  const cfgCache = new Map<
    string,
    Awaited<ReturnType<typeof loadOrgConfig>>
  >();
  async function loadOrgConfig(orgId: string) {
    const { data: integ } = await supabase
      .from("integrations")
      .select("type, config, enabled")
      .eq("org_id", orgId);
    const byType = (t: string) =>
      (integ ?? []).find((r) => r.type === t) as
        | { config: Record<string, unknown> | null; enabled: boolean }
        | undefined;
    const { data: org } = await supabase
      .from("organization")
      .select("about_context")
      .eq("id", orgId)
      .single();
    const agentRow = byType("agent");
    return {
      wa: resolveWhatsappConfig(byType("whatsapp")?.config),
      ai: resolveAiConfig(byType("ai")?.config),
      agent: resolveAgentConfig(agentRow?.config),
      agentEnabled: agentRow?.enabled ?? false,
      about: ((org?.about_context as string) ?? "") || "",
    };
  }
  async function getCfg(orgId: string) {
    const cached = cfgCache.get(orgId);
    if (cached) return cached;
    const cfg = await loadOrgConfig(orgId);
    cfgCache.set(orgId, cfg);
    return cfg;
  }

  let matched = 0;
  let replied = 0;

  for (const item of items) {
    const m = item as EvoMessage | null;
    const key = m?.key;
    if (!key || key.fromMe) continue;
    const jid = key.remoteJid ?? "";
    if (!jid || jid.endsWith("@g.us")) continue;
    const digits = jid.split("@")[0].replace(/\D/g, "");
    if (!digits) continue;

    const lead = findLead(digits);
    if (!lead) continue;
    matched++;
    const text = m ? extractText(m) : "";

    // Mark lead as replied + close out campaign messages.
    if (lead.status !== "respondeu") {
      await supabase
        .from("leads")
        .update({ status: "respondeu" })
        .eq("id", lead.id);
    }
    await supabase
      .from("messages")
      .update({ status: "replied", replied_at: nowIso })
      .eq("lead_id", lead.id)
      .eq("channel", "whatsapp")
      .in("status", ["sent", "delivered"]);

    if (!text.trim()) continue;

    // Log inbound message.
    await supabase.from("conversation_messages").insert({
      org_id: lead.org_id,
      lead_id: lead.id,
      role: "lead",
      body: text,
    });

    // --- AI agent auto-reply ---
    if (lead.ai_paused) continue;
    const cfg = await getCfg(lead.org_id);
    if (!cfg.agentEnabled) continue;

    if (detectOptOut(text)) {
      await supabase.from("leads").update({ ai_paused: true }).eq("id", lead.id);
      continue;
    }

    if (detectHandoff(text)) {
      const handoff =
        "Claro! 😊 Vou pedir a um colega da equipa da HN Hit Nails para falar contigo em breve.";
      try {
        await sendText(cfg.wa, lead.phone!, handoff);
        await supabase.from("conversation_messages").insert({
          org_id: lead.org_id,
          lead_id: lead.id,
          role: "assistant",
          body: handoff,
        });
      } catch {
        // ignore send failure
      }
      await supabase.from("leads").update({ ai_paused: true }).eq("id", lead.id);
      continue;
    }

    const { count: turns } = await supabase
      .from("conversation_messages")
      .select("id", { count: "exact", head: true })
      .eq("lead_id", lead.id)
      .eq("role", "assistant");
    if ((turns ?? 0) >= cfg.agent.maxTurns) {
      await supabase.from("leads").update({ ai_paused: true }).eq("id", lead.id);
      continue;
    }

    const { data: hist } = await supabase
      .from("conversation_messages")
      .select("role, body")
      .eq("lead_id", lead.id)
      .order("created_at", { ascending: true })
      .limit(40);
    const history = (hist ?? [])
      .slice(-12)
      .map((h) => ({ role: h.role as "lead" | "assistant", body: h.body }));

    try {
      const reply = await generateAgentReply({
        history,
        about: cfg.about,
        agent: cfg.agent,
        ai: cfg.ai,
      });
      await sendText(cfg.wa, lead.phone!, reply);
      await supabase.from("conversation_messages").insert({
        org_id: lead.org_id,
        lead_id: lead.id,
        role: "assistant",
        body: reply,
      });
      replied++;
    } catch {
      // Never fail the webhook on AI/send errors.
    }
  }

  return NextResponse.json({ ok: true, matched, replied });
}
