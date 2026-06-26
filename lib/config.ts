/**
 * Central app/brand configuration. Single-tenant (HN Hit Nails) for now;
 * branding values can later be overridden from the database (settings).
 */
export const APP_CONFIG = {
  name: "LeadsPro",
  company: "HN Hit Nails",
  fullName: "LeadsPro — HN Hit Nails",
  description:
    "Encontra negócios locais, importa-os como leads e contacta-os por WhatsApp e Email com mensagens geradas por IA.",
  supportEmail: "geral@hnhitnails.com",
} as const;

/** Outreach channels enabled in this build. */
export const CHANNELS = ["whatsapp", "email"] as const;
export type Channel = (typeof CHANNELS)[number];

export const CHANNEL_LABELS: Record<Channel, string> = {
  whatsapp: "WhatsApp",
  email: "Email",
};

/** Lead pipeline stages. */
export const LEAD_STATUSES = ["novo", "contatado", "respondeu"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  novo: "Novo",
  contatado: "Contactado",
  respondeu: "Respondeu",
};
