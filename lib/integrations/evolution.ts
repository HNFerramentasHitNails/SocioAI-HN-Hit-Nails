import { ChannelError, type WhatsappConfig } from "./config";

/**
 * Minimal Evolution API (v2) client for WhatsApp.
 * Docs: https://doc.evolution-api.com
 *
 * Config: base URL, global API key (sent as the `apikey` header) and the
 * instance name. Statuses are normalised to the labels used by the UI:
 * WORKING | SCAN_QR_CODE | STARTING | STOPPED.
 */

function baseUrl(c: WhatsappConfig): string {
  return c.url.replace(/\/+$/, "");
}

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

function asDataUrl(b64: string | undefined | null): string | null {
  if (!b64) return null;
  return b64.startsWith("data:") ? b64 : `data:image/png;base64,${b64}`;
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
      `${baseUrl(c)}/instance/connectionState/${encodeURIComponent(c.instance)}`,
      { headers: authHeaders(c), cache: "no-store" },
    );
  } catch {
    throw new ChannelError(
      "Não foi possível contactar o servidor Evolution API. Verifica o URL.",
    );
  }
  if (res.status === 404) return "STOPPED";
  if (res.status === 401 || res.status === 403) {
    throw new ChannelError("API Key da Evolution API inválida.");
  }
  if (!res.ok) {
    throw new ChannelError(`Evolution API respondeu com erro (${res.status}).`);
  }
  const data = await res.json();
  return normalizeState(data?.instance?.state ?? data?.state);
}

/** Fetches the QR code (data URL) from the connect endpoint. */
export async function getQrCode(c: WhatsappConfig): Promise<string> {
  assertConfigured(c);
  const res = await fetch(
    `${baseUrl(c)}/instance/connect/${encodeURIComponent(c.instance)}`,
    { headers: authHeaders(c), cache: "no-store" },
  );
  if (!res.ok) {
    throw new ChannelError("Não foi possível obter o QR code do WhatsApp.");
  }
  const data = await res.json();
  const qr = asDataUrl(data?.base64 ?? data?.qrcode?.base64);
  if (!qr) {
    throw new ChannelError("O QR code ainda não está disponível. Tenta novamente.");
  }
  return qr;
}

/**
 * Creates the instance (if needed) and returns a QR code to scan. On Evolution
 * v2 the create response already includes the QR; otherwise we fetch it from
 * the connect endpoint.
 */
export async function startSession(c: WhatsappConfig): Promise<string | null> {
  assertConfigured(c);
  let res: Response;
  try {
    res = await fetch(`${baseUrl(c)}/instance/create`, {
      method: "POST",
      headers: authHeaders(c),
      body: JSON.stringify({
        instanceName: c.instance,
        qrcode: true,
        integration: "WHATSAPP-BAILEYS",
      }),
    });
  } catch {
    throw new ChannelError(
      "Não foi possível contactar o servidor Evolution API. Verifica o URL.",
    );
  }

  if (res.status === 401 || res.status === 403) {
    // 403 can also mean "instance already exists" on some versions — try connect.
    const qr = await getQrCode(c).catch(() => null);
    if (qr) return qr;
    throw new ChannelError(
      "Acesso negado pela Evolution API (verifica a API Key) ou a instância já existe.",
    );
  }

  if (res.ok) {
    const data = await res.json().catch(() => null);
    const qr = asDataUrl(data?.qrcode?.base64 ?? data?.base64);
    if (qr) return qr;
  }

  // Created but no QR in the response (or already existed) -> fetch it.
  return await getQrCode(c).catch(() => null);
}

export type Instance = { name: string; status: string };

/** Lists all instances on the Evolution server (uses the global API key). */
export async function fetchInstances(c: WhatsappConfig): Promise<Instance[]> {
  assertConfigured(c);
  let res: Response;
  try {
    res = await fetch(`${baseUrl(c)}/instance/fetchInstances`, {
      headers: authHeaders(c),
      cache: "no-store",
    });
  } catch {
    throw new ChannelError(
      "Não foi possível contactar o servidor Evolution API. Verifica o URL.",
    );
  }
  if (res.status === 401 || res.status === 403) {
    throw new ChannelError(
      "Acesso negado — para listar/eliminar instâncias é precisa a API Key global.",
    );
  }
  if (!res.ok) {
    throw new ChannelError(`Evolution API respondeu com erro (${res.status}).`);
  }
  const data = await res.json().catch(() => []);
  const list = Array.isArray(data) ? data : (data?.instances ?? []);
  return (list as Record<string, unknown>[])
    .map((it) => {
      const inst = (it.instance ?? it) as Record<string, unknown>;
      const name = String(
        inst.instanceName ?? inst.name ?? it.name ?? "",
      );
      const state = String(
        inst.connectionStatus ?? inst.status ?? it.connectionStatus ?? "",
      );
      return { name, status: normalizeState(state) };
    })
    .filter((x) => x.name);
}

/** Logs out (disconnects) and deletes an instance by name. */
export async function deleteInstance(
  c: WhatsappConfig,
  name: string,
): Promise<void> {
  assertConfigured(c);
  // Best-effort logout first; a connected instance can't always be deleted.
  await fetch(`${baseUrl(c)}/instance/logout/${encodeURIComponent(name)}`, {
    method: "DELETE",
    headers: authHeaders(c),
  }).catch(() => {});
  let res: Response;
  try {
    res = await fetch(`${baseUrl(c)}/instance/delete/${encodeURIComponent(name)}`, {
      method: "DELETE",
      headers: authHeaders(c),
    });
  } catch {
    throw new ChannelError("Não foi possível contactar o servidor Evolution API.");
  }
  if (res.status === 401 || res.status === 403) {
    throw new ChannelError(
      "Acesso negado — eliminar instâncias requer a API Key global.",
    );
  }
  if (!res.ok && res.status !== 404) {
    throw new ChannelError(`Falha ao eliminar a instância (${res.status}).`);
  }
}

/** Registers a webhook URL for incoming-message events on the instance. */
export async function setWebhook(
  c: WhatsappConfig,
  url: string,
): Promise<void> {
  assertConfigured(c);
  const res = await fetch(
    `${baseUrl(c)}/webhook/set/${encodeURIComponent(c.instance)}`,
    {
      method: "POST",
      headers: authHeaders(c),
      body: JSON.stringify({
        webhook: {
          enabled: true,
          url,
          events: ["MESSAGES_UPSERT", "MESSAGES_UPDATE"],
        },
      }),
    },
  );
  if (!res.ok) {
    throw new ChannelError(`Falha ao configurar o webhook (${res.status}).`);
  }
}

/**
 * Sends a text message to a phone number via Evolution API.
 * Returns the provider message id (key.id) when available, for delivery tracking.
 */
export async function sendText(
  c: WhatsappConfig,
  phone: string,
  text: string,
): Promise<string | null> {
  assertConfigured(c);
  const number = phone.replace(/\D/g, "");
  const res = await fetch(
    `${baseUrl(c)}/message/sendText/${encodeURIComponent(c.instance)}`,
    {
      method: "POST",
      headers: authHeaders(c),
      body: JSON.stringify({ number, text }),
    },
  );
  if (!res.ok) {
    throw new ChannelError(`Falha ao enviar mensagem de WhatsApp (${res.status}).`);
  }
  const data = await res.json().catch(() => null);
  return data?.key?.id ?? data?.messageId ?? null;
}

type Group = { id: string; subject: string; size: number };

/** Lists the WhatsApp groups the instance belongs to. */
export async function fetchGroups(c: WhatsappConfig): Promise<Group[]> {
  assertConfigured(c);
  const res = await fetch(
    `${baseUrl(c)}/group/fetchAllGroups/${encodeURIComponent(
      c.instance,
    )}?getParticipants=false`,
    { headers: authHeaders(c), cache: "no-store" },
  );
  if (!res.ok) {
    throw new ChannelError(`Falha ao obter grupos (${res.status}).`);
  }
  const data = await res.json();
  const list = Array.isArray(data) ? data : (data?.groups ?? []);
  return (list as Record<string, unknown>[])
    .map((g) => ({
      id: String(g.id ?? ""),
      subject: String(g.subject ?? g.name ?? "Grupo"),
      size: Number(g.size ?? (Array.isArray(g.participants) ? g.participants.length : 0)),
    }))
    .filter((g) => g.id);
}

/** Returns the phone numbers (digits) of a group's participants. */
export async function getGroupParticipants(
  c: WhatsappConfig,
  groupJid: string,
): Promise<string[]> {
  assertConfigured(c);
  const res = await fetch(
    `${baseUrl(c)}/group/participants/${encodeURIComponent(
      c.instance,
    )}?groupJid=${encodeURIComponent(groupJid)}`,
    { headers: authHeaders(c), cache: "no-store" },
  );
  if (!res.ok) {
    throw new ChannelError(`Falha ao obter membros do grupo (${res.status}).`);
  }
  const data = await res.json();
  const participants = (data?.participants ?? data ?? []) as Record<
    string,
    unknown
  >[];
  return participants
    .map((p) => String(p.id ?? "").split("@")[0].replace(/\D/g, ""))
    .filter((d) => d.length >= 6);
}
