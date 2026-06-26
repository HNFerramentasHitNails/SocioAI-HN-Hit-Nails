import type { Tables } from "@/lib/supabase/types";

type Lead = Partial<Tables<"leads">>;

/** Replaces {{merge}} variables in a message body with lead data. */
export function renderMessage(body: string, lead: Lead): string {
  return body.replace(/\{\{\s*(\w+)\s*\}\}/g, (_match, key: string) => {
    switch (key) {
      case "name":
      case "full_name":
        return lead.name ?? "";
      case "company":
        return lead.company ?? "";
      case "city":
        return lead.city ?? "";
      case "email":
        return lead.email ?? "";
      case "phone":
        return lead.phone ?? "";
      case "niche":
        return lead.niche ?? "";
      default:
        return "";
    }
  });
}
