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

function fmt(i: Item): string {
  const cat = i.category ? `[${i.category}] ` : "";
  const desc = i.description ? ` — ${i.description}` : "";
  const price = i.price ? ` (${i.price})` : "";
  const url = i.url ? ` ${i.url}` : "";
  return `- ${cat}${i.name}${desc}${price}${url}`;
}

/**
 * Builds a compact catalog context string (active products / trainings / news)
 * to feed the AI for recommendations. Empty string if there is no catalog.
 */
export async function getCatalogContext(
  supabase: DB,
  orgId?: string,
  limit = 80,
): Promise<string> {
  let query = supabase
    .from("catalog_items")
    .select("type, category, name, description, url, price")
    .eq("active", true)
    .order("type", { ascending: true })
    .limit(limit);
  if (orgId) query = query.eq("org_id", orgId);

  const { data } = await query;
  if (!data || data.length === 0) return "";

  const products = data.filter((i) => i.type === "product");
  const trainings = data.filter((i) => i.type === "training");
  const news = data.filter((i) => i.type === "news");

  const sections: string[] = [];
  if (products.length) sections.push("PRODUTOS:\n" + products.map(fmt).join("\n"));
  if (trainings.length)
    sections.push("FORMAÇÕES:\n" + trainings.map(fmt).join("\n"));
  if (news.length) sections.push("NOVIDADES:\n" + news.map(fmt).join("\n"));
  return sections.join("\n\n");
}
