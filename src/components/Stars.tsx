import { Star } from "lucide-react";

// Nota em estrelas (0 a 5).
export function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1 text-link">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={`h-3.5 w-3.5 ${rating >= i - 0.3 ? "fill-current" : "opacity-40"}`} />
      ))}
      <span className="ml-1 text-xs font-semibold text-muted-foreground">{rating.toFixed(1)}</span>
    </div>
  );
}
