import { Link } from "@tanstack/react-router";
import { Flame } from "lucide-react";
import type { Product } from "@/data/products";
import { Stars } from "./Stars";

// Card de produto usado em Início, Busca e Favoritos.
export function ProductCard({ product }: { product: Product }) {
  return (
    <Link
      to="/produto/$id"
      params={{ id: product.id }}
      className="overflow-hidden rounded-2xl bg-card shadow-card transition active:scale-[0.98]"
    >
      <div className="relative aspect-[5/4]">
        <img
          src={product.image}
          alt={product.name}
          loading="lazy"
          width={816}
          height={816}
          className="h-full w-full object-cover"
        />
        {product.viral && (
          <span className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-success px-2 py-0.5 text-xs font-bold text-success-foreground">
            <Flame className="h-3 w-3" /> Viral
          </span>
        )}
      </div>
      <div className="p-3">
        <h3 className="truncate text-base font-semibold text-accent-foreground">{product.name}</h3>
        <Stars rating={product.rating} />
      </div>
    </Link>
  );
}
