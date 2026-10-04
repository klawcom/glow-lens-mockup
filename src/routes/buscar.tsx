// Tela de Busca — Busca inteligente de produtos de beleza
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Search, Sparkles, Heart, ExternalLink, Loader2, X, ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { useSearchHistory } from "@/lib/search-history";
import { useFavorites, type FavoriteCategory } from "@/lib/favorites";
import { CategoryPickerModal } from "@/components/CategoryPickerModal";

export const Route = createFileRoute("/buscar")({
  validateSearch: (search: Record<string, unknown>): { q?: string | undefined } => ({
    q: typeof search?.["q"] === "string" ? (search["q"] as string) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Buscar produtos de beleza — Glow Lens" },
      { name: "description", content: "Busque produtos de beleza por nome, marca ou categoria." },
      { property: "og:title", content: "Buscar produtos de beleza — Glow Lens" },
      {
        property: "og:description",
        content: "Busque produtos de beleza com informações completas e fontes conferíveis.",
      },
    ],
  }),
  component: SearchPage,
});

interface SearchProduct {
  code: string;
  product_name: string;
  brands?: string;
  categories?: string;
  image_url?: string;
  image_front_small_url?: string;
}

export function SearchPage() {
  const searchParams = Route.useSearch();
  const navigate = useNavigate();
  const [query, setQuery] = useState(searchParams?.q || "");
  const [results, setResults] = useState<SearchProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const { addSearch } = useSearchHistory();
  const { isFavorite, addFavorite, removeFavorite, getCategory } = useFavorites();

  // Estado do modal de seleção de categoria para favoritar
  const [pickerOpen, setPickerOpen] = useState(false);
  const [productToFavorite, setProductToFavorite] = useState<{
    id: string;
    nome: string;
    marca?: string;
    foto?: string | null;
  } | null>(null);

  // Executa a busca na base aberta do Open Beauty Facts
  const runSearch = async (term: string) => {
    const cleanTerm = term.trim();
    if (!cleanTerm) return;

    addSearch(cleanTerm);
    setLoading(true);
    setSearched(true);

    try {
      const url = `https://world.openbeautyfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(
        cleanTerm,
      )}&search_simple=1&action=process&json=1&page_size=12`;

      const response = await fetch(url, { headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error("Falha na busca");
      const data = await response.json();
      const products: SearchProduct[] = (data?.products || []).filter(
        (p: SearchProduct) => p.product_name && p.product_name.trim().length > 0,
      );
      setResults(products);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (searchParams?.q) {
      setQuery(searchParams.q);
      runSearch(searchParams.q);
    }
  }, [searchParams?.q]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    navigate({
      to: "/buscar",
      search: { q: query.trim() },
    });
  };

  const handleFavoriteClick = (p: SearchProduct) => {
    const id = p.code || p.product_name;
    if (isFavorite(id)) {
      removeFavorite(id);
    } else {
      setProductToFavorite({
        id,
        nome: p.product_name,
        marca: p.brands,
        foto: p.image_front_small_url || p.image_url || null,
      });
      setPickerOpen(true);
    }
  };

  const handleSelectCategory = (cat: FavoriteCategory) => {
    if (productToFavorite) {
      addFavorite({
        id: productToFavorite.id,
        nome: productToFavorite.nome,
        marca: productToFavorite.marca,
        foto: productToFavorite.foto,
        categoria: cat,
      });
      setProductToFavorite(null);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Buscar Produtos" />

      {/* BARRA DE PESQUISA */}
      <form onSubmit={handleSubmit} className="relative">
        <div className="flex items-center rounded-3xl border-2 border-primary/30 bg-card px-4 py-3 sm:py-3.5 shadow-card transition focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/20">
          <Search className="h-5 w-5 text-primary shrink-0 mr-3" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Digite o nome de um produto de beleza..."
            className="w-full bg-transparent text-sm sm:text-base font-semibold text-foreground placeholder:text-muted-foreground outline-none"
            autoFocus
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Limpar"
              className="mr-2 grid h-6 w-6 place-items-center rounded-full text-muted-foreground hover:bg-muted"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            type="submit"
            className="rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-soft transition active:scale-95 cursor-pointer shrink-0"
          >
            Buscar
          </button>
        </div>
      </form>

      {/* ATALHO EM DESTAQUE: CONSULTAR FICHA COM IA */}
      {query.trim().length >= 2 && (
        <div className="rounded-3xl border border-primary/30 bg-gradient-to-r from-primary/10 to-accent/15 p-4 shadow-sm flex items-center justify-between gap-3">
          <div className="min-w-0">
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-primary mb-0.5">
              <Sparkles className="h-3.5 w-3.5" /> Análise Completa com IA
            </span>
            <p className="text-xs font-bold text-foreground truncate">
              Ver prós, contras e onde comprar de &ldquo;{query.trim()}&rdquo;
            </p>
          </div>
          <Link
            to="/ficha"
            search={{ nome: query.trim() }}
            className="inline-flex items-center gap-1.5 shrink-0 rounded-full bg-primary px-3.5 py-2 text-xs font-bold text-primary-foreground shadow-soft hover:opacity-90 active:scale-95 transition"
          >
            <span>Ver ficha</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}

      {/* ESTADO DE CARREGANDO */}
      {loading && (
        <div className="rounded-3xl bg-card p-10 text-center border border-border space-y-3">
          <Loader2 className="mx-auto h-7 w-7 animate-spin text-primary" />
          <p className="text-sm font-semibold text-foreground">Buscando produtos...</p>
        </div>
      )}

      {/* RESULTADOS DA BUSCA */}
      {!loading && searched && (
        <div className="space-y-3">
          <p className="text-xs font-bold text-muted-foreground px-1">
            {results.length} produto(s) encontrado(s) para &ldquo;{query}&rdquo;
          </p>

          {results.length > 0 ? (
            <div className="space-y-2.5">
              {results.map((product) => {
                const id = product.code || product.product_name;
                const isFav = isFavorite(id);
                const photo = product.image_front_small_url || product.image_url;

                return (
                  <div
                    key={id}
                    className="flex items-center gap-3.5 rounded-3xl border border-border bg-card p-3.5 shadow-card hover:border-primary/40 transition"
                  >
                    {/* Foto */}
                    <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-2xl bg-muted/50 border border-border">
                      {photo ? (
                        <img
                          src={photo}
                          alt={product.product_name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Sparkles className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>

                    {/* Informações */}
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-bold text-foreground truncate">
                        {product.product_name}
                      </h4>
                      {product.brands && (
                        <p className="text-xs text-muted-foreground truncate">{product.brands}</p>
                      )}
                      {product.categories && (
                        <p className="text-[10px] text-muted-foreground/80 truncate mt-0.5">
                          {product.categories.split(",")[0]}
                        </p>
                      )}
                    </div>

                    {/* Ações */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Botão de Favoritar */}
                      <button
                        type="button"
                        onClick={() => handleFavoriteClick(product)}
                        aria-label={isFav ? "Remover dos favoritos" : "Salvar nos favoritos"}
                        title={isFav ? "Remover dos favoritos" : "Salvar nos favoritos"}
                        className={`grid h-9 w-9 place-items-center rounded-full transition active:scale-95 cursor-pointer ${
                          isFav
                            ? "bg-primary text-primary-foreground shadow-soft"
                            : "bg-secondary text-secondary-foreground hover:bg-muted"
                        }`}
                      >
                        <Heart className={`h-4 w-4 ${isFav ? "fill-current" : ""}`} />
                      </button>

                      {/* Botão de Abrir Ficha */}
                      <Link
                        to="/ficha"
                        search={{ nome: `${product.brands || ""} ${product.product_name}`.trim() }}
                        aria-label="Ver ficha completa"
                        title="Ver ficha completa"
                        className="grid h-9 w-9 place-items-center rounded-full bg-secondary text-secondary-foreground hover:bg-muted transition active:scale-95"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-3xl border border-border bg-card p-8 text-center shadow-card space-y-3">
              <p className="font-bold text-base text-foreground">Nenhum produto encontrado</p>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                Não localizamos este produto na base de dados. Deseja pesquisar na web e gerar a
                ficha completa com IA?
              </p>
              {query && (
                <Link
                  to="/ficha"
                  search={{ nome: query }}
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground shadow-soft hover:opacity-90 active:scale-95 transition"
                >
                  <Sparkles className="h-4 w-4" /> Gerar ficha com IA
                </Link>
              )}
            </div>
          )}
        </div>
      )}

      {/* Modal de Escolha de Categoria para Favoritar */}
      {productToFavorite && (
        <CategoryPickerModal
          isOpen={pickerOpen}
          onClose={() => {
            setPickerOpen(false);
            setProductToFavorite(null);
          }}
          onSelect={handleSelectCategory}
          productName={productToFavorite.nome}
          currentCategory={getCategory(productToFavorite.id)}
        />
      )}
    </div>
  );
}
