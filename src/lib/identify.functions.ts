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
    z.object({ image: z.string().startsWith("data:image/").max(3_000_000), deviceId: z.string().min(8).max(64) }).parse(d),
  )
  .handler(async ({ data }): Promise<IdentifyResult> => {
    const { consumeAiQuota } = await import("./usage.server");
    const { identifyWithAi, searchOpenBeautyFacts } = await import("./identify.server");
    const { friendlyAiMessage } = await import("./ai.server");
    const q = await consumeAiQuota(userKey(data.deviceId));
    if (!q.ok) return { status: "error", message: q.message };
    let ai: AiIdentification;
    try {
      ai = await identifyWithAi(data.image);
    } catch (e) {
      console.error(e);
      return { status: "error", message: friendlyAiMessage(e) };
    }
    if (!ai.photoOk || ai.confidence === "baixo" || !ai.name) return { status: "retake", ai };
    const off = await searchOpenBeautyFacts(`${ai.brand} ${ai.name}`.trim());
    return { status: "ok", ai, off };
  });

export type FichaResult = { status: "ok"; ficha: Ficha; cache: boolean } | { status: "error"; message: string };

export const getFicha = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ nome: z.string().trim().min(2).max(120), deviceId: z.string().min(8).max(64) }).parse(d))
  .handler(async ({ data }): Promise<FichaResult> => {
    const { readCachedFicha, buildFicha, saveFicha } = await import("./ficha.server");
    const { consumeAiQuota } = await import("./usage.server");
    const { friendlyAiMessage } = await import("./ai.server");
    try {
      const cached = await readCachedFicha(data.nome);
      if (cached) return { status: "ok", ficha: cached, cache: true };
      const q = await consumeAiQuota(userKey(data.deviceId));
      if (!q.ok) return { status: "error", message: q.message };
      const ficha = await buildFicha(data.nome);
      await saveFicha(data.nome, ficha);
      return { status: "ok", ficha, cache: false };
    } catch (e) {
      console.error(e);
      return { status: "error", message: friendlyAiMessage(e) };
    }
  });

// Botão do dono: o primeiro usuário que usar vira dono; depois, só ele.
export const refreshTrendingNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (!isAdmin) {
      const { count } = await supabaseAdmin.from("user_roles").select("id", { count: "exact", head: true }).eq("role", "admin");
      if ((count ?? 0) > 0) return { ok: false, message: "Apenas o dono do app pode atualizar." };
      await supabaseAdmin.from("user_roles").insert({ user_id: context.userId, role: "admin" });
    }
    const { refreshTrending } = await import("./trending.server");
    return refreshTrending();
  });
