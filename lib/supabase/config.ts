/**
 * Public Supabase configuration.
 *
 * The project URL and the *publishable* (anon) key are public by design — they
 * are shipped in the browser bundle and access is governed by RLS. We provide
 * them as fallback defaults so production builds work even before Vercel env
 * vars are configured; set NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY
 * to override (e.g. when rotating keys).
 *
 * NEVER put the service_role / secret key here — that stays server-only via
 * SUPABASE_SERVICE_ROLE_KEY.
 */
export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  "https://yvlzskbnewmomnxnxyix.supabase.co";

export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "sb_publishable_uHXSBqtxkinxF058lYUv0Q_90V7zc1_";
