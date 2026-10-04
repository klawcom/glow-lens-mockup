import { Link } from "@tanstack/react-router";
import { Camera, Heart, Home, Search } from "lucide-react";

// Barra fixa inferior (mobile-first).
const item = "flex flex-1 flex-col items-center gap-1 py-2 text-xs font-semibold text-link";
const active = { className: "text-primary [&_svg]:fill-current" };

export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-md rounded-t-3xl border-t bg-card px-4 pb-[env(safe-area-inset-bottom)] shadow-card">
      <div className="flex items-end">
        <Link to="/" className={item} activeProps={active} activeOptions={{ exact: true }}>
          <Home className="h-6 w-6" /> Início
        </Link>
        <Link to="/buscar" className={item} activeProps={active}>
          <Search className="h-6 w-6" /> Buscar
        </Link>
        <Link to="/escanear" className={`${item} -mt-7`}>
          <span className="grid h-16 w-16 place-items-center rounded-full bg-primary text-primary-foreground shadow-soft">
            <Camera className="h-7 w-7" />
          </span>
          Escanear
        </Link>
        <Link to="/favoritos" className={item} activeProps={active}>
          <Heart className="h-6 w-6" /> Favoritos
        </Link>
      </div>
    </nav>
  );
}
