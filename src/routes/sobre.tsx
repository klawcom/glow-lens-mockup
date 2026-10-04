// Tela 6 — Sobre + seletor de tema.
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { ThemeToggle } from "@/components/ThemeToggle";
import { APP_CONFIG } from "@/config/app";
import icon from "@/assets/glow-lens-icon.png.asset.json";

export const Route = createFileRoute("/sobre")({
  head: () => ({
    meta: [
      { title: "Sobre — Glow Lens" },
      { name: "description", content: "Conheça o Glow Lens e escolha o tema de cores do app." },
      { property: "og:title", content: "Sobre — Glow Lens" },
      { property: "og:description", content: "Conheça o Glow Lens." },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <>
      <PageHeader title="Sobre" />
      <div className="space-y-6">
        <div className="flex items-center gap-4 rounded-3xl bg-card p-5 shadow-card">
          <img src={icon.url} alt={APP_CONFIG.name} className="h-20 w-20 rounded-2xl" />
          <p className="text-muted-foreground">
            O <b className="text-foreground">{APP_CONFIG.name}</b> mostra os produtos de beleza mais famosos do momento no {APP_CONFIG.country}, com notas, prós e contras e onde comprar.
          </p>
        </div>
        <div>
          <h2 className="mb-3 text-xl font-semibold">Tema de cores</h2>
          <ThemeToggle />
        </div>
      </div>
    </>
  );
}
