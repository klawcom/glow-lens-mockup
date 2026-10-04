// Barra superior fixa e compacta do Glow Lens:
// Canto superior esquerdo: Ícone de login/perfil + Logo
// Centro: Menus Início, Buscar, Favoritos (destacando a página atual)
// Canto direito: Tema e Sobre
import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Search, Heart, Info, User, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AuthModal } from "@/components/AuthModal";
import { APP_CONFIG } from "@/config/app";

export function TopNav() {
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;
  const [session, setSession] = useState<Session | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    return () => subscription.unsubscribe();
  }, []);

  const isOwner =
    session?.user?.email?.toLowerCase().trim() === APP_CONFIG.ownerEmail.toLowerCase().trim();

  const [logoFirst, logoSecond] = APP_CONFIG.nameParts;

  const navItemClass = (isActive: boolean) =>
    `flex items-center gap-1 rounded-full px-2 sm:px-2.5 py-1.5 text-xs font-bold transition active:scale-95 ${
      isActive
        ? "bg-primary text-primary-foreground shadow-soft"
        : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
    }`;

  const isHomeActive = currentPath === "/";
  const isSearchActive = currentPath.startsWith("/buscar");
  const isFavsActive = currentPath.startsWith("/favoritos");
  const isAboutActive = currentPath.startsWith("/sobre");

  return (
    <>
      <header className="fixed top-0 inset-x-0 z-40 border-b border-border bg-card/95 backdrop-blur-md shadow-xs pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex h-14 max-w-md items-center justify-between px-2.5 sm:px-4 gap-1">
          {/* CANTO SUPERIOR ESQUERDO: ÍCONE DE LOGIN/CONTA + LOGO */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Ícone de Login / Conta */}
            <button
              type="button"
              onClick={() => setAuthModalOpen(true)}
              aria-label={session ? `Conta (${session.user.email})` : "Entrar ou Criar conta"}
              title={session ? session.user.email : "Entrar ou Criar conta"}
              className="relative grid h-8 w-8 place-items-center rounded-full bg-secondary text-secondary-foreground hover:bg-muted transition active:scale-95 cursor-pointer shadow-xs"
            >
              {session ? (
                isOwner ? (
                  <ShieldCheck className="h-4 w-4 text-primary" />
                ) : (
                  <User className="h-4 w-4 text-primary" />
                )
              ) : (
                <User className="h-4 w-4" />
              )}

              {/* Indicador de status quando logado */}
              {session && (
                <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-success ring-1 ring-card" />
              )}
            </button>

            {/* LOGO COMPACTO */}
            <Link
              to="/"
              className="flex items-center tracking-tight leading-none group focus:outline-none"
              aria-label={`${APP_CONFIG.name} — Início`}
            >
              <span className="font-display font-extrabold text-base sm:text-lg text-[var(--logo-1)] group-hover:opacity-90 transition">
                {logoFirst}
              </span>
              <span className="font-display font-extrabold text-base sm:text-lg text-[var(--logo-2)] ml-0.5 group-hover:opacity-90 transition">
                {logoSecond}
              </span>
            </Link>
          </div>

          {/* CENTRO: MENUS PRINCIPAIS COM DESTAQUE NA PÁGINA ATUAL */}
          <nav className="flex items-center gap-0.5 sm:gap-1" aria-label="Navegação principal">
            <Link to="/" className={navItemClass(isHomeActive)} aria-label="Início" title="Início">
              <Home className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
              <span className="hidden sm:inline">Início</span>
            </Link>

            <Link
              to="/buscar"
              className={navItemClass(isSearchActive)}
              aria-label="Buscar produtos"
              title="Buscar"
            >
              <Search className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
              <span className="hidden sm:inline">Buscar</span>
            </Link>

            <Link
              to="/favoritos"
              className={navItemClass(isFavsActive)}
              aria-label="Favoritos"
              title="Favoritos"
            >
              <Heart
                className={`h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 ${isFavsActive ? "fill-current" : ""}`}
              />
              <span className="hidden sm:inline">Favoritos</span>
            </Link>
          </nav>

          {/* CANTO SUPERIOR DIREITO: TEMA E SOBRE */}
          <div className="flex items-center gap-1 shrink-0">
            <ThemeToggle compact />

            <Link
              to="/sobre"
              aria-label="Sobre o app"
              title="Sobre"
              className={`grid h-8 w-8 place-items-center rounded-full text-xs transition active:scale-95 ${
                isAboutActive
                  ? "bg-primary text-primary-foreground shadow-soft"
                  : "bg-secondary text-secondary-foreground hover:bg-muted"
              }`}
            >
              <Info className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Modal de Autenticação / Perfil (único ponto de login do app) */}
      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </>
  );
}
