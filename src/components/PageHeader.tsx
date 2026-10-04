import { Link } from "@tanstack/react-router";
import { Info, User } from "lucide-react";
import type { ReactNode } from "react";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";

// Topo: logo (ou título) + seletor de tema + perfil + link para Sobre.
export function PageHeader({
  title,
  onProfileClick,
}: {
  title?: ReactNode;
  onProfileClick?: () => void;
}) {
  return (
    <header className="flex items-start justify-between pb-5 pt-6">
      {title ? <h1 className="text-3xl font-bold text-accent-foreground">{title}</h1> : <Logo />}
      <div className="flex items-center gap-2">
        <ThemeToggle compact />
        {onProfileClick && (
          <button
            type="button"
            onClick={onProfileClick}
            aria-label="Área de login e perfil"
            className="grid h-11 w-11 place-items-center rounded-full bg-secondary text-secondary-foreground shadow-card transition hover:opacity-90 active:scale-95 cursor-pointer"
          >
            <User className="h-5 w-5" />
          </button>
        )}
        <Link
          to="/sobre"
          aria-label="Sobre"
          className="grid h-11 w-11 place-items-center rounded-full bg-secondary text-secondary-foreground shadow-card transition hover:opacity-90 active:scale-95"
        >
          <Info className="h-5 w-5" />
        </Link>
      </div>
    </header>
  );
}
