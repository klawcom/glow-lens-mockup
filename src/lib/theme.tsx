// Controle do tema: salva a escolha no aparelho (localStorage)
// e aplica no <html data-theme="...">.
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { DEFAULT_THEME, THEMES, THEME_STORAGE_KEY, type ThemeId } from "@/theme/themes";

const Ctx = createContext<{ theme: ThemeId; setTheme: (t: ThemeId) => void }>({
  theme: DEFAULT_THEME,
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeId>(DEFAULT_THEME);

  useEffect(() => {
    const saved = localStorage.getItem(THEME_STORAGE_KEY) as ThemeId | null;
    if (saved && THEMES.some((t) => t.id === saved)) setTheme(saved);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  return <Ctx.Provider value={{ theme, setTheme }}>{children}</Ctx.Provider>;
}

export const useTheme = () => useContext(Ctx);
