// Funções do backend e utilitários para modelos de links de afiliados
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { APP_CONFIG } from "@/config/app";

export interface AffiliateStoreConfig {
  loja: string;
  modelo: string;
  ativo: boolean;
  atualizado_em?: string;
}

export const DEFAULT_AFFILIATE_STORES: AffiliateStoreConfig[] = [
  {
    loja: "Amazon.com.br",
    modelo: "https://www.amazon.com.br/s?k={busca}",
    ativo: true,
  },
  {
    loja: "Mercado Livre",
    modelo: "https://lista.mercadolivre.com.br/{busca}",
    ativo: true,
  },
  {
    loja: "AliExpress",
    modelo: "https://www.aliexpress.com/wholesale?SearchText={busca}",
    ativo: true,
  },
  {
    loja: "Shopee",
    modelo: "https://shopee.com.br/search?keyword={busca}",
    ativo: true,
  },
];

// Monta a URL final substituindo {busca} e garantindo https://
export function buildAffiliateUrl(
  modelo: string | undefined | null,
  loja: string,
  searchTerm: string,
): string {
  const defaultStore = DEFAULT_AFFILIATE_STORES.find((s) => s.loja === loja);
  const rawModel =
    modelo?.trim() || defaultStore?.modelo || `https://www.google.com/search?q={busca}`;
  const encodedQuery = encodeURIComponent(searchTerm.trim());

  // Substitui {busca} pelo termo codificado
  let finalUrl = rawModel.replace(/\{busca\}/gi, encodedQuery);

  // Validação estrita: aceita apenas links https://
  if (!finalUrl.toLowerCase().startsWith("https://")) {
    if (defaultStore) {
      finalUrl = defaultStore.modelo.replace(/\{busca\}/gi, encodedQuery);
    } else {
      finalUrl = `https://www.google.com/search?q=${encodedQuery}`;
    }
  }

  return finalUrl;
}

// 1. Consulta pública dos links de afiliados salvos
export const getAffiliateLinks = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ stores: AffiliateStoreConfig[] }> => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data, error } = await supabaseAdmin
        .from("links_afiliados")
        .select("loja, modelo, ativo, atualizado_em");

      if (error || !data || data.length === 0) {
        return { stores: DEFAULT_AFFILIATE_STORES };
      }

      // Mescla com os padrões para garantir que as 4 lojas estejam sempre presentes
      const merged = DEFAULT_AFFILIATE_STORES.map((def) => {
        const found = data.find((d) => d.loja.toLowerCase() === def.loja.toLowerCase());
        if (found) {
          return {
            loja: def.loja,
            modelo: found.modelo?.trim() || def.modelo,
            ativo: typeof found.ativo === "boolean" ? found.ativo : true,
            atualizado_em: found.atualizado_em,
          };
        }
        return def;
      });

      return { stores: merged };
    } catch (err) {
      console.warn("Aviso ao carregar links_afiliados:", err);
      return { stores: DEFAULT_AFFILIATE_STORES };
    }
  },
);

// 2. Salva as configurações: exclusivo para o dono, validado no backend
export const saveAffiliateLinks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        stores: z.array(
          z.object({
            loja: z.string().trim().min(1),
            modelo: z
              .string()
              .trim()
              .refine((val) => val.toLowerCase().startsWith("https://"), {
                message: "O modelo deve começar obrigatoriamente com https://",
              })
              .refine((val) => val.includes("{busca}"), {
                message: "O modelo deve conter {busca} onde o termo será inserido.",
              }),
            ativo: z.boolean(),
          }),
        ),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const ownerEmail = APP_CONFIG.ownerEmail.toLowerCase().trim();

      // Validação estrita do Dono no backend
      const { data: userData } = await supabaseAdmin.auth.admin.getUserById(context.userId);
      const userEmail = (
        userData?.user?.email ??
        (context.claims as { email?: string })?.email ??
        ""
      )
        .toLowerCase()
        .trim();

      const isOwner = userEmail === ownerEmail;

      if (!isOwner) {
        return {
          ok: false,
          message: `Acesso negado: apenas o dono (${ownerEmail}) pode salvar os ajustes.`,
        };
      }

      // Salva na tabela links_afiliados
      const rows = data.stores.map((s) => ({
        loja: s.loja,
        modelo: s.modelo.trim(),
        ativo: s.ativo,
        atualizado_em: new Date().toISOString(),
      }));

      const { error: upsertErr } = await supabaseAdmin
        .from("links_afiliados")
        .upsert(rows, { onConflict: "loja" });

      if (upsertErr) {
        console.error("Erro ao salvar links_afiliados:", upsertErr);
        return {
          ok: false,
          message: `Erro ao salvar no banco: ${upsertErr.message}`,
        };
      }

      return {
        ok: true,
        message: "Modelos de links de afiliados salvos com sucesso!",
      };
    } catch (e: unknown) {
      console.error("Exceção ao salvar links de afiliados:", e);
      return {
        ok: false,
        message: (e as Error)?.message || "Erro inesperado ao salvar ajustes.",
      };
    }
  });
