// Tela Favoritos — Organizada por categorias: Pele, Cabelo, Maquiagem, Perfume, Corpo, Outros
import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart, Trash2, ExternalLink, Sparkles, Search } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { useFavorites, FAVORITE_CATEGORIES, type FavoriteCategory } from "@/lib/favorites";

export const Route = createFileRoute("/favoritos")({
  head: () => ({
    meta: [
      { title: "Meus Favoritos — Glow Lens" },
      {
        name: "description",
        content: "Seus produtos de beleza favoritos organizados por categoria.",
      },
      { property: "og:title", content: "Meus Favoritos — Glow Lens" },
      {
        property: "og:description",
        content: "Seus produtos de beleza favoritos salvos no aparelho.",
      },
    ],
  }),
  component: FavoritesPage,
});

const CATEGORY_ICONS: Record<FavoriteCategory, string> = {
  Pele: "🌸",
  Cabelo: "💇",
  Maquiagem: "💄",
  Perfume: "🌺",
  Corpo: "🧴",
  Outros: "✨",
};

function FavoritesPage() {
  const { favorites, removeFavorite } = useFavorites();
  const [selectedCategory, setSelectedCategory] = useState<FavoriteCategory | "Todos">("Todos");

  // Filtra por categoria
  const filteredList =
    selectedCategory === "Todos"
      ? favorites
      : favorites.filter((f) => f.categoria === selectedCategory);

  return (
    <div className="space-y-5">
      <PageHeader title="Meus Favoritos" />

      {/* FILTROS POR CATEGORIA (Pele, Cabelo, Maquiagem, Perfume, Corpo, Outros) */}
      <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1">
        <button
          type="button"
          onClick={() => setSelectedCategory("Todos")}
          className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold transition active:scale-95 cursor-pointer ${
            selectedCategory === "Todos"
              ? "bg-primary text-primary-foreground shadow-soft"
              : "border border-border bg-card text-foreground hover:bg-muted"
          }`}
        >
          Todos ({favorites.length})
        </button>

        {FAVORITE_CATEGORIES.map((cat) => {
          const count = favorites.filter((f) => f.categoria === cat).length;
          const isSelected = selectedCategory === cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`shrink-0 flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold transition active:scale-95 cursor-pointer ${
                isSelected
                  ? "bg-primary text-primary-foreground shadow-soft"
                  : "border border-border bg-card text-foreground hover:bg-muted"
              }`}
            >
              <span>{CATEGORY_ICONS[cat]}</span>
              <span>{cat}</span>
              {count > 0 && <span className="opacity-75">({count})</span>}
            </button>
          );
        })}
      </div>

      {/* LISTA DE FAVORITOS SALVOS */}
      {filteredList.length > 0 ? (
        <div className="space-y-3">
          {filteredList.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3.5 rounded-3xl border border-border bg-card p-4 shadow-card hover:border-primary/40 transition"
            >
              {/* Foto ou Ícone */}
              <div className="relative grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-2xl bg-muted/60 border border-border">
                {item.foto ? (
                  <img src={item.foto} alt={item.nome} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-2xl">{CATEGORY_ICONS[item.categoria] || "✨"}</span>
                )}
              </div>

              {/* Informações */}
              <div className="min-w-0 flex-1">
                <span className="inline-block rounded-full bg-secondary/70 px-2 py-0.5 text-[10px] font-extrabold text-secondary-foreground mb-1">
                  {CATEGORY_ICONS[item.categoria]} {item.categoria}
                </span>
                <h3 className="text-sm font-bold text-foreground truncate">{item.nome}</h3>
                {item.marca && (
                  <p className="text-xs text-muted-foreground truncate">{item.marca}</p>
                )}
              </div>

              {/* Ações: Ver Ficha e Remover */}
              <div className="flex items-center gap-1.5 shrink-0">
                <Link
                  to="/ficha"
                  search={{ nome: item.nome }}
                  aria-label={`Ver ficha de ${item.nome}`}
                  title="Ver ficha completa"
                  className="grid h-9 w-9 place-items-center rounded-full bg-secondary text-secondary-foreground hover:bg-muted transition active:scale-95"
                >
                  <ExternalLink className="h-4 w-4" />
                </Link>

                <button
                  type="button"
                  onClick={() => removeFavorite(item.id)}
                  aria-label={`Remover ${item.nome} dos favoritos`}
                  title="Remover dos favoritos"
                  className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/15 transition active:scale-95 cursor-pointer"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Estado Vazio */
        <div className="rounded-3xl border border-border bg-card p-8 text-center shadow-card space-y-3">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-secondary text-primary">
            <Heart className="h-7 w-7" />
          </div>
          <div>
            <h3 className="font-bold text-base text-foreground">
              {selectedCategory === "Todos"
                ? "Nenhum favorito salvo ainda"
                : `Nenhum favorito em ${selectedCategory}`}
            </h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
              Ao pesquisar ou escanear um produto, toque no ícone de coração para salvar na
              categoria desejada.
            </p>
          </div>
          <div className="pt-2">
            <Link
              to="/buscar"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground shadow-soft transition hover:opacity-95 active:scale-95"
            >
              <Search className="h-4 w-4" /> Buscar produtos
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
