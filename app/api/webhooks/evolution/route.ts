import { NextResponse, type NextRequest } from "next/server";

import { createAdminClient } from "@/lib/supabase/server";

/**
 * Receives Evolution API webhook events. We act on incoming WhatsApp messages
 * (messages.upsert, fromMe = false): match the sender to a lead, mark the lead
 * as "respondeu" and the last sent message as "replied".
 *
 * Configure the Evolution webhook URL to:
 *   https://<app>/api/webhooks/evolution?secret=<CRON_SECRET>
 */
export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const provided =
      request.nextUrl.searchParams.get("secret") ??
      request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
      "";
    if (provided !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    // Acknowledge to avoid retry storms; nothing we can do without service role.
    return NextResponse.json({ ok: false, reason: "service role missing" });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: true });
  }

  const event = (payload as { event?: string })?.event ?? "";
  if (!/messages.?upsert/i.test(event)) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const raw = (payload as { data?: unknown }).data;
  const items = Array.isArray(raw) ? raw : [raw];
  const supabase = createAdminClient();

  // Load candidate leads once (single-tenant scale).
  const { data: leads } = await supabase
    .from("leads")
    .select("id, phone, status")
    .not("phone", "is", null)
    .limit(5000);

  const normalized = (leads ?? []).map((l) => ({
    ...l,
    digits: (l.phone ?? "").replace(/\D/g, ""),
  }));

  function findLead(jidDigits: string) {
    const last9 = jidDigits.slice(-9);
    return normalized.find(
      (l) => l.digits.endsWith(last9) || jidDigits.endsWith(l.digits.slice(-9)),
    );
  }

  let matched = 0;
  const nowIso = new Date().toISOString();

  for (const item of items) {
    const m = item as {
      key?: { remoteJid?: string; fromMe?: boolean };
    } | null;
    const key = m?.key;
    if (!key || key.fromMe) continue;
    const jid = key.remoteJid ?? "";
    if (!jid || jid.endsWith("@g.us")) continue; // ignore groups
    const digits = jid.split("@")[0].replace(/\D/g, "");
    if (!digits) continue;

    const lead = findLead(digits);
    if (!lead) continue;
    matched++;

    if (lead.status !== "respondeu") {
      await supabase
        .from("leads")
        .update({ status: "respondeu" })
        .eq("id", lead.id);
    }
    await supabase
      .from("messages")
      .update({ status: "replied", replied_at: nowIso })
      .eq("lead_id", lead.id)
      .eq("channel", "whatsapp")
      .eq("status", "sent");
  }

  return NextResponse.json({ ok: true, matched });
}
