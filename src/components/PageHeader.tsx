// Título da página (o logo, temas, sobre e perfil ficam na barra superior TopNav fixa)
import type { ReactNode } from "react";

export function PageHeader({ title }: { title?: ReactNode; onProfileClick?: () => void }) {
  if (!title) return null;
  return (
    <div className="pb-3 pt-1">
      <h1 className="text-2xl sm:text-3xl font-bold text-accent-foreground">{title}</h1>
    </div>
  );
}
