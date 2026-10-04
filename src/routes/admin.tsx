// Rota /admin: Painel do Administrador / Área do Dono do Glow Lens
import { createFileRoute } from "@tanstack/react-router";
import { AdminPanel } from "@/components/AdminPanel";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Área do Dono — Glow Lens" },
      { name: "description", content: "Área restrita do dono do Glow Lens." },
      { property: "og:title", content: "Área do Dono — Glow Lens" },
      { property: "og:description", content: "Área restrita." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminRoutePage,
});

function AdminRoutePage() {
  return <AdminPanel currentPath="/admin" />;
}
