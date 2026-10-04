// Chamadas à IA integrada (servidor apenas). A chave fica nos segredos da plataforma.
import { createOpenAI } from "@ai-sdk/openai";
import { streamText, type ModelMessage } from "ai";

export class AiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export const AI_RULES = `REGRAS OBRIGATÓRIAS:
- Só inclua informações que tenham fonte com título e link (URL completa https://) encontrados na busca.
- Resuma com suas próprias palavras; nunca copie textos nem imagens.
- Para qualquer informação sem fonte comprovada com link, escreva "Sem informação confirmada" (ou lista vazia [] no caso de listas).
- Nunca afirme que uma celebridade ou influencer usa/recomenda o produto sem uma fonte com link. Sem fonte, escreva "Sem informação confirmada".
- Nunca invente links, fontes, marcas ou produtos.
- Responda SOMENTE com JSON válido, em português do Brasil, sem texto fora do JSON.`;

export async function runAi(opts: {
  messages: ModelMessage[];
  webSearch?: boolean;
  effort?: "low" | "medium";
}) {
  const apiKey =
    process.env["LOVABLE_API_KEY"] ||
    process.env["AI_GATEWAY_TOKEN"] ||
    process.env["OPENAI_API_KEY"];

  if (!apiKey) {
    throw new AiError(503, "CONFIG_MISSING");
  }

  const isDirectOpenAi = apiKey.startsWith("sk-") && !process.env["LOVABLE_API_KEY"];
  const provider = createOpenAI({
    baseURL: isDirectOpenAi ? "https://api.openai.com/v1" : "https://ai.gateway.lovable.dev/v1",
    apiKey,
    headers: isDirectOpenAi
      ? {}
      : { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
  });

  const modelName = isDirectOpenAi ? "gpt-4o-mini" : "openai/gpt-6-astra";

  const result = streamText({
    model: provider.responses(modelName),
    maxRetries: 0,
    messages: opts.messages,
    ...(opts.webSearch && !isDirectOpenAi
      ? { tools: { web_search: provider.tools.webSearch({}) } }
      : {}),
    providerOptions: isDirectOpenAi
      ? undefined
      : {
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
    console.error("Erro na chamada de IA:", e);
    throw new AiError(status, (e as Error)?.message || "AI_FAILED");
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
    .map((f) => ({
      titulo: String(f?.titulo ?? f?.title ?? "")
        .slice(0, 160)
        .trim(),
      url: String(f?.url ?? "").trim(),
    }))
    .filter((f) => /^https?:\/\//.test(f.url) && f.titulo.length > 0)
    .slice(0, 8);
}

export function friendlyAiMessage(e: unknown): string {
  const s = e instanceof AiError ? e.status : ((e as { statusCode?: number })?.statusCode ?? 500);
  const rawMsg = (e as { message?: string })?.message || "";

  if (rawMsg === "CONFIG" || rawMsg === "CONFIG_MISSING" || s === 503) {
    return "Serviço de inteligência artificial não configurado na Lovable (chave de API ausente nos segredos).";
  }
  if (s === 429) {
    return "Limite temporário de consultas da IA atingido. Tente novamente em alguns instantes.";
  }
  if (s === 402 || s === 403) {
    return "O serviço de IA está sem créditos ou com acesso restrito no painel da Lovable.";
  }
  return "Serviço de IA temporariamente indisponível. Tentando plano alternativo com dados da base pública.";
}
