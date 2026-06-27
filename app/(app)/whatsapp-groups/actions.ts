"use server";

import { revalidatePath } from "next/cache";

import { requireProfile } from "@/lib/supabase/auth";
import { recordExternalRefs } from "@/lib/supabase/refs";
import { ChannelError, resolveWhatsappConfig } from "@/lib/integrations/config";
import * as evolution from "@/lib/integrations/evolution";

export type GroupItem = { id: string; subject: string; size: number };

async function whatsappConfig() {
  const { supabase, profile, user } = await requireProfile();
  const { data } = await supabase
    .from("integrations")
    .select("config")
    .eq("type", "whatsapp")
    .maybeSingle();
  const cfg = resolveWhatsappConfig(
    (data?.config ?? null) as Record<string, unknown> | null,
  );
  return { supabase, profile, user, cfg };
}

export async function listGroups(): Promise<{
  groups?: GroupItem[];
  error?: string;
}> {
  const { cfg } = await whatsappConfig();
  try {
    const groups = await evolution.fetchGroups(cfg);
    return { groups };
  } catch (e) {
    return {
      error: e instanceof ChannelError ? e.message : "Falha ao obter os grupos.",
    };
  }
}

export async function importGroupMembers(
  groupJid: string,
  subject: string,
): Promise<{ ok?: boolean; count?: number; error?: string }> {
  const { supabase, profile, user, cfg } = await whatsappConfig();

  let phones: string[];
  try {
    phones = await evolution.getGroupParticipants(cfg, groupJid);
  } catch (e) {
    return {
      error: e instanceof ChannelError ? e.message : "Falha ao obter membros.",
    };
  }
  if (phones.length === 0) {
    return { error: "Este grupo não tem membros acessíveis." };
  }

  const limit = profile.organization?.leads_limit ?? Infinity;
  const { count: current } = await supabase
    .from("leads")
    .select("id", { count: "exact", head: true })
    .is("deleted_at", null);
  const remaining = Math.max(0, limit - (current ?? 0));
  if (remaining <= 0) {
    return { error: `Limite de leads atingido (${limit}).` };
  }

  // Dedupe against existing leads by normalized phone.
  const { data: existing } = await supabase
    .from("leads")
    .select("phone")
    .not("phone", "is", null);
  const existingDigits = new Set(
    (existing ?? []).map((l) => (l.phone ?? "").replace(/\D/g, "")),
  );

  const fresh = [...new Set(phones)]
    .filter((d) => !existingDigits.has(d))
    .slice(0, remaining);

  if (fresh.length === 0) {
    return { error: "Todos os membros já existem como leads." };
  }

  const rows = fresh.map((d) => ({
    phone: d,
    niche: subject,
    status: "novo" as const,
    source: "imported" as const,
    organization_id: profile.organization_id!,
    created_by: user.id,
  }));

  const { data, error, count } = await supabase
    .from("leads")
    .insert(rows, { count: "exact" })
    .select("id");
  if (error) return { error: error.message };
  await recordExternalRefs(
    profile.organization_id!,
    "lead",
    (data ?? []).map((r) => r.id),
  );

  revalidatePath("/leads");
  return { ok: true, count: count ?? fresh.length };
}
