"use server";

import { revalidatePath } from "next/cache";

import { requireProfile } from "@/lib/supabase/auth";
import type { TablesInsert } from "@/lib/supabase/types";

export type CatalogResult = { ok?: boolean; error?: string; count?: number };

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
    organization_id: profile.organization_id!,
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

export type ImportRow = {
  type?: string;
  category?: string;
  name?: string;
  description?: string;
  url?: string;
  price?: string;
  tags?: string[];
};

function normType(t?: string): "product" | "training" | "news" {
  const x = (t ?? "").toLowerCase();
  if (x.startsWith("form") || x === "training") return "training";
  if (x.startsWith("nov") || x === "news") return "news";
  return "product";
}

export async function importCatalogItems(
  rows: ImportRow[],
): Promise<CatalogResult> {
  const { supabase, profile } = await requireProfile();

  const valid: TablesInsert<"catalog_items">[] = rows
    .filter((r) => (r.name ?? "").trim())
    .map((r) => ({
      organization_id: profile.organization_id!,
      type: normType(r.type),
      name: r.name!.trim(),
      category: r.category?.trim() || null,
      description: r.description?.trim() || null,
      url: r.url?.trim() || null,
      price: r.price?.trim() || null,
      tags: Array.isArray(r.tags) ? r.tags : [],
    }));

  if (valid.length === 0) {
    return { error: "Nenhuma linha válida (falta o nome)." };
  }

  const { error, count } = await supabase
    .from("catalog_items")
    .insert(valid, { count: "exact" });
  if (error) return { error: error.message };
  revalidatePath("/catalogo");
  return { ok: true, count: count ?? valid.length };
}

export async function deleteCatalogItem(id: string): Promise<CatalogResult> {
  const { supabase } = await requireProfile();
  const { error } = await supabase.from("catalog_items").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/catalogo");
  return { ok: true };
}

/**
 * Espelha os produtos vendáveis do ERP (tabela `products`) na base de
 * conhecimento da IA. Itens com `source_product_id` são geridos por esta sync —
 * não os edites à mão. Devolve o total de produtos no catálogo.
 */
export async function syncProductsToCatalog(): Promise<CatalogResult> {
  const { supabase } = await requireProfile();
  const { data, error } = await supabase.rpc("sync_products_to_catalog");
  if (error) return { error: error.message };
  revalidatePath("/catalogo");
  return { ok: true, count: data ?? 0 };
}
