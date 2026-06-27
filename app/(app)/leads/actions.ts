"use server";

import { revalidatePath } from "next/cache";

import { requireProfile } from "@/lib/supabase/auth";
import type { LeadStatus } from "@/lib/config";

export type ActionResult = { error?: string; ok?: boolean; count?: number };

type LeadInput = {
  name?: string;
  company?: string;
  email?: string;
  phone?: string;
  niche?: string;
  city?: string;
  state?: string;
  country?: string;
  status?: LeadStatus;
  notes?: string;
};

function clean(value: FormDataEntryValue | null): string | null {
  const s = String(value ?? "").trim();
  return s.length ? s : null;
}

function parseLeadForm(formData: FormData): LeadInput {
  return {
    name: clean(formData.get("name")) ?? undefined,
    company: clean(formData.get("company")) ?? undefined,
    email: clean(formData.get("email")) ?? undefined,
    phone: clean(formData.get("phone")) ?? undefined,
    niche: clean(formData.get("niche")) ?? undefined,
    city: clean(formData.get("city")) ?? undefined,
    state: clean(formData.get("state")) ?? undefined,
    country: clean(formData.get("country")) ?? undefined,
    status: (clean(formData.get("status")) as LeadStatus) ?? undefined,
    notes: clean(formData.get("notes")) ?? undefined,
  };
}

async function activeLeadCount(
  supabase: Awaited<ReturnType<typeof requireProfile>>["supabase"],
): Promise<number> {
  const { count } = await supabase
    .from("leads")
    .select("id", { count: "exact", head: true })
    .is("deleted_at", null);
  return count ?? 0;
}

export async function createLead(formData: FormData): Promise<ActionResult> {
  const { supabase, profile, user } = await requireProfile();
  const input = parseLeadForm(formData);

  if (!input.name && !input.company && !input.email && !input.phone) {
    return { error: "Preenche pelo menos o nome, empresa, email ou telefone." };
  }

  const limit = profile.organization?.leads_limit ?? Infinity;
  if ((await activeLeadCount(supabase)) >= limit) {
    return {
      error: `Limite de leads atingido (${limit}). Remove leads ou aumenta o limite.`,
    };
  }

  const { error } = await supabase.from("leads").insert({
    ...input,
    status: input.status ?? "novo",
    source: "manual",
    organization_id: profile.organization_id!,
    created_by: user.id,
  });

  if (error) return { error: error.message };
  revalidatePath("/leads");
  return { ok: true };
}

export async function updateLead(
  id: string,
  formData: FormData,
): Promise<ActionResult> {
  const { supabase } = await requireProfile();
  const input = parseLeadForm(formData);

  const { error } = await supabase.from("leads").update(input).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/leads");
  return { ok: true };
}

export async function setLeadStatus(
  id: string,
  status: LeadStatus,
): Promise<ActionResult> {
  const { supabase } = await requireProfile();
  const { error } = await supabase.from("leads").update({ status }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/leads");
  return { ok: true };
}

/**
 * Promove o lead a prospect no pipeline do ERP (`promote_lead_to_prospect`).
 * Deduplica por telefone/email: se já existe cliente/prospect, liga em vez de
 * criar. Marca o lead como contactado e grava `prospect_id`.
 */
export async function promoteLead(id: string): Promise<ActionResult> {
  const { supabase } = await requireProfile();
  const { error } = await supabase.rpc("promote_lead_to_prospect", {
    _lead_id: id,
  });
  if (error) return { error: error.message };
  revalidatePath("/leads");
  return { ok: true };
}

export async function softDeleteLead(id: string): Promise<ActionResult> {
  const { supabase } = await requireProfile();
  const { error } = await supabase
    .from("leads")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/leads");
  return { ok: true };
}

export async function restoreLead(id: string): Promise<ActionResult> {
  const { supabase } = await requireProfile();
  const { error } = await supabase
    .from("leads")
    .update({ deleted_at: null })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/leads");
  return { ok: true };
}

export async function permanentDeleteLead(id: string): Promise<ActionResult> {
  const { supabase } = await requireProfile();
  const { error } = await supabase.from("leads").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/leads");
  return { ok: true };
}

export async function emptyTrash(): Promise<ActionResult> {
  const { supabase, profile } = await requireProfile();
  const { error } = await supabase
    .from("leads")
    .delete()
    .eq("organization_id", profile.organization_id!)
    .not("deleted_at", "is", null);
  if (error) return { error: error.message };
  revalidatePath("/leads");
  return { ok: true };
}

/** Bulk insert of leads parsed client-side from CSV. */
export async function importLeads(rows: LeadInput[]): Promise<ActionResult> {
  const { supabase, profile, user } = await requireProfile();

  const valid = rows
    .map((r) => ({
      name: r.name?.trim() || null,
      company: r.company?.trim() || null,
      email: r.email?.trim() || null,
      phone: r.phone?.trim() || null,
      niche: r.niche?.trim() || null,
      city: r.city?.trim() || null,
      state: r.state?.trim() || null,
      country: r.country?.trim() || null,
    }))
    .filter((r) => r.name || r.company || r.email || r.phone)
    .map((r) => ({
      ...r,
      status: "novo" as const,
      source: "imported" as const,
      organization_id: profile.organization_id!,
      created_by: user.id,
    }));

  if (valid.length === 0) {
    return { error: "Nenhuma linha válida encontrada no ficheiro." };
  }

  // Enforce the org lead limit (insert only up to the remaining capacity).
  const limit = profile.organization?.leads_limit ?? Infinity;
  const current = await activeLeadCount(supabase);
  const remaining = Math.max(0, limit - current);
  if (remaining <= 0) {
    return { error: `Limite de leads atingido (${limit}).` };
  }
  const toInsert = valid.slice(0, remaining);
  const skipped = valid.length - toInsert.length;

  const { error, count } = await supabase
    .from("leads")
    .insert(toInsert, { count: "exact" });

  if (error) return { error: error.message };
  revalidatePath("/leads");
  return {
    ok: true,
    count: count ?? toInsert.length,
    error:
      skipped > 0
        ? `Importados ${toInsert.length}; ${skipped} ignorados por atingir o limite de ${limit}.`
        : undefined,
  };
}
