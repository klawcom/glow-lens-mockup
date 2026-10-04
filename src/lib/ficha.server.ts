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
  isPartial?: boolean;
  notice?: string;
};

export const CACHE_DAYS = 7;
export const fichaKey = (nome: string) =>
  nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

function mapCategory(catRaw?: string): string {
  const c = (catRaw || "").toLowerCase();
  if (
    c.includes("hair") ||
    c.includes("cabel") ||
    c.includes("shampoo") ||
    c.includes("condicionador")
  )
    return "Cabelo";
  if (
    c.includes("makeup") ||
    c.includes("maquiagem") ||
    c.includes("batom") ||
    c.includes("base") ||
    c.includes("rímel")
  )
    return "Maquiagem";
  if (
    c.includes("perfume") ||
    c.includes("fragrance") ||
    c.includes("colônia") ||
    c.includes("desodorante")
  )
    return "Perfume";
  if (
    c.includes("body") ||
    c.includes("corpo") ||
    c.includes("mão") ||
    c.includes("pé") ||
    c.includes("sabonete")
  )
    return "Corpo";
  return "Pele";
}

// Plano B: monta ficha a partir da base do Open Beauty Facts quando a IA falhar ou não estiver configurada
export async function buildFichaFromOpenBeautyFacts(nome: string): Promise<Ficha | null> {
  try {
    const { searchOpenBeautyFactsMulti } = await import("./identify.server");
    const res = await searchOpenBeautyFactsMulti(nome, 3);
    if (!res.products || res.products.length === 0) return null;

    const p = res.products[0];
    const pros: string[] = [];
    if (p.ingredients) {
      pros.push("Fórmula com ingredientes cadastrados na base pública");
    } else {
      pros.push("Item cosmético verificado em catálogo internacional");
    }
    pros.push("Produto registrado e conferível na base pública Open Beauty Facts");

    const contras: string[] = [
      "Recomenda-se realizar teste de sensibilidade na pele antes do uso contínuo",
    ];

    const descricao = p.ingredients
      ? `Produto de fórmula registrada. Ingredientes principais: ${p.ingredients.slice(0, 220)}.`
      : `Produto de cuidados cosméticos da marca ${p.brand || "registrada"}, catalogado na base colaborativa aberta.`;

    return {
      nome: p.name || nome,
      marca: p.brand || "Marca registrada",
      categoria: mapCategory(p.categories),
      foto: p.image || "",
      porQueFamoso: descricao,
      descricao,
      pros,
      contras,
      quemUsa: [],
      depoimentos: [],
      ondeComprar: [],
      fontes: [
        {
          titulo: `Open Beauty Facts — ${p.name || nome}`,
          url: p.url,
        },
      ],
      atualizadoEm: new Date().toISOString(),
      isPartial: res.isPartial,
      notice: res.isPartial
        ? `Ficha gerada via busca aproximada por "${res.variationUsed}" no Open Beauty Facts.`
        : "Ficha obtida diretamente da base aberta colaborativa Open Beauty Facts.",
    };
  } catch (err) {
    console.warn("Erro ao construir ficha a partir do Open Beauty Facts:", err);
    return null;
  }
}

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
  try {
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
  } catch (aiErr) {
    console.warn("Falha na chamada de IA em buildFicha. Acionando Plano B (Open Beauty Facts):", aiErr);

    // PLANO B 1: Buscar na base aberta do Open Beauty Facts
    const offFicha = await buildFichaFromOpenBeautyFacts(nome);
    if (offFicha) {
      return offFicha;
    }

    // PLANO B 2: Fallback para produto de exemplo existente
    const mockFicha = getExampleProductFallback(nome);
    if (mockFicha) {
      return mockFicha;
    }

    // Se nenhum dos planos B encontrou, repassa o erro para identificação no backend
    throw aiErr;
  }
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
