// Ficha sob demanda: cache de 7 dias na tabela "fichas"; senão, IA com busca na web e fallback para produtos de exemplo.
import { AI_RULES, cleanFontes, parseJson, runAi, type Fonte } from "./ai.server";
import { searchOpenBeautyFacts } from "./identify.server";
import { PRODUCTS } from "@/data/products";

export type Depoimento = {
  nome: string;
  titulo: string;
  url: string;
  texto?: string;
};

export type Ficha = {
  nome: string;
  marca: string;
  categoria: string;
  foto: string;
  porQueFamoso: string; // descrição curta (até 3 frases) persuasiva e verdadeira
  descricao?: string;
  pros: string[];
  contras: string[];
  quemUsa: Depoimento[]; // mantido para retrocompatibilidade
  depoimentos?: Depoimento[];
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

  const depoimentos: Depoimento[] = found.recommendedBy.map((r) => ({
    nome: r.name,
    titulo: r.source,
    url: "https://glowlens.lovable.app",
    texto: `Recomendado por ${r.name}`,
  }));

  return {
    nome: found.name,
    marca: found.brand,
    categoria: found.category,
    foto: found.image,
    porQueFamoso: found.whyTrending || "Produto de destaque em cuidados de beleza.",
    descricao: found.whyTrending,
    pros: found.pros,
    contras: found.cons,
    quemUsa: depoimentos,
    depoimentos,
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
    if (!data?.dados) return null;
    const f = data.dados as Ficha;
    return {
      ...f,
      depoimentos: f.depoimentos || f.quemUsa || [],
      descricao: f.descricao || f.porQueFamoso || "",
      atualizadoEm: data.atualizado_em,
    };
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
        content: `Pesquise na web sobre o produto de beleza ou cosmético "${nome}" e monte uma ficha informativa.
${AI_RULES}

REGRAS DE CONTEÚDO OBRIGATÓRIAS:
1. DEPOIMENTOS: Liste em "depoimentos" apenas se houver avaliações/depoimentos REAIS de consumidores ou veículos com link verídico encontrado na busca. Cada depoimento deve conter: {"nome":"quem avaliou","titulo":"título da fonte","url":"https://...","texto":"resumo do depoimento"}. Se não houver depoimento com link comprovado, retorne lista vazia [].
2. SEM DEPOIMENTOS: Se a lista de depoimentos estiver vazia, elabore em "descricao" uma descrição curta (até 3 frases), persuasiva e verdadeira, baseada estritamente nos ingredientes, características e fontes reais.
3. PROIBIDO: NUNCA inventar depoimentos, avaliações, notas falsas, resultados milagrosos, famosos nem promessas de cura.

Formato esperado (SOMENTE JSON):
{"nome":"...","marca":"...","categoria":"Pele|Cabelo|Maquiagem|Perfume|Corpo|Outros","descricao":"até 3 frases persuasivas e verdadeiras baseadas em ingredientes reais","pros":["..."],"contras":["..."],"depoimentos":[{"nome":"...","titulo":"...","url":"https://...","texto":"..."}],"fontes":[{"titulo":"...","url":"https://..."}]}`,
      },
    ],
  });

  type RawAiFicha = {
    nome?: string;
    marca?: string;
    categoria?: string;
    descricao?: string;
    porQueFamoso?: string;
    pros?: unknown[];
    contras?: unknown[];
    depoimentos?: { nome?: unknown; titulo?: unknown; url?: unknown; texto?: unknown }[];
    quemUsa?: { nome?: unknown; titulo?: unknown; url?: unknown; texto?: unknown }[];
    ondeComprar?: { loja?: unknown; url?: unknown }[];
    fontes?: unknown[];
  };

  const raw = parseJson<RawAiFicha>(text);

  const rawDeps = raw.depoimentos || raw.quemUsa || [];
  const depoimentos: Depoimento[] = (Array.isArray(rawDeps) ? rawDeps : [])
    .map((q) => ({
      nome: String(q?.nome ?? "")
        .slice(0, 80)
        .trim(),
      titulo: String(q?.titulo ?? "")
        .slice(0, 160)
        .trim(),
      url: String(q?.url ?? "").trim(),
      texto: q?.texto ? String(q.texto).slice(0, 280).trim() : undefined,
    }))
    .filter((q) => q.nome && q.titulo && /^https?:\/\//.test(q.url))
    .slice(0, 5);

  const fontes = cleanFontes(raw.fontes);
  const finalName = String(raw.nome || nome)
    .slice(0, 120)
    .trim();
  const brand =
    String(raw.marca ?? "")
      .slice(0, 80)
      .trim() || "Sem informação confirmada";

  // Busca foto na Open Beauty Facts
  const off = await searchOpenBeautyFacts(`${brand} ${finalName}`.trim());

  const descricao =
    String(raw.descricao || raw.porQueFamoso || "")
      .slice(0, 600)
      .trim() || "Produto formulado para cuidados de beleza com ingredientes ativos comprovados.";

  return {
    nome: finalName,
    marca: brand,
    categoria: String(raw.categoria ?? "Pele").slice(0, 30),
    foto: off?.image ?? "",
    porQueFamoso: descricao,
    descricao,
    pros: strList(raw.pros),
    contras: strList(raw.contras),
    quemUsa: depoimentos,
    depoimentos,
    ondeComprar: [], // links de afiliados gerados dinamicamente na tela
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
