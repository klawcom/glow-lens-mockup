// Tela Início — App Glow Lens (Exclusivo de Busca)
// Estrutura de cima para baixo:
// 1. Barra de pesquisa GRANDE (mais alta, fonte maior)
// 2. Botão "Escanear produto" logo abaixo
// 3. "Minhas buscas" (últimas 20, com apagar uma ou todas)
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Camera, Sparkles, Search, History, Trash2, X, ArrowRight } from "lucide-react";
import { useState } from "react";
import { useSearchHistory } from "@/lib/search-history";
import { APP_CONFIG } from "@/config/app";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: `${APP_CONFIG.name} — Busca Inteligente de Produtos de Beleza` },
      {
        name: "description",
        content:
          "Busque produtos de beleza por nome, marca ou código de barras. Análise com IA e ficha completa.",
      },
      { property: "og:title", content: `${APP_CONFIG.name} — Busca de Beleza` },
      {
        property: "og:description",
        content: "Busque produtos de beleza por nome ou código de barras.",
      },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();
  const { history, addSearch, removeSearch, clearHistory } = useSearchHistory();

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchTerm.trim();
    if (!query) return;

    addSearch(query);
    navigate({
      to: "/ficha",
      search: { nome: query },
    });
  };

  const handleHistoryClick = (item: string) => {
    addSearch(item);
    navigate({
      to: "/ficha",
      search: { nome: item },
    });
  };

  return (
    <div className="space-y-6 pt-1">
      {/* 1. BARRA DE PESQUISA GRANDE (Mais alta, fonte maior) */}
      <form onSubmit={handleSearchSubmit} className="relative">
        <div className="flex items-center rounded-3xl border-2 border-primary/30 bg-card px-5 py-4 sm:py-5 shadow-card transition focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/20">
          <Search className="h-6 w-6 text-primary shrink-0 mr-3.5" />
          <input
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Qual produto de beleza você procura?"
            className="w-full bg-transparent text-base sm:text-lg font-semibold text-foreground placeholder:text-muted-foreground outline-none"
            autoFocus
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              aria-label="Limpar texto"
              className="mr-2 grid h-7 w-7 place-items-center rounded-full text-muted-foreground hover:bg-muted"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <button
            type="submit"
            className="rounded-full bg-primary px-4 py-2 text-xs sm:text-sm font-bold text-primary-foreground shadow-soft transition active:scale-95 cursor-pointer shrink-0"
          >
            Buscar
          </button>
        </div>
      </form>

      {/* 2. BOTÃO "ESCANEAR PRODUTO" LOGO ABAIXO */}
      <Link
        to="/escanear"
        className="flex items-center justify-center gap-3 rounded-3xl bg-primary py-4 sm:py-4.5 font-display text-lg sm:text-xl font-bold text-primary-foreground shadow-soft transition hover:opacity-95 active:scale-[0.98]"
      >
        <Camera className="h-7 w-7" />
        <span>Escanear produto</span>
        <Sparkles className="h-5 w-5" />
      </Link>

      {/* 3. "MINHAS BUSCAS" (Últimas 20, com apagar uma ou todas) */}
      <section className="space-y-3 pt-2" aria-labelledby="minhas-buscas-heading">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            <h2
              id="minhas-buscas-heading"
              className="text-base sm:text-lg font-bold text-foreground"
            >
              Minhas buscas
            </h2>
            {history.length > 0 && (
              <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-bold text-secondary-foreground">
                {history.length}
              </span>
            )}
          </div>

          {history.length > 0 && (
            <button
              type="button"
              onClick={clearHistory}
              className="flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-destructive transition py-1 px-2 rounded-lg hover:bg-muted cursor-pointer"
              title="Apagar todas as buscas"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Limpar tudo</span>
            </button>
          )}
        </div>

        {history.length > 0 ? (
          <div className="space-y-1.5">
            {history.map((item, index) => (
              <div
                key={`${item}-${index}`}
                className="group flex items-center justify-between rounded-2xl bg-card border border-border px-4 py-3 shadow-xs hover:border-primary/40 hover:bg-muted/40 transition"
              >
                {/* Clique para buscar */}
                <button
                  type="button"
                  onClick={() => handleHistoryClick(item)}
                  className="flex items-center gap-3 flex-1 min-w-0 text-left cursor-pointer"
                >
                  <Search className="h-4 w-4 text-muted-foreground group-hover:text-primary shrink-0 transition" />
                  <span className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition">
                    {item}
                  </span>
                </button>

                <div className="flex items-center gap-1 shrink-0 ml-2">
                  <button
                    type="button"
                    onClick={() => handleHistoryClick(item)}
                    className="grid h-7 w-7 place-items-center text-muted-foreground hover:text-primary hover:bg-muted rounded-full"
                    title="Buscar agora"
                  >
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                  {/* Apagar item individual */}
                  <button
                    type="button"
                    onClick={() => removeSearch(item)}
                    aria-label={`Apagar busca "${item}"`}
                    title="Apagar esta busca"
                    className="grid h-7 w-7 place-items-center rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/15 transition cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-border bg-card/60 p-6 text-center space-y-2">
            <p className="text-sm font-semibold text-foreground">Nenhuma busca recente</p>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
              Digite o nome de um produto na barra de pesquisa acima ou toque em Escanear produto.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
