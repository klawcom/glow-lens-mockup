import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { checkRateLimit } from "./rate-limit";
import { identifyWithAi, searchOpenBeautyFacts, type AiIdentification, type OffProduct } from "./identify.server";

export type IdentifyResult =
  | { status: "ok"; ai: AiIdentification; off: OffProduct | null }
  | { status: "retake"; ai?: AiIdentification }
  | { status: "error"; message: string };

export const identifyProduct = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({ image: z.string().startsWith("data:image/").max(3_000_000), deviceId: z.string().min(8).max(64) }).parse(d),
  )
  .handler(async ({ data }): Promise<IdentifyResult> => {
    const ip = getRequestHeader("cf-connecting-ip") ?? getRequestHeader("x-forwarded-for") ?? "";
    const limit = checkRateLimit(`${data.deviceId}|${ip}`);
    if (!limit.ok) {
      return { status: "error", message: `Você já fez 10 identificações nesta hora. Tente de novo em ${limit.retryMin} min.` };
    }
    let ai: AiIdentification;
    try {
      ai = await identifyWithAi(data.image);
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode;
      console.error(e);
      if (status === 429) return { status: "error", message: "Muitas pessoas usando agora. Tente em alguns instantes." };
      if (status === 402 || status === 403) return { status: "error", message: "A identificação por IA está indisponível no momento." };
      return { status: "error", message: "Não conseguimos analisar a foto. Tente novamente." };
    }
    if (!ai.photoOk || ai.confidence === "baixo" || !ai.name) return { status: "retake", ai };
    const off = await searchOpenBeautyFacts(`${ai.brand} ${ai.name}`.trim());
    return { status: "ok", ai, off };
  });
