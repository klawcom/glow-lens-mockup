// Tela 3 — Escanear (somente layout).
// TODO: conectar câmera, leitor de código de barras/QR e reconhecimento por IA.
import { createFileRoute } from "@tanstack/react-router";
import { Barcode, Camera, ImageUp, QrCode } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";

export const Route = createFileRoute("/escanear")({
  head: () => ({
    meta: [
      { title: "Escanear produto — Glow Lens" },
      { name: "description", content: "Escaneie o código de barras, QR code ou envie uma foto do produto." },
      { property: "og:title", content: "Escanear produto — Glow Lens" },
      { property: "og:description", content: "Escaneie um produto de beleza para ver a ficha completa." },
    ],
  }),
  component: ScanPage,
});

function ScanPage() {
  const btn = "flex flex-col items-center gap-2 rounded-2xl bg-card p-4 text-sm font-semibold text-accent-foreground shadow-card";
  return (
    <>
      <PageHeader title="Escanear" />
      <div className="relative grid aspect-[3/4] place-items-center rounded-3xl border-4 border-dashed border-primary bg-muted">
        <div className="text-center text-muted-foreground">
          <Camera className="mx-auto mb-2 h-12 w-12 text-primary" />
          <p className="font-semibold">Área da câmera</p>
          <p className="text-sm">Aponte para o produto</p>
        </div>
      </div>
      <div className="mt-5 grid grid-cols-3 gap-3">
        <button className={btn}><Barcode className="h-7 w-7 text-primary" />Código de barras</button>
        <button className={btn}><QrCode className="h-7 w-7 text-primary" />QR code</button>
        <button className={btn}><ImageUp className="h-7 w-7 text-primary" />Enviar foto</button>
      </div>
    </>
  );
}
