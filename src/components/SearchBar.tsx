import { Search } from "lucide-react";

export function SearchBar(props: {
  value?: string;
  onChange?: (v: string) => void;
  onFocus?: () => void;
  autoFocus?: boolean;
}) {
  return (
    <label className="flex items-center gap-3 rounded-full border-2 bg-muted px-5 py-3.5">
      <Search className="h-5 w-5 text-link" />
      <input
        value={props.value}
        onChange={(e) => props.onChange?.(e.target.value)}
        onFocus={props.onFocus}
        autoFocus={props.autoFocus}
        placeholder="Buscar produtos de beleza"
        className="w-full bg-transparent text-base text-foreground outline-none placeholder:text-link/80"
      />
    </label>
  );
}
