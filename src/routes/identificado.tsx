// Ficha do produto identificado por foto (IA + Open Beauty Facts).
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, ExternalLink, Flame, Sparkles, Info } from "lucide-react";
import type { IdentifyResult } from "@/lib/identify.functions";

export const Route = createFileRoute("/identificado")({
  head: () => ({
    meta: [
      { title: "Produto identificado — Glow Lens" },
      { name: "description", content: "Ficha do produto identificado por foto com IA." },
      { property: "og:title", content: "Produto identificado — Glow Lens" },
      { property: "og:description", content: "Veja o que a IA identificou na sua foto." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: IdentifiedPage,
});

type Ok = Extract<IdentifyResult, { status: "ok" }>;

function IdentifiedPage() {
  const [data, setData] = useState<Ok | null | undefined>(undefined);
  useEffect(() => {
    try {
      const stored = JSON.parse(sessionStorage.getItem("glowlens-ai-result") || "null");
      if (stored?.ai?.name) {
        const name = stored.off?.name || `${stored.ai.brand || ""} ${stored.ai.name}`.trim();
        window.location.replace(`/ficha?nome=${encodeURIComponent(name)}`);
        return;
      }
      setData(stored);
    } catch {
      setData(null);
    }
  }, []);
  const box = "rounded-2xl bg-card p-4 shadow-card";

  if (data === undefined) return null;
  if (!data)
    return (
      <div className="space-y-4 pt-10 text-center">
        <p className="font-semibold">Nenhum produto identificado ainda.</p>
        <Link
          to="/escanear"
          className="inline-block rounded-full bg-primary px-5 py-3 font-semibold text-primary-foreground"
        >
          Enviar uma foto
        </Link>
      </div>
    );

  const { ai, off } = data;
  const name = off?.name || ai.name;
  const brand = off?.brand || ai.brand;

  return (
    <div className="space-y-4 pt-5 pb-24">
      <Link
        to="/escanear"
        aria-label="Voltar"
        className="grid h-11 w-11 place-items-center rounded-full bg-card shadow-card"
      >
        <ArrowLeft className="h-5 w-5" />
      </Link>
      {off?.image && (
        <img
          src={off.image}
          alt={name}
          className="aspect-square w-full rounded-3xl bg-card object-contain shadow-card"
        />
      )}
      <div>
        <p className="text-sm font-semibold text-link">
          {[brand, ai.category].filter(Boolean).join(" · ")}
        </p>
        <h1 className="text-3xl font-bold">{name}</h1>
        <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-success px-2.5 py-0.5 text-xs font-bold text-success-foreground">
          <Sparkles className="h-3 w-3" /> Confiança da IA: {ai.confidence}
        </p>
      </div>
      {!off && (
        <p className="flex gap-2 rounded-2xl bg-muted p-3 text-sm text-muted-foreground">
          <Info className="h-4 w-4 shrink-0" /> Não encontramos este produto na Open Beauty Facts.
          Mostrando o que a IA identificou.
        </p>
      )}
      <section className={box}>
        <h2 className="mb-1 flex items-center gap-2 text-lg font-semibold">
          <Flame className="h-5 w-5 text-primary" />
          Por que está em alta
        </h2>
        <p className="text-muted-foreground">{ai.whyTrending}</p>
        <p className="mt-2 text-xs italic text-muted-foreground">
          Gerado por IA, pode conter erros.
        </p>
      </section>
      <section className={box}>
        <h2 className="mb-1 text-lg font-semibold">Quem usa / recomenda</h2>
        <p className="text-muted-foreground">Sem informação confirmada.</p>
      </section>
      {off?.ingredients && (
        <section className={box}>
          <h2 className="mb-1 text-lg font-semibold">Ingredientes</h2>
          <p className="text-sm text-muted-foreground">{off.ingredients}</p>
        </section>
      )}
      {off?.url && (
        <a
          href={off.url}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-between rounded-full bg-primary px-5 py-3 font-semibold text-primary-foreground"
        >
          Ver na Open Beauty Facts <ExternalLink className="h-4 w-4" />
        </a>
      )}
    </div>
  );
}
