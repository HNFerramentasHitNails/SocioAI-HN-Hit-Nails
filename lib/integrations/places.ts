import type { PlacesConfig } from "./config";

export class PlacesError extends Error {}

export type PlaceLead = {
  company: string;
  phone: string | null;
  website: string | null;
  city: string | null;
  country: string | null;
  rating: number | null;
  has_website: boolean;
  niche: string | null;
};

type AddressComponent = {
  longText?: string;
  shortText?: string;
  types?: string[];
};

type Place = {
  displayName?: { text?: string };
  formattedAddress?: string;
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  websiteUri?: string;
  rating?: number;
  addressComponents?: AddressComponent[];
};

const FIELD_MASK = [
  "places.displayName",
  "places.formattedAddress",
  "places.nationalPhoneNumber",
  "places.internationalPhoneNumber",
  "places.websiteUri",
  "places.rating",
  "places.addressComponents",
  "nextPageToken",
].join(",");

function pick(components: AddressComponent[] | undefined, type: string) {
  return components?.find((c) => c.types?.includes(type));
}

export async function searchPlaces(opts: {
  config: PlacesConfig;
  niche: string | null;
  keywords: string;
  city: string;
  country: string;
  regionCode: string;
  minRating: number;
  website: "any" | "with" | "without";
  max: number;
}): Promise<PlaceLead[]> {
  if (!opts.config.apiKey) {
    throw new PlacesError(
      "A Google Places API não está configurada (falta a API Key).",
    );
  }
  const textQuery = [opts.keywords, opts.city].filter(Boolean).join(" em ");
  if (!opts.keywords.trim() || !opts.city.trim()) {
    throw new PlacesError("Indica o nicho/categoria e a cidade.");
  }

  const results: PlaceLead[] = [];
  let pageToken: string | undefined;
  let pages = 0;
  const maxPages = 5;

  while (results.length < opts.max && pages < maxPages) {
    pages++;
    let res: Response;
    try {
      res = await fetch("https://places.googleapis.com/v1/places:searchText", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": opts.config.apiKey,
          "X-Goog-FieldMask": FIELD_MASK,
        },
        body: JSON.stringify({
          textQuery,
          languageCode: "pt",
          regionCode: opts.regionCode || "PT",
          pageSize: 20,
          ...(pageToken ? { pageToken } : {}),
        }),
      });
    } catch {
      throw new PlacesError("Não foi possível contactar a Google Places API.");
    }

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new PlacesError(
        `Google Places respondeu com erro (${res.status}). ${body.slice(0, 160)}`.trim(),
      );
    }

    const data = (await res.json()) as {
      places?: Place[];
      nextPageToken?: string;
    };

    for (const p of data.places ?? []) {
      const rating = typeof p.rating === "number" ? p.rating : null;
      const website = p.websiteUri ?? null;
      const hasWebsite = Boolean(website);

      if (opts.minRating > 0 && (rating ?? 0) < opts.minRating) continue;
      if (opts.website === "with" && !hasWebsite) continue;
      if (opts.website === "without" && hasWebsite) continue;

      results.push({
        company: p.displayName?.text ?? "—",
        phone: p.internationalPhoneNumber ?? p.nationalPhoneNumber ?? null,
        website,
        city:
          pick(p.addressComponents, "locality")?.longText ||
          opts.city ||
          null,
        country:
          pick(p.addressComponents, "country")?.longText ||
          opts.country ||
          null,
        rating,
        has_website: hasWebsite,
        niche: opts.niche,
      });
      if (results.length >= opts.max) break;
    }

    pageToken = data.nextPageToken;
    if (!pageToken) break;
  }

  return results;
}
