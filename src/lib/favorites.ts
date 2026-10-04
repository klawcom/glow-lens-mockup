// Favoritos salvos no aparelho (localStorage).
// TODO: quando houver login/backend, sincronizar favoritos com a conta do usuário.
import { useEffect, useState } from "react";

const KEY = "glowlens-favorites";
const EVENT = "glowlens-favorites-change";

function read(): string[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

export function useFavorites() {
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    setIds(read());
    const sync = () => setIds(read());
    window.addEventListener(EVENT, sync);
    return () => window.removeEventListener(EVENT, sync);
  }, []);

  const toggle = (id: string) => {
    const cur = read();
    const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
    localStorage.setItem(KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(EVENT));
  };

  return { ids, isFavorite: (id: string) => ids.includes(id), toggle };
}
