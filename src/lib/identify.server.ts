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
  const apiKey =
    process.env["LOVABLE_API_KEY"] ||
    process.env["AI_GATEWAY_TOKEN"] ||
    process.env["OPENAI_API_KEY"];

  if (!apiKey) throw new Error("CONFIG_MISSING");

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
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: PROMPT },
          { type: "image", image: imageDataUrl },
        ],
      },
    ],
    providerOptions: isDirectOpenAi
      ? undefined
      : {
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
  categories?: string;
  url: string;
};

// Marcas populares para separar marca e nome de produto
const POPULAR_BRANDS = [
  "nivea",
  "cerave",
  "la roche posay",
  "la roche",
  "vichy",
  "loreal",
  "l'oreal",
  "natura",
  "o boticario",
  "boticario",
  "eudora",
  "granado",
  "sallve",
  "darrow",
  "bioderma",
  "neutrogena",
  "mac",
  "ruby rose",
  "wepink",
  "principia",
  "isdin",
  "loccitane",
  "skala",
  "pantene",
  "dove",
  "avon",
  "maybelline",
  "boca rosa",
  "mari maria",
  "bruna tavares",
  "wella",
  "kerastase",
  "adcos",
  "mantecorp",
];

export function normalizeSearchTerm(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

// Gera até 3 variações da consulta (com e sem marca, sem acentos)
export function generateQueryVariations(query: string): {
  term: string;
  type: "exact" | "no_accents" | "no_brand" | "brand_only" | "simplified";
}[] {
  const v1 = query.trim();
  const v2 = normalizeSearchTerm(query);

  const list: {
    term: string;
    type: "exact" | "no_accents" | "no_brand" | "brand_only" | "simplified";
  }[] = [{ term: v1, type: "exact" }];

  // 1. Sem acentos
  if (v2 !== v1.toLowerCase()) {
    list.push({ term: v2, type: "no_accents" });
  }

  // 2. Com e sem marca
  let detectedBrand = "";
  for (const b of POPULAR_BRANDS) {
    if (v2.includes(b)) {
      detectedBrand = b;
      break;
    }
  }

  if (detectedBrand) {
    // Termo sem a marca (apenas o produto)
    const withoutBrand = v2
      .replace(new RegExp(`\\b${detectedBrand}\\b`, "gi"), "")
      .trim()
      .replace(/\s+/g, " ");

    if (withoutBrand.length >= 3) {
      list.push({ term: withoutBrand, type: "no_brand" });
    }

    // Apenas a marca + primeiro substantivo
    const brandCombo = `${detectedBrand} ${withoutBrand.split(" ")[0] || ""}`.trim();
    if (brandCombo && !list.some((l) => l.term === brandCombo)) {
      list.push({ term: brandCombo, type: "brand_only" });
    }
  } else {
    // Variação simplificada sem palavras acessórias
    const words = v2
      .split(/\s+/)
      .filter((w) => !["de", "para", "com", "o", "a", "em", "do", "da", "e", "um", "uma"].includes(w));
    if (words.length > 2) {
      const simplified = `${words[0]} ${words[1]}`;
      if (!list.some((l) => l.term === simplified)) {
        list.push({ term: simplified, type: "simplified" });
      }
    }
  }

  return list.slice(0, 3);
}

export type MultiSearchResult = {
  products: OffProduct[];
  isPartial: boolean;
  variationUsed: string;
};

// Busca no Open Beauty Facts testando até 3 variações da consulta
export async function searchOpenBeautyFactsMulti(
  query: string,
  limit = 12,
): Promise<MultiSearchResult> {
  const variations = generateQueryVariations(query);

  for (let i = 0; i < variations.length; i++) {
    const v = variations[i];
    try {
      const url = `https://world.openbeautyfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(
        v.term,
      )}&search_simple=1&action=process&json=1&page_size=${limit}`;

      const res = await fetch(url, {
        headers: { "User-Agent": "GlowLens/1.0", Accept: "application/json" },
      });

      if (!res.ok) continue;

      const data = await res.json();
      const rawProducts: any[] = data?.products || [];

      const parsed: OffProduct[] = rawProducts
        .filter((p) => p && (p.product_name || p.product_name_pt))
        .map((p) => ({
          code: String(p.code || ""),
          name: p.product_name_pt || p.product_name || p.generic_name || "",
          brand: p.brands || p.brand_owner || "",
          image: p.image_front_url || p.image_url || p.image_front_small_url || "",
          ingredients: p.ingredients_text_pt || p.ingredients_text || "",
          categories: p.categories || "",
          url: `https://world.openbeautyfacts.org/product/${p.code}`,
        }));

      if (parsed.length > 0) {
        return {
          products: parsed,
          isPartial: v.type !== "exact",
          variationUsed: v.term,
        };
      }
    } catch (err) {
      console.warn(`Erro ao consultar Open Beauty Facts com variação "${v.term}":`, err);
    }
  }

  return {
    products: [],
    isPartial: false,
    variationUsed: query,
  };
}

export async function searchOpenBeautyFacts(query: string): Promise<OffProduct | null> {
  const res = await searchOpenBeautyFactsMulti(query, 1);
  return res.products[0] || null;
}
