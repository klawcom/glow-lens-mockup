// Limite simples por janela deslizante (em memória do servidor).
export const LIMIT_PER_HOUR = 10;
const WINDOW_MS = 60 * 60 * 1000;
const hits = new Map<string, number[]>();

export function checkRateLimit(key: string, now = Date.now(), limit = LIMIT_PER_HOUR) {
  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= limit) {
    hits.set(key, recent);
    const retryMin = Math.ceil((WINDOW_MS - (now - (recent[0] ?? now))) / 60000);
    return { ok: false as const, retryMin };
  }
  recent.push(now);
  hits.set(key, recent);
  return { ok: true as const, remaining: limit - recent.length };
}
