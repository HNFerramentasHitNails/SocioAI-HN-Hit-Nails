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

/** Soft character limit per channel (used as a guideline for AI + UI). */
export const CHANNEL_CHAR_LIMIT: Record<Channel, number> = {
  whatsapp: 360,
  email: 1200,
};

/** Lead stage for message tailoring. */
export const LEAD_STAGES = [
  { value: "frio", label: "Frio (primeiro contacto)" },
  { value: "morno", label: "Morno (já interagiu)" },
  { value: "quente", label: "Quente (perto de fechar)" },
] as const;
export type LeadStage = (typeof LEAD_STAGES)[number]["value"];

/** Message objective. */
export const MESSAGE_OBJECTIVES = [
  { value: "iniciar", label: "Iniciar conversa" },
  { value: "reuniao", label: "Agendar reunião" },
  { value: "oferta", label: "Apresentar oferta" },
  { value: "reativar", label: "Reativar contacto" },
] as const;
export type MessageObjective = (typeof MESSAGE_OBJECTIVES)[number]["value"];

/** Tone of voice. */
export const MESSAGE_TONES = [
  { value: "humano", label: "Humano" },
  { value: "direto", label: "Direto" },
  { value: "consultivo", label: "Consultivo" },
  { value: "curto", label: "Curto" },
] as const;
export type MessageTone = (typeof MESSAGE_TONES)[number]["value"];

/** Catalog item types (products / trainings / news) for the AI knowledge base. */
export const CATALOG_TYPES = [
  { value: "product", label: "Produto" },
  { value: "training", label: "Formação" },
  { value: "news", label: "Novidade" },
] as const;
export type CatalogType = (typeof CATALOG_TYPES)[number]["value"];

export const CATALOG_TYPE_LABELS: Record<CatalogType, string> = {
  product: "Produtos",
  training: "Formações",
  news: "Novidades",
};

/** Marketplace lead categories (label + Google Places search keywords). */
export const MARKETPLACE_CATEGORIES = [
  { value: "beauty", label: "Salão de beleza", keywords: "salão de beleza" },
  { value: "nails", label: "Unhas / Manicure", keywords: "manicure unhas" },
  { value: "hair", label: "Cabeleireiro", keywords: "cabeleireiro" },
  { value: "spa", label: "Spa / Estética", keywords: "spa estética" },
  { value: "restaurant", label: "Restaurante", keywords: "restaurante" },
  { value: "cafe", label: "Café / Pastelaria", keywords: "café pastelaria" },
  { value: "clinic", label: "Clínica", keywords: "clínica" },
  { value: "gym", label: "Ginásio", keywords: "ginásio" },
  { value: "realestate", label: "Imobiliária", keywords: "imobiliária" },
  { value: "legal", label: "Advogados", keywords: "advogados" },
  { value: "accounting", label: "Contabilidade", keywords: "contabilidade" },
  { value: "other", label: "Outro (personalizado)", keywords: "" },
] as const;

export const MARKETPLACE_QUANTITIES = [10, 20, 50, 100] as const;

/** Merge variables available in templates. */
export const MERGE_VARIABLES = [
  "{{name}}",
  "{{full_name}}",
  "{{company}}",
  "{{city}}",
  "{{email}}",
  "{{phone}}",
  "{{niche}}",
] as const;

/** Lead pipeline stages. */
export const LEAD_STATUSES = ["novo", "contatado", "respondeu"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  novo: "Novo",
  contatado: "Contactado",
  respondeu: "Respondeu",
};
