// Limite de 10 consultas de IA por hora por usuário (guardado no banco).
import { LIMIT_PER_HOUR } from "./rate-limit";

export async function consumeAiQuota(chave: string): Promise<{ ok: true } | { ok: false; message: string }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const since = new Date(Date.now() - 3600_000).toISOString();
  const { data, error } = await supabaseAdmin
    .from("ai_usage")
    .select("criado_em")
    .eq("chave", chave)
    .gte("criado_em", since)
    .order("criado_em", { ascending: true });
  if (error) throw error;
  if ((data?.length ?? 0) >= LIMIT_PER_HOUR) {
    const first = new Date(data![0]!.criado_em).getTime();
    const min = Math.max(1, Math.ceil((first + 3600_000 - Date.now()) / 60000));
    return { ok: false, message: `Você já fez ${LIMIT_PER_HOUR} consultas de IA nesta hora. Tente de novo em ${min} min.` };
  }
  await supabaseAdmin.from("ai_usage").insert({ chave });
  return { ok: true };
}
