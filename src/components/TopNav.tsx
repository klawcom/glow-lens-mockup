// Barra superior fixa e compacta do Glow Lens: Logo, Menus e Ações
import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { Home, Search, Heart, Info, User, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { ThemeToggle } from "@/components/ThemeToggle";
import { APP_CONFIG } from "@/config/app";

export function TopNav() {
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);

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

  // Handler para clique no perfil
  const handleProfileClick = () => {
    if (currentPath === "/") {
      window.dispatchEvent(new CustomEvent("toggle-glowlens-auth"));
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else if (isOwner) {
      navigate({ to: "/adm" });
    } else {
      navigate({ to: "/" });
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent("toggle-glowlens-auth"));
      }, 100);
    }
  };

  const navItemClass = (isActive: boolean) =>
    `flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-bold transition active:scale-95 ${
      isActive
        ? "bg-primary text-primary-foreground shadow-soft"
        : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
    }`;

  const isHomeActive = currentPath === "/";
  const isSearchActive = currentPath.startsWith("/buscar");
  const isFavsActive = currentPath.startsWith("/favoritos");
  const isAboutActive = currentPath.startsWith("/sobre");
  const isAdmActive = currentPath.startsWith("/adm") || currentPath.startsWith("/admin");

  return (
    <header className="fixed top-0 inset-x-0 z-40 border-b border-border bg-card/95 backdrop-blur-md shadow-xs pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex h-14 max-w-md items-center justify-between px-3 sm:px-4 gap-1">
        {/* LOGO COMPACTO */}
        <Link
          to="/"
          className="flex items-center tracking-tight leading-none shrink-0 group focus:outline-none"
          aria-label={`${APP_CONFIG.name} — Início`}
        >
          <span className="font-display font-extrabold text-lg text-[var(--logo-1)] group-hover:opacity-90 transition">
            {logoFirst}
          </span>
          <span className="font-display font-extrabold text-lg text-[var(--logo-2)] ml-0.5 group-hover:opacity-90 transition">
            {logoSecond}
          </span>
        </Link>

        {/* MENUS PRINCIPAIS: INÍCIO, BUSCAR, FAVORITOS */}
        <nav className="flex items-center gap-0.5 sm:gap-1" aria-label="Navegação principal">
          <Link to="/" className={navItemClass(isHomeActive)} aria-label="Início" title="Início">
            <Home className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">Início</span>
          </Link>

          <Link
            to="/buscar"
            className={navItemClass(isSearchActive)}
            aria-label="Buscar produtos"
            title="Buscar"
          >
            <Search className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">Buscar</span>
          </Link>

          <Link
            to="/favoritos"
            className={navItemClass(isFavsActive)}
            aria-label="Favoritos"
            title="Favoritos"
          >
            <Heart className={`h-4 w-4 shrink-0 ${isFavsActive ? "fill-current" : ""}`} />
            <span className="hidden sm:inline">Favoritos</span>
          </Link>
        </nav>

        {/* AÇÕES: TEMA, SOBRE E PERFIL/LOGIN */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          <ThemeToggle compact />

          {/* Link Sobre */}
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

          {/* Botão de Perfil / Login */}
          <button
            type="button"
            onClick={handleProfileClick}
            aria-label={
              session
                ? isOwner
                  ? "Painel do Dono"
                  : `Conta (${session.user.email})`
                : "Entrar ou Criar conta"
            }
            title={session ? session.user.email : "Entrar"}
            className={`relative grid h-8 w-8 place-items-center rounded-full transition active:scale-95 cursor-pointer ${
              isAdmActive
                ? "bg-primary text-primary-foreground shadow-soft ring-2 ring-primary/40"
                : "bg-secondary text-secondary-foreground hover:bg-muted"
            }`}
          >
            {isOwner ? (
              <ShieldCheck className="h-4 w-4 text-primary" />
            ) : (
              <User className="h-4 w-4" />
            )}
            {/* Indicador de status logado */}
            {session && (
              <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-success ring-1 ring-card" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
