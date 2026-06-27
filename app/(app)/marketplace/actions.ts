"use server";

import { revalidatePath } from "next/cache";

import { requireProfile } from "@/lib/supabase/auth";
import { resolvePlacesConfig } from "@/lib/integrations/config";
import { searchPlaces, PlacesError, type PlaceLead } from "@/lib/integrations/places";
import { searchOsm, OsmError } from "@/lib/integrations/osm";

export async function searchMarketplace(params: {
  source: "osm" | "google";
  category: string;
  niche: string | null;
  keywords: string;
  city: string;
  country: string;
  regionCode: string;
  minRating: number;
  website: "any" | "with" | "without";
  max: number;
}): Promise<{ results?: PlaceLead[]; error?: string }> {
  const { supabase } = await requireProfile();

  // Free source: OpenStreetMap (no key / billing required).
  if (params.source === "osm") {
    try {
      const results = await searchOsm({
        category: params.category,
        keywords: params.keywords,
        city: params.city,
        country: params.country,
        website: params.website,
        max: params.max,
        niche: params.niche,
      });
      return { results };
    } catch (e) {
      return {
        error: e instanceof OsmError ? e.message : "Falha na pesquisa de leads.",
      };
    }
  }

  // Google Places (requires API key).
  const { data } = await supabase
    .from("integrations")
    .select("config")
    .eq("type", "places")
    .maybeSingle();
  const cfg = resolvePlacesConfig(
    (data?.config ?? null) as Record<string, unknown> | null,
  );
  try {
    const results = await searchPlaces({
      config: cfg,
      niche: params.niche,
      keywords: params.keywords,
      city: params.city,
      country: params.country,
      regionCode: params.regionCode,
      minRating: params.minRating,
      website: params.website,
      max: params.max,
    });
    return { results };
  } catch (e) {
    return {
      error: e instanceof PlacesError ? e.message : "Falha na pesquisa de leads.",
    };
  }
}

export async function importMarketplaceLeads(
  leads: PlaceLead[],
): Promise<{ ok?: boolean; count?: number; error?: string }> {
  const { supabase, profile, user } = await requireProfile();

  const limit = profile.organization?.leads_limit ?? Infinity;
  const { count: current } = await supabase
    .from("leads")
    .select("id", { count: "exact", head: true })
    .is("deleted_at", null);
  const remaining = Math.max(0, limit - (current ?? 0));
  if (remaining <= 0) {
    return { error: `Limite de leads atingido (${limit}).` };
  }

  const slice = leads.slice(0, remaining);
  const rows = slice.map((l) => ({
    company: l.company,
    phone: l.phone,
    city: l.city,
    country: l.country,
    niche: l.niche,
    rating: l.rating,
    has_website: l.has_website,
    status: "novo" as const,
    source: "marketplace" as const,
    organization_id: profile.organization_id!,
    created_by: user.id,
  }));

  const { error, count } = await supabase
    .from("leads")
    .insert(rows, { count: "exact" });
  if (error) return { error: error.message };

  revalidatePath("/leads");
  const skipped = leads.length - slice.length;
  return {
    ok: true,
    count: count ?? slice.length,
    error:
      skipped > 0
        ? `Importados ${slice.length}; ${skipped} ignorados por atingir o limite (${limit}).`
        : undefined,
  };
}
