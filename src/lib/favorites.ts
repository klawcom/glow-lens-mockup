// Favoritos salvos no aparelho (localStorage) categorizados: Pele, Cabelo, Maquiagem, Perfume, Corpo, Outros
import { useEffect, useState } from "react";

export type FavoriteCategory = "Pele" | "Cabelo" | "Maquiagem" | "Perfume" | "Corpo" | "Outros";

export const FAVORITE_CATEGORIES: FavoriteCategory[] = [
  "Pele",
  "Cabelo",
  "Maquiagem",
  "Perfume",
  "Corpo",
  "Outros",
];

export interface FavoriteProduct {
  id: string; // id, código de barras ou slug do produto
  nome: string;
  marca?: string;
  categoria: FavoriteCategory;
  foto?: string | null;
  adicionadoEm: string;
}

const FAVORITES_KEY = "glowlens-favorites-v2";
const FAVORITES_EVENT = "glowlens-favorites-change";

function readFavorites(): FavoriteProduct[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeFavorites(items: FavoriteProduct[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(items));
    window.dispatchEvent(new Event(FAVORITES_EVENT));
  } catch {
    // ignora erros de quota
  }
}

export function saveFavorite(product: {
  id: string;
  nome: string;
  marca?: string;
  categoria: FavoriteCategory;
  foto?: string | null;
}): void {
  const current = readFavorites();
  const existingIndex = current.findIndex((item) => item.id === product.id);

  const updatedItem: FavoriteProduct = {
    ...product,
    adicionadoEm: new Date().toISOString(),
  };

  let next: FavoriteProduct[];
  if (existingIndex >= 0) {
    // Atualiza categoria existente
    next = [...current];
    next[existingIndex] = updatedItem;
  } else {
    next = [updatedItem, ...current];
  }

  writeFavorites(next);
}

export function removeFavorite(id: string): void {
  const current = readFavorites();
  const next = current.filter((item) => item.id !== id);
  writeFavorites(next);
}

export function isFavorite(id: string): boolean {
  const current = readFavorites();
  return current.some((item) => item.id === id);
}

export function getFavoriteCategory(id: string): FavoriteCategory | undefined {
  const current = readFavorites();
  const found = current.find((item) => item.id === id);
  return found?.categoria;
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<FavoriteProduct[]>([]);

  useEffect(() => {
    setFavorites(readFavorites());
    const sync = () => setFavorites(readFavorites());
    window.addEventListener(FAVORITES_EVENT, sync);
    return () => window.removeEventListener(FAVORITES_EVENT, sync);
  }, []);

  return {
    favorites,
    isFavorite: (id: string) => favorites.some((f) => f.id === id),
    getCategory: (id: string) => favorites.find((f) => f.id === id)?.categoria,
    addFavorite: saveFavorite,
    removeFavorite,
    ids: favorites.map((f) => f.id),
  };
}
