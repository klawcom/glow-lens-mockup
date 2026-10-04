// Chamado 1x por dia pelo agendador do banco.
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/cron/trending")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = /^Bearer (\S+)$/.exec(request.headers.get("authorization") ?? "")?.[1];
        if (!token) return new Response("Unauthorized", { status: 401 });
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data } = await supabaseAdmin
          .from("app_config")
          .select("valor")
          .eq("chave", "cron_token")
          .maybeSingle();
        const { createHash, timingSafeEqual } = await import("node:crypto");
        const h = (v: string) => createHash("sha256").update(v).digest();
        if (!data?.valor || !timingSafeEqual(h(token), h(data.valor)))
          return new Response("Unauthorized", { status: 401 });
        const { refreshTrending } = await import("@/lib/trending.server");
        const result = await refreshTrending();
        return Response.json(result, { status: result.ok ? 200 : 500 });
      },
    },
  },
});
