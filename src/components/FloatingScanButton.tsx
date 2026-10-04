// Botão redondo da câmera (Escanear), flutuando centralizado no rodapé, respeitando a área segura do celular
import { Link, useRouterState } from "@tanstack/react-router";
import { Camera } from "lucide-react";

export function FloatingScanButton() {
  const routerState = useRouterState();
  const isScanActive = routerState.location.pathname.startsWith("/escanear");

  return (
    <div className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 z-30 pointer-events-none">
      <Link
        to="/escanear"
        aria-label="Escanear produto"
        title="Escanear produto com câmera"
        className={`pointer-events-auto group relative flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_8px_25px_rgba(255,46,147,0.45)] transition hover:scale-105 active:scale-95 cursor-pointer ring-4 ring-card ${
          isScanActive ? "ring-primary/40 ring-offset-2 ring-offset-background" : ""
        }`}
      >
        <Camera className="h-7 w-7 transition group-hover:scale-110" />
        <span className="sr-only">Escanear</span>
      </Link>
    </div>
  );
}
