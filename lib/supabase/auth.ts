import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/types";

export type Organization = Tables<"organization">;
export type Profile = Tables<"profiles"> & {
  organization: Organization | null;
};

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

  const { data: profile } = await supabase
    .from("profiles")
    .select("*, organization(*)")
    .eq("id", user.id)
    .single<Profile>();

  if (!profile) {
    // Auth user exists but no profile (edge case) — sign out to recover.
    redirect("/login");
  }

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
