// Ficha sob demanda (cache de 7 dias + IA com busca na web) + suporte a favoritar por categoria
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  ExternalLink,
  Flame,
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
        <p className="text-sm font-semibold text-link">
          {[f.marca, f.categoria].filter(Boolean).join(" · ")}
        </p>
        <h1 className="text-3xl font-bold">{f.nome}</h1>
        <p className="text-xs text-muted-foreground">
          Atualizada em {new Date(f.atualizadoEm).toLocaleDateString("pt-BR")}
        </p>
      </div>
      <section className={box}>
        <h2 className="mb-1 flex items-center gap-2 text-lg font-semibold">
          <Flame className="h-5 w-5 text-primary" />
          Por que está em alta
        </h2>
        <p className="text-muted-foreground">{f.porQueFamoso}</p>
        <p className="mt-2 text-xs italic text-muted-foreground">
          Gerado por IA, pode conter erros. Confira as fontes.
        </p>
      </section>
      <section className={box}>
        <h2 className="mb-2 text-lg font-semibold">Quem usa / recomenda</h2>
        {f.quemUsa.length ? (
          <ul className="space-y-1">
            {f.quemUsa.map((r) => (
              <li key={r.url + r.nome}>
                <b>{r.nome}</b>{" "}
                <a
                  href={r.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-link underline"
                >
                  fonte: {r.titulo || "ver"}
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground">Sem informação confirmada.</p>
        )}
      </section>
      {(f.pros.length > 0 || f.contras.length > 0) && (
        <div className="grid grid-cols-2 gap-3">
          <section className="rounded-2xl bg-success p-4 text-success-foreground">
            <h2 className="mb-1 font-semibold">Prós</h2>
            {f.pros.map((x) => (
              <p key={x} className="flex gap-1 text-sm">
                <Plus className="h-4 w-4 shrink-0" />
                {x}
              </p>
            ))}
          </section>
          <section className="rounded-2xl bg-secondary p-4 text-secondary-foreground">
            <h2 className="mb-1 font-semibold">Contras</h2>
            {f.contras.map((x) => (
              <p key={x} className="flex gap-1 text-sm">
                <Minus className="h-4 w-4 shrink-0" />
                {x}
              </p>
            ))}
          </section>
        </div>
      )}
      {f.ondeComprar.length > 0 && (
        <section className={box}>
          <h2 className="mb-2 text-lg font-semibold">Onde comprar</h2>
          <div className="grid gap-2">
            {f.ondeComprar.map((s) => (
              <a
                key={s.url}
                href={s.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between rounded-full bg-primary px-5 py-3 font-semibold text-primary-foreground"
              >
                {s.loja} <ExternalLink className="h-4 w-4" />
              </a>
            ))}
          </div>
        </section>
      )}
      <section className={box}>
        <h2 className="mb-2 text-lg font-semibold">Fontes</h2>
        {f.fontes.length ? (
          <ul className="space-y-1">
            {f.fontes.map((s) => (
              <li key={s.url}>
                <a
                  href={s.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-link underline"
                >
                  {s.titulo} <ExternalLink className="h-3 w-3" />
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground">Sem informação confirmada.</p>
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
