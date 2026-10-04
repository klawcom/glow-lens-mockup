// Modal para escolher a categoria ao favoritar um produto
import { Heart, X } from "lucide-react";
import { FAVORITE_CATEGORIES, type FavoriteCategory } from "@/lib/favorites";

const CATEGORY_ICONS: Record<FavoriteCategory, string> = {
  Pele: "🌸",
  Cabelo: "💇",
  Maquiagem: "💄",
  Perfume: "🌺",
  Corpo: "🧴",
  Outros: "✨",
};

export function CategoryPickerModal({
  isOpen,
  onClose,
  onSelect,
  productName,
  currentCategory,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (category: FavoriteCategory) => void;
  productName: string;
  currentCategory?: FavoriteCategory;
}) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="category-picker-title"
    >
      <div className="w-full max-w-sm rounded-3xl bg-card p-6 shadow-card border border-border space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-primary/15 text-primary">
              <Heart className="h-5 w-5 fill-current" />
            </div>
            <div>
              <h3 id="category-picker-title" className="font-bold text-base text-foreground">
                Salvar nos Favoritos
              </h3>
              <p className="text-xs text-muted-foreground truncate max-w-[200px]">{productName}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="text-xs font-semibold text-foreground pt-1">
          Escolha uma categoria para organizar:
        </p>

        <div className="grid grid-cols-2 gap-2.5">
          {FAVORITE_CATEGORIES.map((cat) => {
            const isSelected = currentCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  onSelect(cat);
                  onClose();
                }}
                className={`flex items-center gap-2 rounded-2xl p-3 text-xs font-bold transition active:scale-95 text-left border ${
                  isSelected
                    ? "bg-primary text-primary-foreground border-primary shadow-soft"
                    : "bg-muted/70 text-foreground border-border hover:bg-muted hover:border-primary/40"
                }`}
              >
                <span className="text-lg">{CATEGORY_ICONS[cat]}</span>
                <span>{cat}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
