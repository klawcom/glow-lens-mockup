import { CATEGORIES, type Category } from "@/data/products";

// Cores de cada pílula (tokens do tema).
const tone: Record<Category, string> = {
  Pele: "bg-success text-success-foreground",
  Cabelo: "bg-secondary text-secondary-foreground",
  Maquiagem: "bg-accent text-accent-foreground",
  Perfume: "bg-secondary text-secondary-foreground",
  Corpo: "bg-accent text-accent-foreground",
};

export function CategoryPills({
  active,
  onChange,
}: {
  active: Category | null;
  onChange: (c: Category | null) => void;
}) {
  return (
    <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5">
      {CATEGORIES.map((c) => (
        <button
          key={c}
          onClick={() => onChange(active === c ? null : c)}
          className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${tone[c]} ${
            active === c ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""
          }`}
        >
          {c}
        </button>
      ))}
    </div>
  );
}
