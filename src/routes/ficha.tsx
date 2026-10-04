// Ficha sob demanda (cache de 7 dias + IA com busca na web) + suporte a favoritar por categoria
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  ExternalLink,
  Sparkles,
  Loader2,
  Minus,
  Plus,
  AlertCircle,
  Heart,
} from "lucide-react";
import { useState } from "react";
import { getFicha } from "@/lib/identify.functions";
import { getDeviceId } from "@/lib/device";
import { categoryImage } from "@/data/category-images";
import { useFavorites, type FavoriteCategory } from "@/lib/favorites";
import { CategoryPickerModal } from "@/components/CategoryPickerModal";

export const Route = createFileRoute("/ficha")({
  validateSearch: (s: Record<string, unknown>): { nome: string } => ({
    nome: typeof s["nome"] === "string" ? (s["nome"] as string).slice(0, 120) : "",
  }),
  head: () => ({
    meta: [
      { title: "Ficha do produto — Glow Lens" },
      {
        name: "description",
        content:
          "Por que o produto é famoso, prós, contras, quem recomenda e onde comprar, com fontes.",
      },
      { property: "og:title", content: "Ficha do produto — Glow Lens" },
      { property: "og:description", content: "Ficha de produto de beleza com fontes conferíveis." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FichaPage,
});

function FichaPage() {
  const { nome } = Route.useSearch();
  const router = useRouter();
  const fetchFicha = useServerFn(getFicha);
  const { isFavorite, addFavorite, removeFavorite, getCategory } = useFavorites();
  const [pickerOpen, setPickerOpen] = useState(false);

  const q = useQuery({
    queryKey: ["ficha", nome],
    enabled: nome.length >= 2,
    staleTime: Infinity,
    retry: false,
    queryFn: () => fetchFicha({ data: { nome, deviceId: getDeviceId() } }),
  });
  const box = "rounded-2xl bg-card p-4 shadow-card";

  const isFav = isFavorite(nome);

  const back = (
    <div className="flex items-center justify-between pb-1">
      <button
        onClick={() => router.history.back()}
        aria-label="Voltar"
        className="grid h-11 w-11 place-items-center rounded-full bg-card shadow-card hover:bg-muted transition"
      >
        <ArrowLeft className="h-5 w-5" />
      </button>

      {q.data?.status === "ok" && (
        <button
          type="button"
          onClick={() => {
            if (isFav) {
              removeFavorite(nome);
            } else {
              setPickerOpen(true);
            }
          }}
          aria-label={isFav ? "Remover dos favoritos" : "Salvar nos favoritos"}
          title={isFav ? "Remover dos favoritos" : "Salvar nos favoritos"}
          className={`grid h-11 w-11 place-items-center rounded-full transition shadow-card cursor-pointer ${
            isFav
              ? "bg-primary text-primary-foreground shadow-soft"
              : "bg-card text-foreground hover:bg-muted"
          }`}
        >
          <Heart className={`h-5 w-5 ${isFav ? "fill-current" : ""}`} />
        </button>
      )}
    </div>
  );

  if (q.isPending || q.isFetching)
    return (
      <div className="space-y-4 pt-2">
        {back}
        <div
          className={`${box} flex flex-col items-center gap-3 py-10 text-center`}
          aria-live="polite"
        >
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="font-semibold">Montando a ficha de “{nome}”...</p>
          <p className="text-sm text-muted-foreground">
            A IA está pesquisando fontes na web. Pode levar até 1 minuto.
          </p>
        </div>
      </div>
    );

  const res = q.data;
  if (!nome || q.isError || !res || res.status === "error")
    return (
      <div className="space-y-4 pt-2">
        {back}
        <div className={`${box} space-y-3 text-center`}>
          <AlertCircle className="mx-auto h-8 w-8 text-primary" />
          <p className="font-semibold">
            {res?.status === "error"
              ? res.message
              : nome
                ? "Sem conexão. Tente de novo."
                : "Nenhum produto informado."}
          </p>
          <Link
            to="/buscar"
            className="inline-block rounded-full bg-primary px-5 py-3 font-semibold text-primary-foreground"
          >
            Buscar produto
          </Link>
        </div>
      </div>
    );

  const f = res.ficha;

  const handleSelectCategory = (cat: FavoriteCategory) => {
    addFavorite({
      id: f.nome,
      nome: f.nome,
      marca: f.marca,
      foto: f.foto || categoryImage(f.categoria),
      categoria: cat,
    });
  };

  return (
    <div className="space-y-4 pt-2 pb-24">
      {back}
      <img
        src={f.foto || categoryImage(f.categoria)}
        alt={f.nome}
        className="aspect-square w-full rounded-3xl bg-card object-contain shadow-card"
      />
      <div>
        <div className="flex items-center justify-between gap-2 mb-1">
          <p className="text-sm font-semibold text-link">
            {[f.marca, f.categoria].filter(Boolean).join(" · ")}
          </p>
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground bg-muted/60 px-2.5 py-0.5 rounded-full border border-border">
            <Sparkles className="h-3 w-3 text-primary" /> Texto gerado por IA
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{f.nome}</h1>
        <p className="text-xs text-muted-foreground mt-1">
          Atualizada em {new Date(f.atualizadoEm).toLocaleDateString("pt-BR")}
        </p>
      </div>

      {/* Depoimentos com fonte OU Descrição curta (até 3 frases) persuasiva e verdadeira */}
      {(f.depoimentos && f.depoimentos.length > 0) || (f.quemUsa && f.quemUsa.length > 0) ? (
        <section className={box}>
          <h2 className="mb-2.5 text-base sm:text-lg font-semibold flex items-center gap-2 text-foreground">
            <Sparkles className="h-4.5 w-4.5 text-primary" />
            Depoimentos com fonte
          </h2>
          <div className="space-y-2.5">
            {(f.depoimentos || f.quemUsa).map((r, i) => (
              <div
                key={r.url + r.nome + i}
                className="rounded-2xl bg-muted/40 p-3.5 border border-border space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-bold text-foreground">{r.nome}</p>
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-link hover:underline shrink-0"
                  >
                    <span>Fonte</span> <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                {r.texto && (
                  <p className="text-xs text-muted-foreground italic">&ldquo;{r.texto}&rdquo;</p>
                )}
                {r.titulo && r.titulo !== r.texto && (
                  <p className="text-[11px] text-muted-foreground/80">{r.titulo}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      ) : (
        <section className={box}>
          <h2 className="mb-1 text-base sm:text-lg font-semibold flex items-center gap-2 text-foreground">
            <Sparkles className="h-4.5 w-4.5 text-primary" />
            Sobre o produto
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {f.descricao || f.porQueFamoso}
          </p>
        </section>
      )}

      {/* Prós e Contras */}
      {(f.pros.length > 0 || f.contras.length > 0) && (
        <div className="grid grid-cols-2 gap-3">
          <section className="rounded-2xl bg-success/20 p-4 text-success-foreground border border-success/30">
            <h2 className="mb-1.5 font-bold text-sm">Prós</h2>
            {f.pros.map((x) => (
              <p key={x} className="flex gap-1.5 text-xs text-foreground py-0.5">
                <Plus className="h-3.5 w-3.5 text-success shrink-0 mt-0.5" />
                <span>{x}</span>
              </p>
            ))}
          </section>
          <section className="rounded-2xl bg-secondary p-4 text-secondary-foreground border border-border">
            <h2 className="mb-1.5 font-bold text-sm">Contras</h2>
            {f.contras.map((x) => (
              <p key={x} className="flex gap-1.5 text-xs text-foreground py-0.5">
                <Minus className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                <span>{x}</span>
              </p>
            ))}
          </section>
        </div>
      )}

      {/* Onde comprar: Amazon.com.br, Mercado Livre, AliExpress e Shopee */}
      <section className={box}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base sm:text-lg font-bold text-foreground">Onde comprar</h2>
          <span className="text-[11px] text-muted-foreground">Busca nos marketplaces</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {[
            {
              name: "Amazon.com.br",
              url: `https://www.amazon.com.br/s?k=${encodeURIComponent(`${f.marca} ${f.nome}`.trim())}`,
              tag: "Amazon",
            },
            {
              name: "Mercado Livre",
              url: `https://lista.mercadolivre.com.br/${encodeURIComponent(`${f.marca} ${f.nome}`.trim())}`,
              tag: "Mercado Livre",
            },
            {
              name: "AliExpress",
              url: `https://www.aliexpress.com/wholesale?SearchText=${encodeURIComponent(`${f.marca} ${f.nome}`.trim())}`,
              tag: "AliExpress",
            },
            {
              name: "Shopee",
              url: `https://shopee.com.br/search?keyword=${encodeURIComponent(`${f.marca} ${f.nome}`.trim())}`,
              tag: "Shopee",
            },
          ].map((store) => (
            <a
              key={store.name}
              href={store.url}
              target="_blank"
              rel="sponsored noopener"
              className="flex items-center justify-between rounded-2xl border border-border bg-card p-3.5 text-xs font-bold text-foreground shadow-xs transition hover:border-primary/50 hover:bg-muted/60 active:scale-[0.98]"
            >
              <span>{store.name}</span>
              <ExternalLink className="h-4 w-4 text-primary shrink-0" />
            </a>
          ))}
        </div>

        <p className="mt-3 text-center text-[11px] text-muted-foreground">
          Podemos receber comissão por compras feitas pelos links.
        </p>
      </section>

      {/* Fontes consultadas */}
      <section className={box}>
        <h2 className="mb-2 text-base font-semibold text-foreground">Fontes consultadas</h2>
        {f.fontes.length ? (
          <ul className="space-y-1.5">
            {f.fontes.map((s) => (
              <li key={s.url}>
                <a
                  href={s.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-link hover:underline break-all"
                >
                  <ExternalLink className="h-3 w-3 shrink-0" />
                  <span>{s.titulo}</span>
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-muted-foreground">Sem informação confirmada.</p>
        )}
      </section>

      {/* Modal de Escolha de Categoria para Salvar em Favoritos */}
      <CategoryPickerModal
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={handleSelectCategory}
        productName={f.nome}
        currentCategory={getCategory(f.nome)}
      />
    </div>
  );
}
