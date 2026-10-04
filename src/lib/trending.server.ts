// Atualização diária dos 20 produtos em alta (Brasil e Mundo) com IA + busca na web.
import { AI_RULES, cleanFontes, parseJson, runAi } from "./ai.server";

const CATS = ["Pele", "Cabelo", "Maquiagem", "Perfume", "Corpo"];

async function fetchList(pais: "Brasil" | "Mundo") {
  const onde = pais === "Brasil" ? "no Brasil" : "no mundo";
  const text = await runAi({
    webSearch: true,
    effort: "medium",
    messages: [
      {
        role: "user",
        content: `Pesquise na web (notícias, rankings de vendas, TikTok Shop, revistas de beleza recentes) e liste os 20 produtos de beleza mais comentados e vendidos ${onde} atualmente.
${AI_RULES}
Formato: {"produtos":[{"posicao":1,"nome":"...","marca":"...","categoria":"Pele|Cabelo|Maquiagem|Perfume|Corpo","por_que":"1-2 frases próprias","fontes":[{"titulo":"...","url":"https://..."}]}]}
Cada produto precisa de pelo menos 1 fonte com link.`,
      },
    ],
  });
  type RawTrendingItem = {
    nome?: unknown;
    marca?: unknown;
    categoria?: unknown;
    por_que?: unknown;
    fontes?: unknown;
    posicao?: unknown;
  };

  const raw = parseJson<{ produtos?: RawTrendingItem[] }>(text);
  const items = (raw.produtos ?? [])
    .map((p, i) => ({
      nome: String(p?.nome ?? "").slice(0, 120),
      marca: String(p?.marca ?? "").slice(0, 80),
      categoria:
        typeof p?.categoria === "string" && CATS.includes(p.categoria) ? p.categoria : "Outro",
      por_que: String(p?.por_que || "Sem informação confirmada").slice(0, 400),
      fontes: cleanFontes(p?.fontes),
      posicao: Number(p?.posicao) || i + 1,
      pais,
    }))
    .filter((p) => p.nome && p.fontes.length > 0)
    .slice(0, 20);
  if (items.length < 5) throw new Error(`Lista ${pais} incompleta (${items.length})`);
  return items;
}

export async function refreshTrending(): Promise<{ ok: boolean; message: string }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const now = new Date();
  // Trava para não rodar duas vezes ao mesmo tempo
  const { data: lock } = await supabaseAdmin
    .from("job_status")
    .select("travado_ate")
    .eq("nome", "trending")
    .maybeSingle();
  if (lock?.travado_ate && new Date(lock.travado_ate) > now)
    return { ok: false, message: "Atualização já em andamento." };
  await supabaseAdmin.from("job_status").upsert({
    nome: "trending",
    travado_ate: new Date(now.getTime() + 10 * 60_000).toISOString(),
    ultimo_status: "rodando",
  });

  const results = await Promise.allSettled([fetchList("Brasil"), fetchList("Mundo")]);
  const msgs: string[] = [];
  for (const r of results) {
    if (r.status === "fulfilled") {
      const pais = r.value[0]!.pais;
      const atualizado_em = new Date().toISOString();
      const { error } = await supabaseAdmin
        .from("produtos_em_alta")
        .insert(r.value.map((p) => ({ ...p, atualizado_em })));
      if (error) {
        msgs.push(`${pais}: erro ao salvar`);
        continue;
      }
      // Só apaga a lista antiga depois de salvar a nova
      await supabaseAdmin
        .from("produtos_em_alta")
        .delete()
        .eq("pais", pais)
        .lt("atualizado_em", atualizado_em);
      msgs.push(`${pais}: ${r.value.length} produtos`);
    } else {
      console.error(r.reason);
      msgs.push("Uma lista falhou; mantida a anterior");
    }
  }
  const ok = results.some((r) => r.status === "fulfilled");
  await supabaseAdmin.from("job_status").upsert({
    nome: "trending",
    travado_ate: null,
    ultimo_status: ok ? "ok" : "falhou",
    ultimo_erro: ok ? null : msgs.join("; "),
    atualizado_em: new Date().toISOString(),
  });
  return { ok, message: msgs.join(" · ") };
}
