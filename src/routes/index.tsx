// Tela 1 — Início
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Camera, Sparkles } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { HomeAuthSection } from "@/components/HomeAuthSection";
import { SearchBar } from "@/components/SearchBar";
import { CategoryPills } from "@/components/CategoryPills";
import { ProductCard } from "@/components/ProductCard";
import { PRODUCTS, type Category } from "@/data/products";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Glow Lens — Produtos de beleza em alta no Brasil" },
      {
        name: "description",
        content:
          "Descubra os produtos de beleza mais famosos do momento: pele, cabelo, maquiagem, perfume e corpo.",
      },
      { property: "og:title", content: "Glow Lens — Produtos de beleza em alta" },
      {
        property: "og:description",
        content: "Os produtos de beleza mais famosos do momento no Brasil.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  const [cat, setCat] = useState<Category | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const navigate = useNavigate();
  const list = PRODUCTS.filter((p) => !cat || p.category === cat);

  return (
    <>
      <PageHeader onProfileClick={() => setAuthOpen((prev) => !prev)} />
      <div className="space-y-5">
        <HomeAuthSection isOpen={authOpen} onToggle={() => setAuthOpen((prev) => !prev)} />
        <SearchBar onFocus={() => navigate({ to: "/buscar" })} />
        <Link
          to="/escanear"
          className="flex items-center justify-center gap-3 rounded-full bg-primary py-4 font-display text-xl font-semibold text-primary-foreground shadow-soft active:scale-[0.98]"
        >
          <Camera className="h-7 w-7" /> Escanear produto <Sparkles className="h-4 w-4" />
        </Link>
        <CategoryPills active={cat} onChange={setCat} />
        <h2 className="flex items-center gap-2 pt-1 text-2xl font-semibold text-link">
          Em alta agora <Sparkles className="h-5 w-5" />
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {list.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </div>
    </>
  );
}
