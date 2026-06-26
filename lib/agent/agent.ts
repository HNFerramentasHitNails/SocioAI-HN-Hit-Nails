import { generateChat, type ChatMessage } from "@/lib/ai/client";
import type { AgentConfig, AiConfig } from "@/lib/integrations/config";

const OPT_OUT = [
  "parar",
  "pára",
  "para de",
  "stop",
  "sair",
  "cancelar",
  "remover",
  "descadastrar",
  "não quero",
  "nao quero",
  "deixa-me",
  "deixem-me",
  "não envies",
  "nao envies",
];

const HANDOFF = [
  "falar com",
  "quero falar",
  "humano",
  "pessoa real",
  "atendente",
  "responsável",
  "responsavel",
  "uma pessoa",
];

export function detectOptOut(text: string): boolean {
  const t = text.toLowerCase();
  return OPT_OUT.some((k) => t.includes(k));
}

export function detectHandoff(text: string): boolean {
  const t = text.toLowerCase();
  return HANDOFF.some((k) => t.includes(k));
}

export type HistoryItem = { role: "lead" | "assistant"; body: string };

/** Generates the next sales-agent reply given the conversation history. */
export async function generateAgentReply(opts: {
  history: HistoryItem[];
  about: string;
  agent: AgentConfig;
  ai: AiConfig;
  catalog?: string;
}): Promise<string> {
  const system = `És o assistente de vendas da HN Hit Nails — empresa portuguesa de produtos profissionais de unhas e estética e formações certificadas DGERT.
Falas SEMPRE em português de Portugal (PT-PT), de forma simpática, humana e BREVE (estilo WhatsApp).
O teu objetivo é ajudar o cliente e conduzi-lo a concretizar uma COMPRA na loja online: ${opts.agent.storeUrl}

Regras:
- Sê consultivo: percebe a necessidade antes de sugerir. Faz 1 pergunta de cada vez.
- Quando fizer sentido, partilha o link da loja (${opts.agent.storeUrl}) ou de uma categoria/produto.
- NUNCA inventes preços, stock, promoções ou prazos. Se não tiveres a certeza, diz que confirmas ou encaminha para a loja.
- Mensagens curtas (1 a 4 frases), emojis com moderação.
- Se o cliente quiser falar com uma pessoa, diz que vais passar a um colega.
- Se o cliente pedir para parar, respeita e despede-te com educação.
- Faz recomendações apenas com base no catálogo abaixo; não inventes produtos, formações ou preços.${
    opts.about ? `\n\nSobre a empresa:\n${opts.about}` : ""
  }${opts.catalog ? `\n\nCatálogo (produtos, formações e novidades disponíveis):\n${opts.catalog}` : ""}${opts.agent.instructions ? `\n\nInstruções adicionais:\n${opts.agent.instructions}` : ""}`;

  const messages: ChatMessage[] = [{ role: "system", content: system }];
  for (const m of opts.history) {
    messages.push({
      role: m.role === "lead" ? "user" : "assistant",
      content: m.body,
    });
  }

  return generateChat({
    messages,
    config: opts.ai,
    maxTokens: 1200,
    temperature: 0.8,
  });
}
