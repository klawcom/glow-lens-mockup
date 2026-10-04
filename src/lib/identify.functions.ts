import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { AiIdentification, OffProduct } from "./identify.server";
import type { Ficha } from "./ficha.server";

export type IdentifyResult =
  | { status: "ok"; ai: AiIdentification; off: OffProduct | null }
  | { status: "retake"; ai?: AiIdentification }
  | { status: "error"; message: string };

const userKey = (deviceId: string) => {
  const ip = getRequestHeader("cf-connecting-ip") ?? getRequestHeader("x-forwarded-for") ?? "";
  return `${deviceId}|${ip.split(",")[0]?.trim()}`;
};

export const identifyProduct = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        image: z.string().startsWith("data:image/").max(3_000_000),
        deviceId: z.string().min(8).max(64),
      })
      .parse(d),
  )
  .handler(async ({ data }): Promise<IdentifyResult> => {
    try {
      const { consumeAiQuota } = await import("./usage.server");
      const { identifyWithAi, searchOpenBeautyFacts } = await import("./identify.server");
      const { friendlyAiMessage } = await import("./ai.server");

      const q = await consumeAiQuota(userKey(data.deviceId));
      if (!q.ok) return { status: "error", message: q.message };

      let ai: AiIdentification;
      try {
        ai = await identifyWithAi(data.image);
      } catch (e) {
        console.error("Erro na identificação com IA:", e);
        return { status: "error", message: friendlyAiMessage(e) };
      }

      if (!ai.photoOk || ai.confidence === "baixo" || !ai.name) return { status: "retake", ai };
      const off = await searchOpenBeautyFacts(`${ai.brand} ${ai.name}`.trim());
      return { status: "ok", ai, off };
    } catch (e) {
      console.error("Erro geral ao identificar produto:", e);
      const { friendlyAiMessage } = await import("./ai.server");
      return { status: "error", message: friendlyAiMessage(e) };
    }
  });

export type FichaResult =
  { status: "ok"; ficha: Ficha; cache: boolean } | { status: "error"; message: string };

export const getFicha = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({ nome: z.string().trim().min(2).max(120), deviceId: z.string().min(8).max(64) })
      .parse(d),
  )
  .handler(async ({ data }): Promise<FichaResult> => {
    const { readCachedFicha, buildFicha, saveFicha, getExampleProductFallback } =
      await import("./ficha.server");
    const { consumeAiQuota } = await import("./usage.server");
    const { friendlyAiMessage } = await import("./ai.server");

    // 1. Tentar ler do cache de 7 dias do banco
    try {
      const cached = await readCachedFicha(data.nome);
      if (cached) return { status: "ok", ficha: cached, cache: true };
    } catch (cacheErr) {
      console.warn("Aviso ao ler cache de fichas:", cacheErr);
    }

    // 2. Verificar se existe correspondência nos produtos de exemplo para fallback
    const exampleFallback = getExampleProductFallback(data.nome);

    // 3. Consumir cota de IA (10 consultas/hora por usuário)
    const q = await consumeAiQuota(userKey(data.deviceId));
    if (!q.ok) {
      // Se a cota foi atingida e temos produto de exemplo, usamos como fallback
      if (exampleFallback) {
        return { status: "ok", ficha: exampleFallback, cache: true };
      }
      return { status: "error", message: q.message };
    }

    // 4. Buscar e construir ficha com IA
    try {
      const ficha = await buildFicha(data.nome);
      await saveFicha(data.nome, ficha);
      return { status: "ok", ficha, cache: false };
    } catch (e) {
      console.error("Falha ao gerar ficha com IA:", e);
      // Fallback para produto de exemplo caso a chamada à IA falhe
      if (exampleFallback) {
        return { status: "ok", ficha: exampleFallback, cache: true };
      }
      return { status: "error", message: friendlyAiMessage(e) };
    }
  });

// Botão do dono: protegido por login e validado no backend com controle de admin
export const refreshTrendingNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

      // Validar no backend se o usuário logado é admin
      const { data: adminRecord } = await supabaseAdmin
        .from("user_roles")
        .select("id")
        .eq("user_id", context.userId)
        .eq("role", "admin")
        .maybeSingle();

      if (!adminRecord) {
        // Se ainda não é admin, verifica se já existe algum admin registrado
        const { count } = await supabaseAdmin
          .from("user_roles")
          .select("id", { count: "exact", head: true })
          .eq("role", "admin");

        if ((count ?? 0) > 0) {
          return { ok: false, message: "Apenas o dono do app pode atualizar." };
        }
        // Primeiro usuário autenticado a solicitar se torna o dono (admin)
        await supabaseAdmin.from("user_roles").insert({ user_id: context.userId, role: "admin" });
      }

      const { refreshTrending } = await import("./trending.server");
      return await refreshTrending();
    } catch (e) {
      console.error("Erro ao executar refreshTrendingNow:", e);
      return {
        ok: false,
        message: "Não foi possível concluir a atualização agora. Tente mais tarde.",
      };
    }
  });
