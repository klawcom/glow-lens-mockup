// Seletor de tema. `compact` = botão pequeno do topo; senão mostra os dois temas.
import { Palette } from "lucide-react";
import { useTheme } from "@/lib/theme";
import { THEMES } from "@/theme/themes";

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, setTheme } = useTheme();

  if (compact) {
    const next = theme === "barbie" ? "candy" : "barbie";
    return (
      <button
        onClick={() => setTheme(next)}
        aria-label="Trocar tema"
        className="grid h-11 w-11 place-items-center rounded-full bg-accent text-accent-foreground shadow-card"
      >
        <Palette className="h-5 w-5" />
      </button>
    );
  }

  return (
    <div className="grid gap-3">
      {THEMES.map((t) => (
        <button
          key={t.id}
          onClick={() => setTheme(t.id)}
          className={`flex items-center justify-between rounded-2xl border-2 bg-card p-4 text-left transition ${
            theme === t.id ? "border-primary shadow-soft" : "border-border"
          }`}
        >
          <span className="font-display text-lg font-semibold">{t.label}</span>
          <span className="flex gap-1">
            {t.swatch.map((c) => (
              <span key={c} className="h-6 w-6 rounded-full border border-border" style={{ background: c }} />
            ))}
          </span>
        </button>
      ))}
    </div>
  );
}
