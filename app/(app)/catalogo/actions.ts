"use server";

import { revalidatePath } from "next/cache";

import { requireProfile } from "@/lib/supabase/auth";

export type CatalogResult = { ok?: boolean; error?: string };

function clean(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return s.length ? s : null;
}

function parseTags(v: FormDataEntryValue | null): string[] {
  return String(v ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

function parseForm(formData: FormData) {
  return {
    type: (clean(formData.get("type")) ?? "product") as
      | "product"
      | "training"
      | "news",
    category: clean(formData.get("category")),
    name: clean(formData.get("name")),
    description: clean(formData.get("description")),
    url: clean(formData.get("url")),
    price: clean(formData.get("price")),
    tags: parseTags(formData.get("tags")),
  };
}

export async function createCatalogItem(
  formData: FormData,
): Promise<CatalogResult> {
  const { supabase, profile } = await requireProfile();
  const input = parseForm(formData);
  if (!input.name) return { error: "Dá um nome ao item." };

  const { error } = await supabase.from("catalog_items").insert({
    ...input,
    name: input.name,
    org_id: profile.org_id!,
  });
  if (error) return { error: error.message };
  revalidatePath("/catalogo");
  return { ok: true };
}

export async function updateCatalogItem(
  id: string,
  formData: FormData,
): Promise<CatalogResult> {
  const { supabase } = await requireProfile();
  const input = parseForm(formData);
  if (!input.name) return { error: "Dá um nome ao item." };

  const { error } = await supabase
    .from("catalog_items")
    .update({ ...input, name: input.name })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/catalogo");
  return { ok: true };
}

export async function toggleCatalogItem(
  id: string,
  active: boolean,
): Promise<CatalogResult> {
  const { supabase } = await requireProfile();
  const { error } = await supabase
    .from("catalog_items")
    .update({ active })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/catalogo");
  return { ok: true };
}

export async function deleteCatalogItem(id: string): Promise<CatalogResult> {
  const { supabase } = await requireProfile();
  const { error } = await supabase.from("catalog_items").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/catalogo");
  return { ok: true };
}
