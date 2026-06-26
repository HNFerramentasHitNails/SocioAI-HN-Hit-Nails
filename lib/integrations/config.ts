/** Channel integration config resolution (DB config -> env fallback). */

export class ChannelError extends Error {}

export type WhatsappConfig = {
  url: string;
  apiKey: string;
  instance: string;
};

export type EmailConfig = {
  apiKey: string;
  from: string;
};

type RawConfig = Record<string, unknown> | null | undefined;

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export function resolveWhatsappConfig(dbConfig: RawConfig): WhatsappConfig {
  const c = dbConfig ?? {};
  return {
    url: str(c.url) || process.env.EVOLUTION_URL || "",
    apiKey: str(c.api_key) || process.env.EVOLUTION_API_KEY || "",
    instance: str(c.instance) || process.env.EVOLUTION_INSTANCE || "default",
  };
}

export function resolveEmailConfig(dbConfig: RawConfig): EmailConfig {
  const c = dbConfig ?? {};
  return {
    apiKey: str(c.api_key) || process.env.RESEND_API_KEY || "",
    from: str(c.from) || process.env.EMAIL_FROM || "",
  };
}
