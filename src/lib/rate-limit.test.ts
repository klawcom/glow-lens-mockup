import { describe, it, expect } from "vitest";
import { checkRateLimit } from "./rate-limit";

describe("limite de identificações", () => {
  it("permite 10 por hora e bloqueia a 11ª", () => {
    const now = 1_000_000;
    for (let i = 0; i < 10; i++) expect(checkRateLimit("u1", now + i).ok).toBe(true);
    expect(checkRateLimit("u1", now + 20).ok).toBe(false);
  });
  it("libera de novo depois de uma hora", () => {
    const now = 5_000_000;
    for (let i = 0; i < 10; i++) checkRateLimit("u2", now);
    expect(checkRateLimit("u2", now + 60 * 60 * 1000 + 1).ok).toBe(true);
  });
});
