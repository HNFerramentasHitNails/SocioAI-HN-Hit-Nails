import { NextResponse, type NextRequest } from "next/server";

import { processQueue } from "@/lib/campaigns/engine";
import { createAdminClient } from "@/lib/supabase/server";

/**
 * Cron endpoint that sends due queued messages. Scheduled via vercel.json.
 * Protected by CRON_SECRET (Vercel Cron sends it as a Bearer token). Uses the
 * Supabase service role key (bypasses RLS) since it runs without a user session.
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
