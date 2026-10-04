// Lista de temas disponíveis. As cores reais ficam em src/styles.css
// (blocos [data-theme="..."]). Para criar um tema novo: adicione aqui e lá.
export const THEMES = [
  { id: "barbie", label: "Barbie Inspired", swatch: ["#FF2E93", "#FF8CC6", "#C7F9CC", "#9D4EDD"] },
  { id: "candy", label: "Candy Pastel", swatch: ["#FFD6E8", "#FFE5B4", "#D9F8C4", "#E5D4FF"] },
] as const;

export type ThemeId = (typeof THEMES)[number]["id"];
export const DEFAULT_THEME: ThemeId = "barbie";
export const THEME_STORAGE_KEY = "glowlens-theme";
