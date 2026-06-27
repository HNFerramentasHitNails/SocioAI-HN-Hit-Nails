import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/types";

/**
 * Compatibility shim.
 *
 * Esta app (LeadsPro) foi escrita para um modelo single-tenant
 * (`profiles.org_id` + `profiles.role`). Agora corre sobre a BD do ERP, que usa
 * `organization_members` (org + papel) e `organizations`. Aqui sintetizamos a
 * forma antiga (`profile.organization_id`, `profile.role`, `profile.organization`)
 * a partir do modelo do ERP, para o resto da app não precisar de saber.
 *
 * Os campos específicos de outreach (limites + contexto IA) vivem em
 * `outreach_org_settings` e são fundidos no objeto `organization`.
 */

type OrganizationRow = Tables<"organizations">;
type OutreachSettings = Tables<"outreach_org_settings">;

/** Forma de "organização" que a app LeadsPro espera (ERP org + settings de outreach). */
export type Organization = OrganizationRow &
  Partial<Omit<OutreachSettings, "organization_id" | "updated_at">>;

export type AppRole = "admin" | "member";

export type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
  organization_id: string;
  role: AppRole;
  organization: Organization | null;
};

function mapRole(role: string | null | undefined): AppRole {
  return role === "owner" || role === "admin" ? "admin" : "member";
}

/**
 * Returns the authenticated user's profile (with organization) or redirects to
 * /login. Use at the top of every protected Server Component / layout.
 */
export async function requireProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id, role, organizations(*, outreach_org_settings(*))")
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!membership) {
    // Utilizador autenticado mas sem organização ativa — sem acesso.
    redirect("/login");
  }

  const { data: base } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .eq("id", user.id)
    .maybeSingle();

  const orgRow = membership.organizations as
    | (OrganizationRow & { outreach_org_settings: OutreachSettings[] | OutreachSettings | null })
    | null;
  const rawSettings = orgRow?.outreach_org_settings ?? null;
  const settings = (Array.isArray(rawSettings) ? rawSettings[0] : rawSettings) ?? null;

  const organization: Organization | null = orgRow
    ? {
        ...(orgRow as OrganizationRow),
        leads_limit: settings?.leads_limit,
        monthly_message_limit: settings?.monthly_message_limit,
        weekly_send_limit: settings?.weekly_send_limit,
        about_context: settings?.about_context ?? null,
      }
    : null;

  const profile: Profile = {
    id: user.id,
    full_name: base?.full_name ?? null,
    email: base?.email ?? user.email ?? null,
    organization_id: membership.organization_id,
    role: mapRole(membership.role),
    organization,
  };

  return { user, profile, supabase };
}

/** Like requireProfile but additionally enforces the admin role. */
export async function requireAdmin() {
  const ctx = await requireProfile();
  if (ctx.profile.role !== "admin") {
    redirect("/dashboard");
  }
  return ctx;
}
