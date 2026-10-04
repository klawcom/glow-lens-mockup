// Tela 4 — Ficha do produto.
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, ExternalLink, Heart, Minus, Plus, Flame } from "lucide-react";
import { getProduct } from "@/data/products";
import { Stars } from "@/components/Stars";
import { useFavorites, removeFavorite } from "@/lib/favorites";
import { CategoryPickerModal } from "@/components/CategoryPickerModal";

export const Route = createFileRoute("/produto/$id")({
  loader: ({ params }) => {
    const product = getProduct(params.id); // TODO: buscar na API
    if (!product) throw notFound();
    return { product };
  },
  head: ({ loaderData }) =>
    loaderData
      ? {
          meta: [
            { title: `${loaderData.product.name} — Glow Lens` },
            { name: "description", content: loaderData.product.whyTrending },
            { property: "og:title", content: `${loaderData.product.name} — Glow Lens` },
            { property: "og:description", content: loaderData.product.whyTrending },
          ],
        }
      : { meta: [{ title: "Produto não encontrado" }, { name: "robots", content: "noindex" }] },
  component: ProductPage,
});

function ProductPage() {
  const { product: p } = Route.useLoaderData();
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const { isFavorite, addFavorite, getCategory } = useFavorites();
  const fav = isFavorite(p.id);
  const box = "rounded-2xl bg-card p-4 shadow-card";

  return (
    <div className="space-y-4 pt-5 pb-20">
      <div className="flex justify-between">
        <Link
          to="/"
          aria-label="Voltar"
          className="grid h-11 w-11 place-items-center rounded-full bg-card shadow-card"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <button
          onClick={() => {
            if (fav) {
              removeFavorite(p.id);
            } else {
              setShowCategoryPicker(true);
            }
          }}
          aria-label="Favoritar"
          className="grid h-11 w-11 place-items-center rounded-full bg-card text-primary shadow-card cursor-pointer"
        >
          <Heart
            className={`h-5 w-5 ${fav ? "fill-primary text-primary" : "text-muted-foreground"}`}
          />
        </button>
      </div>

      <CategoryPickerModal
        isOpen={showCategoryPicker}
        onClose={() => setShowCategoryPicker(false)}
        productName={p.name}
        currentCategory={getCategory(p.id)}
        onSelect={(cat) => {
          addFavorite({
            id: p.id,
            nome: p.name,
            marca: p.brand,
            foto: p.image,
            categoria: cat,
          });
        }}
      />
      <img
        src={p.image}
        alt={p.name}
        width={816}
        height={816}
        className="aspect-square w-full rounded-3xl object-cover shadow-card"
      />
      <div>
        <p className="text-sm font-semibold text-link">
          {p.brand} · {p.category}
        </p>
        <h1 className="text-3xl font-bold">{p.name}</h1>
        <Stars rating={p.rating} />
      </div>
      <section className={box}>
        <h2 className="mb-1 flex items-center gap-2 text-lg font-semibold">
          <Flame className="h-5 w-5 text-primary" />
          Por que está em alta
        </h2>
        <p className="text-muted-foreground">{p.whyTrending}</p>
      </section>
      <section className={box}>
        <h2 className="mb-2 text-lg font-semibold">Quem usa / recomenda</h2>
        <ul className="space-y-1">
          {p.recommendedBy.map((r) => (
            <li key={r.name}>
              <b>{r.name}</b>{" "}
              <span className="text-sm text-muted-foreground">— fonte: {r.source}</span>
            </li>
          ))}
        </ul>
      </section>
      <div className="grid grid-cols-2 gap-3">
        <section className="rounded-2xl bg-success p-4 text-success-foreground">
          <h2 className="mb-1 font-semibold">Prós</h2>
          {p.pros.map((x) => (
            <p key={x} className="flex gap-1 text-sm">
              <Plus className="h-4 w-4 shrink-0" />
              {x}
            </p>
          ))}
        </section>
        <section className="rounded-2xl bg-secondary p-4 text-secondary-foreground">
          <h2 className="mb-1 font-semibold">Contras</h2>
          {p.cons.map((x) => (
            <p key={x} className="flex gap-1 text-sm">
              <Minus className="h-4 w-4 shrink-0" />
              {x}
            </p>
          ))}
        </section>
      </div>
      <section className={box}>
        <h2 className="mb-2 text-lg font-semibold">Onde comprar</h2>
        <div className="grid gap-2">
          {p.stores.map((s) => (
            <a
              key={s.name}
              href={s.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between rounded-full bg-primary px-5 py-3 font-semibold text-primary-foreground"
            >
              {s.name} <ExternalLink className="h-4 w-4" />
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
