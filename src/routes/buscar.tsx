// Tela 2 — Busca por nome, marca ou categoria.
// TODO: trocar o filtro local por busca na API.
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { SearchBar } from "@/components/SearchBar";
import { ProductCard } from "@/components/ProductCard";
import { PRODUCTS } from "@/data/products";

export const Route = createFileRoute("/buscar")({
  head: () => ({
    meta: [
      { title: "Buscar produtos — Glow Lens" },
      { name: "description", content: "Busque produtos de beleza por nome, marca ou categoria." },
      { property: "og:title", content: "Buscar produtos — Glow Lens" },
      { property: "og:description", content: "Busque produtos de beleza por nome, marca ou categoria." },
    ],
  }),
  component: SearchPage,
});

const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

function SearchPage() {
  const [q, setQ] = useState("");
  const results = PRODUCTS.filter((p) => norm(`${p.name} ${p.brand} ${p.category}`).includes(norm(q)));
  return (
    <>
      <PageHeader title="Buscar" />
      <SearchBar value={q} onChange={setQ} autoFocus />
      <p className="mb-3 mt-4 text-sm font-semibold text-muted-foreground">{results.length} resultado(s)</p>
      {results.length ? (
        <div className="grid grid-cols-2 gap-3">
          {results.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      ) : (
        <p className="rounded-2xl bg-card p-6 text-center text-muted-foreground">Nada encontrado. Tente outra palavra.</p>
      )}
    </>
  );
}
