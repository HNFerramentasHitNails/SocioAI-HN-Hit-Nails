import { ChannelError, type WhatsappConfig } from "./config";

/**
 * Minimal Evolution API (v2) client for WhatsApp.
 * Docs: https://doc.evolution-api.com
 *
 * Config: base URL, global API key (sent as the `apikey` header) and the
 * instance name. Statuses are normalised to the same labels used by the UI:
 * WORKING | SCAN_QR_CODE | STARTING | STOPPED.
 */

function authHeaders(c: WhatsappConfig): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (c.apiKey) h["apikey"] = c.apiKey;
  return h;
}

function assertConfigured(c: WhatsappConfig) {
  if (!c.url) {
    throw new ChannelError(
      "O WhatsApp (Evolution API) não está configurado — falta o URL.",
    );
  }
}

function normalizeState(state: string | undefined): string {
  switch (state) {
    case "open":
      return "WORKING";
    case "connecting":
      return "SCAN_QR_CODE";
    case "close":
      return "STOPPED";
    default:
      return state ? state.toUpperCase() : "UNKNOWN";
  }
}

/** Returns the connection status of the instance. */
export async function getSessionStatus(c: WhatsappConfig): Promise<string> {
  assertConfigured(c);
  let res: Response;
  try {
    res = await fetch(
      `${c.url}/instance/connectionState/${encodeURIComponent(c.instance)}`,
      { headers: authHeaders(c), cache: "no-store" },
    );
  } catch {
    throw new ChannelError("Não foi possível contactar o servidor Evolution API.");
  }
  if (res.status === 404) return "STOPPED";
  if (!res.ok) {
    throw new ChannelError(`Evolution API respondeu com erro (${res.status}).`);
  }
  const data = await res.json();
  return normalizeState(data?.instance?.state ?? data?.state);
}

/** Creates the instance (idempotent) so it can be connected/QR-scanned. */
export async function startSession(c: WhatsappConfig): Promise<void> {
  assertConfigured(c);
  const res = await fetch(`${c.url}/instance/create`, {
    method: "POST",
    headers: authHeaders(c),
    body: JSON.stringify({
      instanceName: c.instance,
      qrcode: true,
      integration: "WHATSAPP-BAILEYS",
    }),
  });
  // 200/201 created; 403/409 = already exists -> connect it instead.
  if (!res.ok && res.status !== 403 && res.status !== 409) {
    await fetch(
      `${c.url}/instance/connect/${encodeURIComponent(c.instance)}`,
      { headers: authHeaders(c) },
    ).catch(() => {});
  }
}

/** Returns the QR code as a data URL to link the WhatsApp device. */
export async function getQrCode(c: WhatsappConfig): Promise<string> {
  assertConfigured(c);
  const res = await fetch(
    `${c.url}/instance/connect/${encodeURIComponent(c.instance)}`,
    { headers: authHeaders(c), cache: "no-store" },
  );
  if (!res.ok) {
    throw new ChannelError("Não foi possível obter o QR code do WhatsApp.");
  }
  const data = await res.json();
  const base64: string | undefined = data?.base64 ?? data?.qrcode?.base64;
  if (!base64) {
    throw new ChannelError("O QR code ainda não está disponível. Tenta novamente.");
  }
  return base64.startsWith("data:") ? base64 : `data:image/png;base64,${base64}`;
}

/** Sends a text message to a phone number via Evolution API. */
export async function sendText(
  c: WhatsappConfig,
  phone: string,
  text: string,
): Promise<void> {
  assertConfigured(c);
  const number = phone.replace(/\D/g, "");
  const res = await fetch(
    `${c.url}/message/sendText/${encodeURIComponent(c.instance)}`,
    {
      method: "POST",
      headers: authHeaders(c),
      body: JSON.stringify({ number, text }),
    },
  );
  if (!res.ok) {
    throw new ChannelError(`Falha ao enviar mensagem de WhatsApp (${res.status}).`);
  }
}
