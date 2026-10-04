// Histórico de buscas do usuário salvo no aparelho (localStorage) - últimas 20 buscas
import { useEffect, useState } from "react";

const HISTORY_KEY = "glowlens-search-history";
const HISTORY_EVENT = "glowlens-search-history-change";
const MAX_HISTORY_ITEMS = 20;

function readHistory(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeHistory(items: string[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(items.slice(0, MAX_HISTORY_ITEMS)));
    window.dispatchEvent(new Event(HISTORY_EVENT));
  } catch {
    // ignora erros de quota de storage
  }
}

export function addSearchHistory(query: string): void {
  const trimmed = query.trim();
  if (!trimmed) return;

  const current = readHistory();
  // Remove duplicata prévia (case-insensitive)
  const filtered = current.filter((item) => item.toLowerCase() !== trimmed.toLowerCase());
  // Adiciona ao topo e limita a 20
  const next = [trimmed, ...filtered].slice(0, MAX_HISTORY_ITEMS);
  writeHistory(next);
}

export function removeSearchHistory(query: string): void {
  const current = readHistory();
  const next = current.filter((item) => item.toLowerCase() !== query.toLowerCase().trim());
  writeHistory(next);
}

export function clearSearchHistory(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(HISTORY_KEY);
    window.dispatchEvent(new Event(HISTORY_EVENT));
  } catch {
    // ignora
  }
}

export function useSearchHistory() {
  const [history, setHistory] = useState<string[]>([]);

  useEffect(() => {
    setHistory(readHistory());
    const sync = () => setHistory(readHistory());
    window.addEventListener(HISTORY_EVENT, sync);
    return () => window.removeEventListener(HISTORY_EVENT, sync);
  }, []);

  return {
    history,
    addSearch: addSearchHistory,
    removeSearch: removeSearchHistory,
    clearHistory: clearSearchHistory,
  };
}
