import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/types";

type DB = SupabaseClient<Database>;

type Item = {
  type: string;
  category: string | null;
  name: string;
  description: string | null;
  url: string | null;
  price: string | null;
};

// Compact line for products (category comes from the group header).
function fmtProduct(i: Item): string {
  const price = i.price ? ` (${i.price})` : "";
  const url = i.url ? ` ${i.url}` : "";
  return `- ${i.name}${price}${url}`;
}

// Richer line for formações/novidades (fewer items, worth a short description).
function fmtDetailed(i: Item): string {
  const cat = i.category ? `[${i.category}] ` : "";
  const desc = i.description
    ? ` — ${i.description.length > 160 ? i.description.slice(0, 160).trimEnd() + "…" : i.description}`
    : "";
  const price = i.price ? ` (${i.price})` : "";
  const url = i.url ? ` ${i.url}` : "";
  return `- ${cat}${i.name}${desc}${price}${url}`;
}

export type CatalogOptions = {
  /** Max product lines listed (across all categories). */
  maxProducts?: number;
  /** Max product lines per category before truncating with a "+N" note. */
  perCategory?: number;
};

/**
 * Builds a catalog context string (active products / trainings / news) to feed
 * the AI for recommendations. Products are grouped by category so the agent
 * sees the full breadth of the store even when the list is capped; all
 * formações and novidades are included (they are fewer and high-value).
 * Returns an empty string when there is no catalog.
 */
export async function getCatalogContext(
  supabase: DB,
  orgId?: string,
  opts: CatalogOptions = {},
): Promise<string> {
  const maxProducts = opts.maxProducts ?? 300;
  const perCategory = opts.perCategory ?? 20;

  let query = supabase
    .from("catalog_items")
    .select("type, category, name, description, url, price")
    .eq("active", true)
    .order("category", { ascending: true })
    .order("name", { ascending: true });
  if (orgId) query = query.eq("organization_id", orgId);

  const { data } = await query;
  if (!data || data.length === 0) return "";

  const products = data.filter((i) => i.type === "product");
  const trainings = data.filter((i) => i.type === "training");
  const news = data.filter((i) => i.type === "news");

  const sections: string[] = [];

  if (products.length) {
    const byCat = new Map<string, Item[]>();
    for (const p of products) {
      const cat = p.category?.trim() || "Outros";
      const list = byCat.get(cat);
      if (list) list.push(p);
      else byCat.set(cat, [p]);
    }

    const lines: string[] = [];
    let listed = 0;
    for (const [cat, items] of byCat) {
      if (listed >= maxProducts) break;
      lines.push(`# ${cat} (${items.length})`);
      const shown = items.slice(0, perCategory);
      for (const it of shown) {
        if (listed >= maxProducts) break;
        lines.push(fmtProduct(it));
        listed++;
      }
      if (items.length > shown.length) {
        lines.push(`  …+${items.length - shown.length} outros em "${cat}"`);
      }
    }

    const header =
      listed < products.length
        ? `PRODUTOS (${products.length} no total; ${listed} listados, agrupados por categoria — pede mais se precisares):`
        : `PRODUTOS (${products.length}), agrupados por categoria:`;
    sections.push(header + "\n" + lines.join("\n"));
  }

  if (trainings.length)
    sections.push("FORMAÇÕES:\n" + trainings.map(fmtDetailed).join("\n"));
  if (news.length) sections.push("NOVIDADES:\n" + news.map(fmtDetailed).join("\n"));

  return sections.join("\n\n");
}
