"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/supabase/auth";
import { enqueueCampaignMessages, processQueue } from "@/lib/campaigns/engine";
import type { Channel } from "@/lib/config";

export type CreateCampaignInput = {
  name: string;
  channels: Channel[];
  leadIds: string[];
  whatsappTemplateId?: string | null;
  emailTemplateId?: string | null;
  emailSubject?: string | null;
  mode: "now" | "later";
  scheduledAt?: string | null;
};

export async function createCampaign(
  input: CreateCampaignInput,
): Promise<{ error?: string }> {
  const { supabase, profile, user } = await requireAdmin();
  const orgId = profile.org_id!;

  if (!input.name?.trim()) return { error: "Dá um nome à campanha." };
  if (!input.channels?.length) return { error: "Escolhe pelo menos um canal." };
  if (!input.leadIds?.length) return { error: "Seleciona pelo menos um lead." };
  if (input.mode === "later" && !input.scheduledAt) {
    return { error: "Define a data e hora do agendamento." };
  }

  // Resolve template bodies for the chosen channels.
  const tplIds = [input.whatsappTemplateId, input.emailTemplateId].filter(
    Boolean,
  ) as string[];
  const { data: tpls } = tplIds.length
    ? await supabase.from("templates").select("id, body").in("id", tplIds)
    : { data: [] as { id: string; body: string | null }[] };
  const bodyOf = (id?: string | null) =>
    id ? (tpls?.find((t) => t.id === id)?.body ?? null) : null;

  const whatsappBody = input.channels.includes("whatsapp")
    ? bodyOf(input.whatsappTemplateId)
    : null;
  const emailBody = input.channels.includes("email")
    ? bodyOf(input.emailTemplateId)
    : null;

  if (input.channels.includes("whatsapp") && !whatsappBody) {
    return { error: "Escolhe um template de WhatsApp com conteúdo." };
  }
  if (input.channels.includes("email") && !emailBody) {
    return { error: "Escolhe um template de Email com conteúdo." };
  }

  const scheduledAt = input.mode === "later" ? input.scheduledAt! : null;

  const { data: campaign, error: cErr } = await supabase
    .from("campaigns")
    .insert({
      org_id: orgId,
      name: input.name.trim(),
      channels: input.channels,
      status: input.mode === "later" ? "scheduled" : "running",
      scheduled_at: scheduledAt,
      whatsapp_template_id: input.whatsappTemplateId ?? null,
      email_template_id: input.emailTemplateId ?? null,
      email_subject: input.emailSubject ?? null,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (cErr || !campaign) {
    return { error: cErr?.message ?? "Falha ao criar a campanha." };
  }

  await supabase.from("campaign_leads").insert(
    input.leadIds.map((lead_id) => ({
      campaign_id: campaign.id,
      lead_id,
      org_id: orgId,
    })),
  );

  const { data: leads } = await supabase
    .from("leads")
    .select("id, phone, email")
    .in("id", input.leadIds);

  const count = await enqueueCampaignMessages(supabase, {
    orgId,
    campaignId: campaign.id,
    channels: input.channels,
    leads: leads ?? [],
    whatsappBody,
    emailBody,
    scheduledAt,
  });

  if (count === 0) {
    await supabase
      .from("campaigns")
      .update({ status: "draft" })
      .eq("id", campaign.id);
    return {
      error:
        "Nenhum dos leads selecionados tem contacto para os canais escolhidos.",
    };
  }

  if (input.mode === "now") {
    await processQueue(supabase, { orgId, limit: 200 });
  }

  revalidatePath("/campaigns");
  redirect(`/campaigns/${campaign.id}`);
}

export async function sendCampaignNow(
  id: string,
): Promise<{ ok?: boolean; error?: string }> {
  const { supabase, profile } = await requireAdmin();
  await supabase
    .from("messages")
    .update({ scheduled_at: null })
    .eq("campaign_id", id)
    .eq("status", "queued");
  await supabase.from("campaigns").update({ status: "running" }).eq("id", id);
  await processQueue(supabase, { orgId: profile.org_id!, limit: 200 });
  revalidatePath(`/campaigns/${id}`);
  revalidatePath("/campaigns");
  return { ok: true };
}

export async function pauseCampaign(
  id: string,
): Promise<{ ok?: boolean; error?: string }> {
  const { supabase } = await requireAdmin();
  const { error } = await supabase
    .from("campaigns")
    .update({ status: "paused" })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(`/campaigns/${id}`);
  revalidatePath("/campaigns");
  return { ok: true };
}

export async function resumeCampaign(
  id: string,
): Promise<{ ok?: boolean; error?: string }> {
  const { supabase } = await requireAdmin();
  const { error } = await supabase
    .from("campaigns")
    .update({ status: "running" })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(`/campaigns/${id}`);
  revalidatePath("/campaigns");
  return { ok: true };
}

export async function deleteCampaign(
  id: string,
): Promise<{ ok?: boolean; error?: string }> {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("campaigns").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/campaigns");
  return { ok: true };
}
