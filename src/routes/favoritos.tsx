// Tela 5 — Favoritos (salvos no aparelho).
import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { ProductCard } from "@/components/ProductCard";
import { PRODUCTS } from "@/data/products";
import { useFavorites } from "@/lib/favorites";

export const Route = createFileRoute("/favoritos")({
  head: () => ({
    meta: [
      { title: "Meus favoritos — Glow Lens" },
      { name: "description", content: "Seus produtos de beleza favoritos salvos no aparelho." },
      { property: "og:title", content: "Meus favoritos — Glow Lens" },
      { property: "og:description", content: "Seus produtos de beleza favoritos." },
    ],
  }),
  component: FavoritesPage,
});

function FavoritesPage() {
  const { ids } = useFavorites();
  const list = PRODUCTS.filter((p) => ids.includes(p.id));
  return (
    <>
      <PageHeader title="Favoritos" />
      {list.length ? (
        <div className="grid grid-cols-2 gap-3">
          {list.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      ) : (
        <div className="rounded-3xl bg-card p-8 text-center shadow-card">
          <Heart className="mx-auto mb-3 h-10 w-10 text-primary" />
          <p className="font-semibold">Nenhum favorito ainda</p>
          <p className="mb-4 text-sm text-muted-foreground">
            Toque no coração na ficha de um produto.
          </p>
          <Link
            to="/"
            className="inline-flex rounded-full bg-primary px-5 py-2 font-semibold text-primary-foreground"
          >
            Ver produtos
          </Link>
        </div>
      )}
    </>
  );
}
