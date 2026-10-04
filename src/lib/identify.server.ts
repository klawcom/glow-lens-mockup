import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";

export type AiIdentification = {
  name: string;
  brand: string;
  category: string;
  confidence: "alto" | "médio" | "baixo";
  photoOk: boolean;
  whyTrending: string;
};

const PROMPT = `Você identifica produtos de beleza (pele, cabelo, maquiagem, perfume, corpo) a partir de fotos.
Responda SOMENTE com um JSON válido, em português do Brasil, sem texto extra, neste formato:
{"name":"nome do produto","brand":"marca ou vazio","category":"Pele|Cabelo|Maquiagem|Perfume|Corpo|Outro","confidence":"alto|médio|baixo","photoOk":true,"whyTrending":"1-2 frases"}
Regras:
- "confidence": quão certo você está do produto exato.
- "photoOk": false se a foto estiver escura, borrada, cortada ou sem rótulo visível.
- "whyTrending": descreva em até 2 frases por que esse tipo de produto costuma ser popular (benefícios gerais). NUNCA cite celebridades, influencers ou pessoas que usam o produto. Se não souber, escreva "Sem informação confirmada".
- Se não for um produto de beleza, use confidence "baixo".`;

export async function identifyWithAi(imageDataUrl: string): Promise<AiIdentification> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("CONFIG");
  const provider = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
  });
  const result = streamText({
    model: provider.responses("openai/gpt-6-astra"),
    maxRetries: 0,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: PROMPT },
          { type: "image", image: imageDataUrl },
        ],
      },
    ],
    providerOptions: {
      openai: {
        forceReasoning: true,
        reasoningEffort: "low",
        reasoningSummary: "auto",
        store: false,
        include: ["reasoning.encrypted_content"],
      },
    },
  });
  const text = await result.text;
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("PARSE");
  const raw = JSON.parse(match[0]);
  const conf = ["alto", "médio", "baixo"].includes(raw.confidence) ? raw.confidence : "baixo";
  return {
    name: String(raw.name ?? "").slice(0, 120),
    brand: String(raw.brand ?? "").slice(0, 80),
    category: String(raw.category ?? "Outro").slice(0, 30),
    confidence: conf,
    photoOk: raw.photoOk !== false,
    whyTrending: String(raw.whyTrending || "Sem informação confirmada").slice(0, 400),
  };
}

export type OffProduct = {
  code: string;
  name: string;
  brand: string;
  image: string;
  ingredients: string;
  url: string;
};

export async function searchOpenBeautyFacts(query: string): Promise<OffProduct | null> {
  try {
    const url = `https://world.openbeautyfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=1`;
    const res = await fetch(url, { headers: { "User-Agent": "GlowLens/1.0" } });
    if (!res.ok) return null;
    const data = await res.json();
    const p = data?.products?.[0];
    if (!p?.code) return null;
    return {
      code: String(p.code),
      name: p.product_name_pt || p.product_name || "",
      brand: p.brands || "",
      image: p.image_front_url || p.image_url || "",
      ingredients: p.ingredients_text_pt || p.ingredients_text || "",
      url: `https://world.openbeautyfacts.org/product/${p.code}`,
    };
  } catch {
    return null;
  }
}
