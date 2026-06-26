import { ChannelError, type WhatsappConfig } from "./config";

/**
 * Minimal WAHA (WhatsApp HTTP API) client. Targets the WAHA Core REST API.
 * Docs: https://waha.devlike.pro
 */

function authHeaders(c: WhatsappConfig): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (c.apiKey) h["X-Api-Key"] = c.apiKey;
  return h;
}

function toChatId(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return `${digits}@c.us`;
}

function assertConfigured(c: WhatsappConfig) {
  if (!c.url) {
    throw new ChannelError("O WhatsApp (WAHA) não está configurado — falta o URL.");
  }
}

/** Returns the WAHA session status (WORKING, SCAN_QR_CODE, STARTING, STOPPED…). */
export async function getSessionStatus(c: WhatsappConfig): Promise<string> {
  assertConfigured(c);
  let res: Response;
  try {
    res = await fetch(
      `${c.url}/api/sessions/${encodeURIComponent(c.session)}`,
      { headers: authHeaders(c), cache: "no-store" },
    );
  } catch {
    throw new ChannelError("Não foi possível contactar o servidor WAHA.");
  }
  if (res.status === 404) return "STOPPED";
  if (!res.ok) throw new ChannelError(`WAHA respondeu com erro (${res.status}).`);
  const data = await res.json();
  return (data?.status as string) ?? "UNKNOWN";
}

/** Creates/starts the WAHA session. */
export async function startSession(c: WhatsappConfig): Promise<void> {
  assertConfigured(c);
  const res = await fetch(`${c.url}/api/sessions/`, {
    method: "POST",
    headers: authHeaders(c),
    body: JSON.stringify({ name: c.session, start: true }),
  });
  // 200/201 created; 422 = already exists -> ensure it is started
  if (!res.ok && res.status !== 422) {
    await fetch(
      `${c.url}/api/sessions/${encodeURIComponent(c.session)}/start`,
      { method: "POST", headers: authHeaders(c) },
    ).catch(() => {});
  }
}

/** Returns the QR code as a data URL (to scan with WhatsApp). */
export async function getQrCode(c: WhatsappConfig): Promise<string> {
  assertConfigured(c);
  const headers: Record<string, string> = {};
  if (c.apiKey) headers["X-Api-Key"] = c.apiKey;
  const res = await fetch(
    `${c.url}/api/${encodeURIComponent(c.session)}/auth/qr?format=image`,
    { headers, cache: "no-store" },
  );
  if (!res.ok) {
    throw new ChannelError("Não foi possível obter o QR code do WhatsApp.");
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  return `data:image/png;base64,${buffer.toString("base64")}`;
}

/** Sends a text message to a phone number via WAHA. */
export async function sendText(
  c: WhatsappConfig,
  phone: string,
  text: string,
): Promise<void> {
  assertConfigured(c);
  const res = await fetch(`${c.url}/api/sendText`, {
    method: "POST",
    headers: authHeaders(c),
    body: JSON.stringify({
      session: c.session,
      chatId: toChatId(phone),
      text,
    }),
  });
  if (!res.ok) {
    throw new ChannelError(`Falha ao enviar mensagem de WhatsApp (${res.status}).`);
  }
}
