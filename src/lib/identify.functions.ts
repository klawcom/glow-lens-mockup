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
      const { APP_CONFIG } = await import("@/config/app");
      const ownerEmail = APP_CONFIG.ownerEmail.toLowerCase().trim();

      // Buscar os dados do usuário autenticado no Supabase Auth
      const { data: userData } = await supabaseAdmin.auth.admin.getUserById(context.userId);
      const userEmail = (
        userData?.user?.email ??
        (context.claims as { email?: string })?.email ??
        ""
      )
        .toLowerCase()
        .trim();

      const isOwner = userEmail === ownerEmail;

      // Verificar permissão no banco na tabela user_roles
      const { data: adminRecord } = await supabaseAdmin
        .from("user_roles")
        .select("id")
        .eq("user_id", context.userId)
        .eq("role", "admin")
        .maybeSingle();

      if (isOwner) {
        // Se for o e-mail do dono configurado, garante o papel de admin
        if (!adminRecord) {
          await supabaseAdmin
            .from("user_roles")
            .upsert({ user_id: context.userId, role: "admin" }, { onConflict: "user_id,role" });
        }
      } else if (!adminRecord) {
        return {
          ok: false,
          message: `Apenas o dono do app (${ownerEmail}) pode atualizar.`,
        };
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

export type BarcodeResult =
  | { status: "ok"; name: string; brand?: string; foto?: string | null }
  | { status: "not_found" }
  | { status: "error"; message: string };

export const resolveBarcode = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        code: z.string().trim().min(4).max(30),
        deviceId: z.string().min(8).max(64),
      })
      .parse(d),
  )
  .handler(async ({ data }): Promise<BarcodeResult> => {
    const cleanCode = data.code.trim();

    // 1. Consulta Open Beauty Facts
    try {
      const res = await fetch(
        `https://world.openbeautyfacts.org/api/v2/product/${encodeURIComponent(cleanCode)}.json`,
        { headers: { Accept: "application/json" } },
      );
      if (res.ok) {
        const json = await res.json();
        if (json.status === 1 && json.product) {
          const p = json.product;
          const name =
            p.product_name_pt || p.product_name || p.product_name_en || p.generic_name || "";
          const brand = p.brands || p.brand_owner || "";
          if (name) {
            const fullName = `${brand} ${name}`.trim();
            const foto = p.image_front_url || p.image_url || p.image_front_small_url || null;
            return { status: "ok", name: fullName, brand, foto };
          }
        }
      }
    } catch (err) {
      console.warn("Erro ao consultar Open Beauty Facts:", err);
    }

    // 2. Se não achou na Open Beauty Facts, usa a IA com busca na web
    try {
      const { consumeAiQuota } = await import("./usage.server");
      const { runAi, parseJson, AI_RULES } = await import("./ai.server");

      const q = await consumeAiQuota(userKey(data.deviceId));
      if (!q.ok) {
        return { status: "error", message: q.message };
      }

      const text = await runAi({
        webSearch: true,
        messages: [
          {
            role: "user",
            content: `Pesquise na web pelo código de barras EAN ou UPC "${cleanCode}" de produto de beleza ou cosmético.
${AI_RULES}
Identifique se existe um produto correspondente.
Retorne SOMENTE um JSON no formato:
{"encontrado": true|false, "nome": "nome do produto", "marca": "marca"}
Se não encontrar um produto real correspondente, retorne {"encontrado": false}.`,
          },
        ],
      });

      const parsed = parseJson<{ encontrado?: boolean; nome?: string; marca?: string }>(text);
      if (parsed.encontrado && parsed.nome) {
        const brand = parsed.marca?.trim() || "";
        const fullName = `${brand} ${parsed.nome}`.trim();
        return { status: "ok", name: fullName, brand };
      }
      return { status: "not_found" };
    } catch (err) {
      console.error("Erro na busca de código de barras com IA:", err);
      return { status: "not_found" };
    }
  });

export type UrlProductResult =
  { status: "ok"; name: string } | { status: "not_found" } | { status: "error"; message: string };

function isPrivateIpOrHost(hostname: string): boolean {
  const host = hostname.toLowerCase().trim();
  if (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "0.0.0.0" ||
    host === "::1" ||
    host === "169.254.169.254"
  ) {
    return true;
  }
  if (
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host.endsWith(".lan") ||
    host.endsWith(".home") ||
    host.endsWith(".corp")
  ) {
    return true;
  }
  // Bloquear faixas privadas IPv4
  if (/^10\./.test(host)) return true;
  if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host)) return true;
  if (/^192\.168\./.test(host)) return true;
  if (/^127\./.test(host)) return true;
  if (/^169\.254\./.test(host)) return true;

  return false;
}

export const resolveProductFromUrl = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        url: z.string().trim().url(),
        deviceId: z.string().min(8).max(64),
      })
      .parse(d),
  )
  .handler(async ({ data }): Promise<UrlProductResult> => {
    // 1. Apenas links HTTPS
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(data.url);
    } catch {
      return { status: "error", message: "Endereço inválido." };
    }

    if (parsedUrl.protocol !== "https:") {
      return {
        status: "error",
        message: "Apenas links seguros com HTTPS são permitidos para consulta.",
      };
    }

    // 2. Bloquear endereços internos (SSRF Protection)
    if (isPrivateIpOrHost(parsedUrl.hostname)) {
      return {
        status: "error",
        message: "Endereços de rede interna ou restrita não são permitidos.",
      };
    }

    // 3. Buscar a página com tempo máximo (6 segundos)
    let pageHtml = "";
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const response = await fetch(data.url, {
        signal: controller.signal,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml",
        },
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        return {
          status: "error",
          message: "Não foi possível acessar a página informada no QR code.",
        };
      }

      // Lê até 120 KB para extrair o cabeçalho/título
      const text = await response.text();
      pageHtml = text.slice(0, 120_000);
    } catch (err: unknown) {
      if ((err as { name?: string })?.name === "AbortError") {
        return {
          status: "error",
          message: "O site demorou muito para responder (tempo limite excedido).",
        };
      }
      return {
        status: "error",
        message: "Não foi possível carregar a página do link.",
      };
    }

    // 4. Extrair título e metadados
    const titleMatch = pageHtml.match(/<title[^>]*>([^<]+)<\/title>/i);
    const ogTitleMatch =
      pageHtml.match(/<meta\s+[^>]*property=["']og:title["']\s+content=["']([^"']+)["']/i) ||
      pageHtml.match(/<meta\s+[^>]*content=["']([^"']+)["']\s+property=["']og:title["']/i);
    const ogDescMatch =
      pageHtml.match(/<meta\s+[^>]*property=["']og:description["']\s+content=["']([^"']+)["']/i) ||
      pageHtml.match(/<meta\s+[^>]*name=["']description["']\s+content=["']([^"']+)["']/i);

    const title = ogTitleMatch?.[1] || titleMatch?.[1] || "";
    const description = ogDescMatch?.[1] || "";
    const combinedSnippet = `${title} - ${description}`.trim();

    if (!combinedSnippet) {
      return { status: "not_found" };
    }

    // 5. Utiliza IA para identificar o produto a partir dos metadados
    try {
      const { consumeAiQuota } = await import("./usage.server");
      const { runAi, parseJson, AI_RULES } = await import("./ai.server");

      const q = await consumeAiQuota(userKey(data.deviceId));
      if (!q.ok) {
        const cleanFallback = title.split(/[|\-–—]/)[0].trim();
        if (cleanFallback.length >= 3) {
          return { status: "ok", name: cleanFallback };
        }
        return { status: "error", message: q.message };
      }

      const aiText = await runAi({
        messages: [
          {
            role: "user",
            content: `A partir das informações extraídas da página (${parsedUrl.hostname}):
Título: "${title}"
Descrição: "${description}"

Identifique se é uma página sobre um produto de beleza, maquiagem ou cosmético.
${AI_RULES}
Se for um produto de beleza, extraia o nome do produto e a marca.
Retorne SOMENTE um JSON:
{"encontrado": true|false, "nome": "nome do produto", "marca": "marca"}
Se não for um produto de beleza, retorne {"encontrado": false}.`,
          },
        ],
      });

      const parsed = parseJson<{ encontrado?: boolean; nome?: string; marca?: string }>(aiText);
      if (parsed.encontrado && parsed.nome) {
        const brand = parsed.marca?.trim() || "";
        const fullName = `${brand} ${parsed.nome}`.trim();
        return { status: "ok", name: fullName };
      }

      const cleanFallback = title.split(/[|\-–—]/)[0].trim();
      if (cleanFallback.length >= 4) {
        return { status: "ok", name: cleanFallback };
      }

      return { status: "not_found" };
    } catch {
      const cleanFallback = title.split(/[|\-–—]/)[0].trim();
      if (cleanFallback.length >= 4) {
        return { status: "ok", name: cleanFallback };
      }
      return { status: "not_found" };
    }
  });
