// Logo em texto (duas linhas), usa o nome do arquivo de configuração.
import { Sparkle } from "lucide-react";
import { APP_CONFIG } from "@/config/app";

export function Logo() {
  const [a, b] = APP_CONFIG.nameParts;
  return (
    <div className="relative font-display font-bold leading-[0.85] text-4xl">
      <span className="block text-[var(--logo-1)]">{a}</span>
      <span className="block pl-8 text-[var(--logo-2)]">{b}</span>
      <Sparkle className="absolute -right-6 -top-1 h-5 w-5 text-[var(--logo-1)]" />
    </div>
  );
}
