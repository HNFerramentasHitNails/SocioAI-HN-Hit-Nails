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

export type AiConfig = {
  apiKey: string;
  baseUrl: string;
  model: string;
};

export function resolveAiConfig(dbConfig: RawConfig): AiConfig {
  const c = dbConfig ?? {};
  return {
    apiKey: str(c.api_key) || process.env.AI_API_KEY || "",
    baseUrl: str(c.base_url) || process.env.AI_BASE_URL || "https://api.deepseek.com",
    model: str(c.model) || process.env.AI_MODEL || "deepseek-v4-pro",
  };
}

export type AgentConfig = {
  storeUrl: string;
  instructions: string;
  maxTurns: number;
};

export function resolveAgentConfig(dbConfig: RawConfig): AgentConfig {
  const c = dbConfig ?? {};
  return {
    storeUrl: str(c.store_url) || "https://www.hnhitnails.com",
    instructions: str(c.instructions) || "",
    maxTurns: Number(c.max_turns) || 20,
  };
}

export type PlacesConfig = { apiKey: string };

export function resolvePlacesConfig(dbConfig: RawConfig): PlacesConfig {
  const c = dbConfig ?? {};
  return {
    apiKey: str(c.api_key) || process.env.GOOGLE_PLACES_API_KEY || "",
  };
}
