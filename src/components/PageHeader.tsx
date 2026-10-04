import { Link } from "@tanstack/react-router";
import { Info } from "lucide-react";
import type { ReactNode } from "react";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";

// Topo: logo (ou título) + seletor de tema + link para Sobre.
export function PageHeader({ title }: { title?: ReactNode }) {
  return (
    <header className="flex items-start justify-between pb-5 pt-6">
      {title ? <h1 className="text-3xl font-bold text-accent-foreground">{title}</h1> : <Logo />}
      <div className="flex gap-2">
        <ThemeToggle compact />
        <Link
          to="/sobre"
          aria-label="Sobre"
          className="grid h-11 w-11 place-items-center rounded-full bg-secondary text-secondary-foreground shadow-card"
        >
          <Info className="h-5 w-5" />
        </Link>
      </div>
    </header>
  );
}
