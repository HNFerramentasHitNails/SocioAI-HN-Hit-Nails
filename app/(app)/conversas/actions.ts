"use server";

import { revalidatePath } from "next/cache";

import { requireProfile } from "@/lib/supabase/auth";
import { ChannelError, resolveWhatsappConfig } from "@/lib/integrations/config";
import { sendText } from "@/lib/integrations/evolution";

export async function setAiPaused(
  leadId: string,
  paused: boolean,
): Promise<{ ok?: boolean; error?: string }> {
  const { supabase } = await requireProfile();
  const { error } = await supabase
    .from("leads")
    .update({ ai_paused: paused })
    .eq("id", leadId);
  if (error) return { error: error.message };
  revalidatePath(`/conversas/${leadId}`);
  revalidatePath("/conversas");
  return { ok: true };
}

/** Human takeover: send a manual WhatsApp reply and pause the AI for this lead. */
export async function sendManualReply(
  leadId: string,
  text: string,
): Promise<{ ok?: boolean; error?: string }> {
  const { supabase, profile } = await requireProfile();
  if (!text.trim()) return { error: "Escreve uma mensagem." };

  const { data: lead } = await supabase
    .from("leads")
    .select("id, phone, organization_id")
    .eq("id", leadId)
    .single();
  if (!lead?.phone) return { error: "O lead não tem telefone." };

  const { data: integ } = await supabase
    .from("integrations")
    .select("config")
    .eq("type", "whatsapp")
    .maybeSingle();
  const cfg = resolveWhatsappConfig(
    (integ?.config ?? null) as Record<string, unknown> | null,
  );

  try {
    await sendText(cfg, lead.phone, text.trim());
  } catch (e) {
    return {
      error: e instanceof ChannelError ? e.message : "Falha ao enviar a mensagem.",
    };
  }

  await supabase.from("conversation_messages").insert({
    organization_id: lead.organization_id ?? profile.organization_id!,
    lead_id: leadId,
    role: "assistant",
    body: text.trim(),
  });
  // Human took over -> pause the AI.
  await supabase.from("leads").update({ ai_paused: true }).eq("id", leadId);

  revalidatePath(`/conversas/${leadId}`);
  return { ok: true };
}
