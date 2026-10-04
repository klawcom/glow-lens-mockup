// Ficha sob demanda: cache de 7 dias na tabela "fichas"; senão, IA com busca na web e fallback para produtos de exemplo.
import { AI_RULES, cleanFontes, parseJson, runAi, type Fonte } from "./ai.server";
import { searchOpenBeautyFacts } from "./identify.server";
import { PRODUCTS } from "@/data/products";

export type Ficha = {
  nome: string;
  marca: string;
  categoria: string;
  foto: string;
  porQueFamoso: string;
  pros: string[];
  contras: string[];
  quemUsa: { nome: string; titulo: string; url: string }[];
  ondeComprar: { loja: string; url: string }[];
  fontes: Fonte[];
  atualizadoEm: string;
};

export const CACHE_DAYS = 7;
export const fichaKey = (nome: string) =>
  nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

export function getExampleProductFallback(nome: string): Ficha | null {
  const key = fichaKey(nome);
  if (!key) return null;

  const found = PRODUCTS.find((p) => {
    const pk = fichaKey(p.name);
    const pid = fichaKey(p.id);
    const pbrand = fichaKey(`${p.brand} ${p.name}`);
    return pk === key || pid === key || pbrand === key || pk.includes(key) || key.includes(pk);
  });

  if (!found) return null;

  return {
    nome: found.name,
    marca: found.brand,
    categoria: found.category,
    foto: found.image,
    porQueFamoso: found.whyTrending || "Sem informação confirmada",
    pros: found.pros,
    contras: found.cons,
    quemUsa: found.recommendedBy.map((r) => ({
      nome: r.name,
      titulo: r.source,
      url: "https://glowlens.lovable.app",
    })),
    ondeComprar: found.stores.map((s) => ({ loja: s.name, url: s.url })),
    fontes: [{ titulo: "Catálogo Oficial Glow Lens", url: "https://glowlens.lovable.app" }],
    atualizadoEm: new Date().toISOString(),
  };
}

export async function readCachedFicha(nome: string): Promise<Ficha | null> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const since = new Date(Date.now() - CACHE_DAYS * 86400_000).toISOString();
    const { data, error } = await supabaseAdmin
      .from("fichas")
      .select("dados, atualizado_em")
      .eq("chave", fichaKey(nome))
      .gte("atualizado_em", since)
      .maybeSingle();
    if (error) {
      console.warn("Aviso ao ler cache de fichas:", error.message);
      return null;
    }
    return data ? { ...(data.dados as Ficha), atualizadoEm: data.atualizado_em } : null;
  } catch (err) {
    console.warn("Exceção ao ler cache de fichas:", err);
    return null;
  }
}

const strList = (v: unknown, n = 5) =>
  Array.isArray(v)
    ? v
        .map((x) => String(x).slice(0, 140).trim())
        .filter(Boolean)
        .slice(0, n)
    : [];

export async function buildFicha(nome: string): Promise<Ficha> {
  const text = await runAi({
    webSearch: true,
    messages: [
      {
        role: "user",
        content: `Pesquise na web sobre o produto de beleza "${nome}" e monte uma ficha.
${AI_RULES}
Formato: {"nome":"...","marca":"...","categoria":"Pele|Cabelo|Maquiagem|Perfume|Corpo|Outro","porQueFamoso":"2-3 frases próprias com base nas fontes","pros":["..."],"contras":["..."],"quemUsa":[{"nome":"pessoa ou veículo","titulo":"título da fonte","url":"https://..."}],"ondeComprar":[{"loja":"...","url":"https://..."}],"fontes":[{"titulo":"...","url":"https://..."}]}
Se não houver fonte para "quemUsa", devolva lista vazia. Se não houver fonte para qualquer informação, preencha com "Sem informação confirmada".`,
      },
    ],
  });
  type RawAiFicha = {
    nome?: string;
    marca?: string;
    categoria?: string;
    porQueFamoso?: string;
    pros?: unknown[];
    contras?: unknown[];
    quemUsa?: { nome?: unknown; titulo?: unknown; url?: unknown }[];
    ondeComprar?: { loja?: unknown; url?: unknown }[];
    fontes?: unknown[];
  };

  const raw = parseJson<RawAiFicha>(text);
  const quemUsa = (Array.isArray(raw.quemUsa) ? raw.quemUsa : [])
    .map((q) => ({
      nome: String(q?.nome ?? "")
        .slice(0, 80)
        .trim(),
      titulo: String(q?.titulo ?? "")
        .slice(0, 160)
        .trim(),
      url: String(q?.url ?? "").trim(),
    }))
    .filter(
      (q: { nome: string; url: string; titulo: string }) =>
        q.nome && q.titulo && /^https?:\/\//.test(q.url),
    )
    .slice(0, 5);

  const ondeComprar = (Array.isArray(raw.ondeComprar) ? raw.ondeComprar : [])
    .map((s) => ({
      loja: String(s?.loja ?? "")
        .slice(0, 60)
        .trim(),
      url: String(s?.url ?? "").trim(),
    }))
    .filter((s: { loja: string; url: string }) => s.loja && /^https?:\/\//.test(s.url))
    .slice(0, 4);

  const fontes = cleanFontes(raw.fontes);
  const finalName = String(raw.nome || nome)
    .slice(0, 120)
    .trim();
  const off = await searchOpenBeautyFacts(`${raw.marca ?? ""} ${finalName}`.trim());

  const porQueFamoso =
    raw.porQueFamoso && typeof raw.porQueFamoso === "string" && raw.porQueFamoso.trim().length > 0
      ? String(raw.porQueFamoso).slice(0, 600).trim()
      : "Sem informação confirmada";

  return {
    nome: finalName,
    marca:
      String(raw.marca ?? "")
        .slice(0, 80)
        .trim() || "Sem informação confirmada",
    categoria: String(raw.categoria ?? "Outro").slice(0, 30),
    foto: off?.image ?? "",
    porQueFamoso,
    pros: strList(raw.pros),
    contras: strList(raw.contras),
    quemUsa,
    ondeComprar,
    fontes,
    atualizadoEm: new Date().toISOString(),
  };
}

export async function saveFicha(nome: string, f: Ficha) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("fichas").upsert(
      {
        chave: fichaKey(nome),
        nome: f.nome,
        dados: f,
        fontes: f.fontes,
        atualizado_em: f.atualizadoEm,
      },
      { onConflict: "chave" },
    );
  } catch (err) {
    console.warn("Aviso ao salvar ficha no cache:", err);
  }
}
