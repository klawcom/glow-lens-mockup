// Chamadas à IA integrada (servidor apenas). A chave fica nos segredos da plataforma.
import { createOpenAI } from "@ai-sdk/openai";
import { streamText, type ModelMessage } from "ai";

export class AiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export const AI_RULES = `REGRAS OBRIGATÓRIAS:
- Só inclua informações que tenham fonte com título e link (URL completa https) encontrados na busca.
- Resuma com suas próprias palavras; nunca copie textos nem imagens.
- Nunca afirme que uma celebridade ou influencer usa/recomenda o produto sem uma fonte com link. Sem fonte, escreva "Sem informação confirmada".
- Responda SOMENTE com JSON válido, em português do Brasil, sem texto fora do JSON.`;

export async function runAi(opts: { messages: ModelMessage[]; webSearch?: boolean; effort?: "low" | "medium" }) {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new AiError(500, "CONFIG");
  const provider = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
  });
  const result = streamText({
    model: provider.responses("openai/gpt-6-astra"),
    maxRetries: 0,
    messages: opts.messages,
    ...(opts.webSearch ? { tools: { web_search: provider.tools.webSearch({}) } } : {}),
    providerOptions: {
      openai: {
        forceReasoning: true,
        reasoningEffort: opts.effort ?? "low",
        reasoningSummary: "auto",
        store: false,
        include: ["reasoning.encrypted_content"],
      },
    },
  });
  try {
    return await result.text;
  } catch (e) {
    const status = (e as { statusCode?: number }).statusCode ?? 500;
    console.error(e);
    throw new AiError(status, "AI_FAILED");
  }
}

export function parseJson<T = unknown>(text: string): T {
  const start = text.search(/[[{]/);
  const end = Math.max(text.lastIndexOf("}"), text.lastIndexOf("]"));
  if (start < 0 || end < start) throw new AiError(500, "PARSE");
  return JSON.parse(text.slice(start, end + 1)) as T;
}

export type Fonte = { titulo: string; url: string };

export function cleanFontes(v: unknown): Fonte[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((f) => ({ titulo: String(f?.titulo ?? f?.title ?? "").slice(0, 160), url: String(f?.url ?? "") }))
    .filter((f) => /^https?:\/\//.test(f.url) && f.titulo)
    .slice(0, 8);
}

export function friendlyAiMessage(e: unknown) {
  const s = e instanceof AiError ? e.status : 500;
  if (s === 429) return "Muitas pessoas usando agora. Tente em alguns instantes.";
  if (s === 402 || s === 403) return "A IA está indisponível no momento. Tente mais tarde.";
  return "Não conseguimos concluir agora. Tente novamente.";
}
