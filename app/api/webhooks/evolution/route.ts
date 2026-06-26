import { NextResponse, type NextRequest } from "next/server";

import { createAdminClient } from "@/lib/supabase/server";

/**
 * Receives Evolution API webhook events:
 *  - messages.upsert (fromMe=false): incoming reply -> lead "respondeu" + message "replied"
 *  - messages.update: delivery/read receipt -> message "delivered"
 *
 * Configure the Evolution webhook URL to:
 *   https://<app>/api/webhooks/evolution?secret=<CRON_SECRET>
 * with events MESSAGES_UPSERT and MESSAGES_UPDATE.
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
    return NextResponse.json({ ok: false, reason: "service role missing" });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: true });
  }

  const event = (payload as { event?: string })?.event ?? "";
  const isUpsert = /messages.?upsert/i.test(event);
  const isUpdate = /messages.?update/i.test(event);
  if (!isUpsert && !isUpdate) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const raw = (payload as { data?: unknown }).data;
  const items = Array.isArray(raw) ? raw : [raw];
  const supabase = createAdminClient();
  const nowIso = new Date().toISOString();

  // --- Delivery / read receipts -> mark messages as delivered ---
  if (isUpdate) {
    const DELIVERED = ["DELIVERY_ACK", "DELIVERED", "READ", "PLAYED"];
    let updated = 0;
    for (const item of items) {
      const it = item as {
        keyId?: string;
        messageId?: string;
        status?: string;
        key?: { id?: string };
        update?: { status?: string };
      } | null;
      const id = it?.keyId ?? it?.key?.id ?? it?.messageId;
      const status = (it?.status ?? it?.update?.status ?? "").toString().toUpperCase();
      if (!id || !DELIVERED.includes(status)) continue;
      const { error } = await supabase
        .from("messages")
        .update({ status: "delivered" })
        .eq("provider_message_id", id)
        .eq("status", "sent");
      if (!error) updated++;
    }
    return NextResponse.json({ ok: true, updated });
  }

  // --- Incoming replies -> mark lead "respondeu" + message "replied" ---
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
  for (const item of items) {
    const m = item as { key?: { remoteJid?: string; fromMe?: boolean } } | null;
    const key = m?.key;
    if (!key || key.fromMe) continue;
    const jid = key.remoteJid ?? "";
    if (!jid || jid.endsWith("@g.us")) continue;
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
      .in("status", ["sent", "delivered"]);
  }

  return NextResponse.json({ ok: true, matched });
}
