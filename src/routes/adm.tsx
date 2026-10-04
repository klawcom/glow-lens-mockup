// Rota /adm: Painel do Administrador do Glow Lens
import { createFileRoute } from "@tanstack/react-router";
import { AdminPanel } from "@/components/AdminPanel";

export const Route = createFileRoute("/adm")({
  head: () => ({
    meta: [
      { title: "Painel do Administrador — Glow Lens" },
      { name: "description", content: "Área administrativa do Glow Lens." },
      { property: "og:title", content: "Painel do Administrador — Glow Lens" },
      { property: "og:description", content: "Área administrativa." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdmPage,
});

function AdmPage() {
  return <AdminPanel currentPath="/adm" />;
}
