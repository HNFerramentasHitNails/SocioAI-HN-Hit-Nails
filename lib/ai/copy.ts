import {
  CHANNEL_CHAR_LIMIT,
  CHANNEL_LABELS,
  LEAD_STAGES,
  MESSAGE_OBJECTIVES,
  MESSAGE_TONES,
  type Channel,
} from "@/lib/config";

export type CopyParams = {
  channel: Channel;
  niche?: string | null;
  leadStage?: string | null;
  objective?: string | null;
  tone?: string | null;
  aboutContext?: string | null;
  currentBody?: string | null;
  catalog?: string | null;
};

function label<T extends { value: string; label: string }>(
  list: readonly T[],
  value?: string | null,
) {
  return list.find((i) => i.value === value)?.label ?? value ?? "—";
}

const SYSTEM = `És um copywriter especialista em prospeção e outreach B2B.
Escreves SEMPRE em português de Portugal (PT-PT), nunca em português do Brasil.
As mensagens são naturais, humanas, persuasivas e diretas ao ponto — sem soar a spam.
Usas variáveis de merge quando fizer sentido para personalizar: {{name}}, {{full_name}}, {{company}}, {{city}}, {{niche}}.
Devolves APENAS o corpo da mensagem, sem aspas, sem título, sem assinatura de placeholder e sem explicações.`;

export function buildCopyPrompt(params: CopyParams): {
  system: string;
  prompt: string;
} {
  const limit = CHANNEL_CHAR_LIMIT[params.channel];
  const lines: string[] = [
    `Escreve uma mensagem de ${CHANNEL_LABELS[params.channel]} para um lead.`,
    `Canal: ${CHANNEL_LABELS[params.channel]} (máximo ~${limit} caracteres${
      params.channel === "whatsapp" ? ", curto e informal" : ""
    }).`,
  ];

  if (params.niche) lines.push(`Nicho do lead: ${params.niche}.`);
  lines.push(`Estágio do lead: ${label(LEAD_STAGES, params.leadStage)}.`);
  lines.push(`Objetivo da mensagem: ${label(MESSAGE_OBJECTIVES, params.objective)}.`);
  lines.push(`Tom de voz: ${label(MESSAGE_TONES, params.tone)}.`);

  if (params.aboutContext?.trim()) {
    lines.push(
      `\nContexto sobre quem envia (usa para fundamentar o valor):\n${params.aboutContext.trim()}`,
    );
  }

  if (params.catalog?.trim()) {
    lines.push(
      `\nCatálogo disponível (menciona produtos/formações reais quando relevante; não inventes):\n${params.catalog.trim()}`,
    );
  }

  if (params.currentBody?.trim()) {
    lines.push(
      `\nReescreve/melhora a mensagem atual mantendo a intenção, mas com nova abordagem:\n${params.currentBody.trim()}`,
    );
  }

  if (params.channel === "email") {
    lines.push(
      "\nPara email, escreve um corpo direto (sem 'Assunto:'). Pode ter 2-4 parágrafos curtos.",
    );
  }

  return { system: SYSTEM, prompt: lines.join("\n") };
}

/** Extracts the {{merge}} variables present in a message body. */
export function extractVariables(body: string): string[] {
  const matches = body.match(/\{\{\s*[a-z_]+\s*\}\}/gi) ?? [];
  return Array.from(new Set(matches.map((m) => m.replace(/\s+/g, ""))));
}
