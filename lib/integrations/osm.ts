import type { PlaceLead } from "./places";

export class OsmError extends Error {}

/** Category -> OpenStreetMap tags (key=value). */
const OSM_TAGS: Record<string, string[]> = {
  beauty: ["shop=beauty"],
  nails: ["shop=beauty"],
  hair: ["shop=hairdresser"],
  spa: ["leisure=spa", "shop=beauty"],
  restaurant: ["amenity=restaurant"],
  cafe: ["amenity=cafe", "shop=pastry"],
  clinic: ["amenity=clinic", "amenity=doctors"],
  gym: ["leisure=fitness_centre"],
  realestate: ["office=estate_agent"],
  legal: ["office=lawyer"],
  accounting: ["office=accountant"],
};

const UA = "LeadsPro-HNHitNails/1.0 (geral@hnhitnails.com)";

type OverpassElement = {
  tags?: Record<string, string>;
};

function escapeRegex(s: string) {
  return s.replace(/[\\"]/g, "").replace(/[^\p{L}\p{N} ]/gu, " ").trim();
}

/** Searches local businesses via the free OpenStreetMap Overpass API. */
export async function searchOsm(opts: {
  category: string;
  keywords: string;
  city: string;
  country: string;
  website: "any" | "with" | "without";
  max: number;
  niche: string | null;
}): Promise<PlaceLead[]> {
  if (!opts.city.trim()) throw new OsmError("Indica a cidade.");

  // 1) Geocode the city to a bounding box (Nominatim).
  let geo: Response;
  try {
    geo = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(
        `${opts.city}, ${opts.country}`,
      )}`,
      { headers: { "User-Agent": UA }, cache: "no-store" },
    );
  } catch {
    throw new OsmError("Não foi possível geocodificar a cidade (OpenStreetMap).");
  }
  if (!geo.ok) throw new OsmError("Falha ao localizar a cidade.");
  const places = (await geo.json()) as { boundingbox?: string[] }[];
  if (!places.length || !places[0].boundingbox) {
    throw new OsmError("Cidade não encontrada no OpenStreetMap.");
  }
  // Nominatim boundingbox = [south, north, west, east]
  const [south, north, west, east] = places[0].boundingbox;
  const bbox = `${south},${west},${north},${east}`;

  // 2) Build the Overpass query.
  const tags = OSM_TAGS[opts.category];
  let filters: string;
  if (tags && opts.category !== "other") {
    filters = tags
      .map((t) => {
        const [k, v] = t.split("=");
        return `nwr["${k}"="${v}"](${bbox});`;
      })
      .join("\n");
  } else {
    const kw = escapeRegex(opts.keywords);
    if (!kw) throw new OsmError("Indica uma palavra-chave.");
    filters = `nwr["name"~"${kw}",i](${bbox});`;
  }
  const query = `[out:json][timeout:25];(${filters});out center tags ${Math.min(
    opts.max * 4,
    400,
  )};`;

  // 3) Query Overpass.
  let res: Response;
  try {
    res = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": UA,
      },
      body: `data=${encodeURIComponent(query)}`,
      cache: "no-store",
    });
  } catch {
    throw new OsmError("Não foi possível contactar o OpenStreetMap (Overpass).");
  }
  if (!res.ok) {
    throw new OsmError(`OpenStreetMap respondeu com erro (${res.status}).`);
  }

  const data = (await res.json()) as { elements?: OverpassElement[] };
  const seen = new Set<string>();
  const results: PlaceLead[] = [];

  for (const el of data.elements ?? []) {
    const t = el.tags ?? {};
    const name = t.name?.trim();
    if (!name) continue;
    const dedupeKey = name.toLowerCase();
    if (seen.has(dedupeKey)) continue;

    const website = t.website || t["contact:website"] || null;
    const hasWebsite = Boolean(website);
    if (opts.website === "with" && !hasWebsite) continue;
    if (opts.website === "without" && hasWebsite) continue;

    seen.add(dedupeKey);
    results.push({
      company: name,
      phone: t.phone || t["contact:phone"] || t["contact:mobile"] || null,
      website,
      city: t["addr:city"] || opts.city || null,
      country: opts.country || null,
      rating: null,
      has_website: hasWebsite,
      niche: opts.niche,
    });
    if (results.length >= opts.max) break;
  }

  return results;
}
