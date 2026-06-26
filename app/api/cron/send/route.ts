import { NextResponse, type NextRequest } from "next/server";

import { processQueue } from "@/lib/campaigns/engine";
import { createAdminClient } from "@/lib/supabase/server";

/**
 * Cron endpoint that sends due queued messages.
 * Protected by CRON_SECRET. Uses the Supabase service role key (bypasses RLS)
 * since it runs without a user session.
 *
 * Trigger it on a schedule via one of:
 *  - Vercel Cron (add a `crons` entry in vercel.json; sub-daily schedules
 *    require a Vercel Pro plan — Hobby allows once/day), or
 *  - An external scheduler (e.g. cron-job.org) calling
 *    GET /api/cron/send?secret=<CRON_SECRET> every few minutes.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    const provided =
      auth?.replace(/^Bearer\s+/i, "") ??
      request.nextUrl.searchParams.get("secret") ??
      "";
    if (provided !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY não está configurada." },
      { status: 500 },
    );
  }

  try {
    const supabase = createAdminClient();
    const result = await processQueue(supabase, { limit: 50 });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro no processamento." },
      { status: 500 },
    );
  }
}
