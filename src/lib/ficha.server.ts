// Ficha sob demanda: cache de 7 dias na tabela "fichas"; senão, IA com busca na web.
import { AI_RULES, cleanFontes, parseJson, runAi, type Fonte } from "./ai.server";
import { searchOpenBeautyFacts } from "./identify.server";

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
  nome.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

export async function readCachedFicha(nome: string): Promise<Ficha | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const since = new Date(Date.now() - CACHE_DAYS * 86400_000).toISOString();
  const { data } = await supabaseAdmin.from("fichas").select("dados, atualizado_em").eq("chave", fichaKey(nome)).gte("atualizado_em", since).maybeSingle();
  return data ? ({ ...(data.dados as Ficha), atualizadoEm: data.atualizado_em }) : null;
}

const strList = (v: unknown, n = 5) => (Array.isArray(v) ? v.map((x) => String(x).slice(0, 140)).filter(Boolean).slice(0, n) : []);

export async function buildFicha(nome: string): Promise<Ficha> {
  const text = await runAi({
    webSearch: true,
    messages: [
      {
        role: "user",
        content: `Pesquise na web sobre o produto de beleza "${nome}" e monte uma ficha.
${AI_RULES}
Formato: {"nome":"...","marca":"...","categoria":"Pele|Cabelo|Maquiagem|Perfume|Corpo|Outro","porQueFamoso":"2-3 frases próprias","pros":["..."],"contras":["..."],"quemUsa":[{"nome":"pessoa ou veículo","titulo":"título da fonte","url":"https://..."}],"ondeComprar":[{"loja":"...","url":"https://..."}],"fontes":[{"titulo":"...","url":"https://..."}]}
Se não houver fonte para "quemUsa", devolva lista vazia.`,
      },
    ],
  });
  const raw = parseJson<any>(text);
  const quemUsa = (Array.isArray(raw.quemUsa) ? raw.quemUsa : [])
    .map((q: any) => ({ nome: String(q?.nome ?? "").slice(0, 80), titulo: String(q?.titulo ?? "").slice(0, 160), url: String(q?.url ?? "") }))
    .filter((q: { nome: string; url: string }) => q.nome && /^https?:\/\//.test(q.url))
    .slice(0, 5);
  const ondeComprar = (Array.isArray(raw.ondeComprar) ? raw.ondeComprar : [])
    .map((s: any) => ({ loja: String(s?.loja ?? "").slice(0, 60), url: String(s?.url ?? "") }))
    .filter((s: { loja: string; url: string }) => s.loja && /^https?:\/\//.test(s.url))
    .slice(0, 4);
  const finalName = String(raw.nome || nome).slice(0, 120);
  const off = await searchOpenBeautyFacts(`${raw.marca ?? ""} ${finalName}`.trim());
  return {
    nome: finalName,
    marca: String(raw.marca ?? "").slice(0, 80),
    categoria: String(raw.categoria ?? "Outro").slice(0, 30),
    foto: off?.image ?? "",
    porQueFamoso: String(raw.porQueFamoso || "Sem informação confirmada").slice(0, 600),
    pros: strList(raw.pros),
    contras: strList(raw.contras),
    quemUsa,
    ondeComprar,
    fontes: cleanFontes(raw.fontes),
    atualizadoEm: new Date().toISOString(),
  };
}

export async function saveFicha(nome: string, f: Ficha) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin
    .from("fichas")
    .upsert({ chave: fichaKey(nome), nome: f.nome, dados: f, fontes: f.fontes, atualizado_em: f.atualizadoEm }, { onConflict: "chave" });
}
