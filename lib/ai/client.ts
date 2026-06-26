/**
 * Provider-agnostic AI text generation, using an OpenAI-compatible chat
 * completions endpoint. Configured via env (defaults to DeepSeek V4 Pro):
 *   AI_API_KEY, AI_BASE_URL, AI_MODEL
 *
 * Server-only — never import from a Client Component.
 */
const BASE_URL = process.env.AI_BASE_URL ?? "https://api.deepseek.com";
const MODEL = process.env.AI_MODEL ?? "deepseek-v4-pro";

export class AIError extends Error {}

export async function generateText({
  system,
  prompt,
  maxTokens = 2000,
  temperature = 0.85,
}: {
  system: string;
  prompt: string;
  maxTokens?: number;
  temperature?: number;
}): Promise<string> {
  const apiKey = process.env.AI_API_KEY;
  if (!apiKey) {
    throw new AIError(
      "A chave de IA não está configurada (AI_API_KEY).",
    );
  }

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
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
  // DeepSeek V4 Pro is a reasoning model: the answer is in `content`
  // (separate from `reasoning_content`, which we ignore).
  const content: string | undefined = data?.choices?.[0]?.message?.content;
  const text = content?.trim();
  if (!text) {
    throw new AIError("A IA não devolveu conteúdo. Tenta novamente.");
  }
  return text;
}
