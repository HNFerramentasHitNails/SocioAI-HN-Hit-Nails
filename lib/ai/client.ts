import type { AiConfig } from "@/lib/integrations/config";

/**
 * Provider-agnostic AI text generation, using an OpenAI-compatible chat
 * completions endpoint. The config (api key, base URL, model) comes from the
 * org's settings (DB) with env fallback — see `resolveAiConfig`.
 *
 * Server-only — never import from a Client Component.
 */

export class AIError extends Error {}

export async function generateText({
  system,
  prompt,
  config,
  maxTokens = 2000,
  temperature = 0.85,
}: {
  system: string;
  prompt: string;
  config: AiConfig;
  maxTokens?: number;
  temperature?: number;
}): Promise<string> {
  if (!config.apiKey) {
    throw new AIError("A chave de IA não está configurada.");
  }
  const baseUrl = config.baseUrl.replace(/\/+$/, "");

  let res: Response;
  try {
    res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: prompt },
        ],
        max_tokens: maxTokens,
        temperature,
      }),
    });
  } catch {
    throw new AIError("Não foi possível contactar o serviço de IA.");
  }

  if (!res.ok) {
    throw new AIError(`O serviço de IA respondeu com erro (${res.status}).`);
  }

  const data = await res.json();
  // Reasoning models (e.g. DeepSeek V4 Pro) put the answer in `content`
  // (separate from `reasoning_content`, which we ignore).
  const content: string | undefined = data?.choices?.[0]?.message?.content;
  const text = content?.trim();
  if (!text) {
    throw new AIError("A IA não devolveu conteúdo. Tenta novamente.");
  }
  return text;
}
