// Dados de exemplo FICTÍCIOS. Marcas e pessoas são inventadas.
// TODO: substituir por chamada de API (ex.: getProducts()) mantendo o mesmo formato `Product`.
import batom from "@/assets/p-batom.jpg";
import serum from "@/assets/p-serum.jpg";
import base from "@/assets/p-base.jpg";
import perfume from "@/assets/p-perfume.jpg";
import cabelo from "@/assets/p-cabelo.jpg";
import corpo from "@/assets/p-corpo.jpg";

export const CATEGORIES = ["Pele", "Cabelo", "Maquiagem", "Perfume", "Corpo"] as const;
export type Category = (typeof CATEGORIES)[number];

export type Product = {
  id: string;
  name: string;
  brand: string;
  category: Category;
  rating: number;
  image: string;
  viral: boolean;
  whyTrending: string;
  recommendedBy: { name: string; source: string }[];
  pros: string[];
  cons: string[];
  stores: { name: string; url: string }[];
};

const stores = [
  { name: "Loja Exemplo A", url: "https://example.com" },
  { name: "Loja Exemplo B", url: "https://example.com" },
];

const make = (p: Omit<Product, "stores" | "recommendedBy"> & Partial<Product>): Product => ({
  stores,
  recommendedBy: [
    { name: "Ana Beleza", source: "Vídeo no TikTok" },
    { name: "Revista Fictícia", source: "Lista do mês" },
  ],
  ...p,
});

export const PRODUCTS: Product[] = [
  make({
    id: "batom-hidratante",
    name: "Batom Hidratante",
    brand: "Rosé Lab",
    category: "Maquiagem",
    rating: 4.7,
    image: batom,
    viral: true,
    whyTrending: "Viralizou pelo acabamento cremoso que não resseca.",
    pros: ["Hidrata", "Alta pigmentação"],
    cons: ["Precisa reaplicar após comer"],
  }),
  make({
    id: "serum-facial",
    name: "Sérum Facial",
    brand: "Pura Derme",
    category: "Pele",
    rating: 4.8,
    image: serum,
    viral: true,
    whyTrending: "Queridinho das rotinas de skincare com vitamina C.",
    pros: ["Textura leve", "Pele mais uniforme"],
    cons: ["Preço alto"],
  }),
  make({
    id: "base-liquida",
    name: "Base Líquida",
    brand: "Velvet Co.",
    category: "Maquiagem",
    rating: 4.6,
    image: base,
    viral: true,
    whyTrending: "Muitas cores para peles brasileiras.",
    pros: ["Longa duração", "Muitos tons"],
    cons: ["Pode marcar linhas"],
  }),
  make({
    id: "perfume-feminino",
    name: "Perfume Feminino",
    brand: "Flor de Lis",
    category: "Perfume",
    rating: 4.9,
    image: perfume,
    viral: true,
    whyTrending: "Fragrância floral que fixa o dia todo.",
    pros: ["Ótima fixação", "Frasco lindo"],
    cons: ["Doce demais para alguns"],
  }),
  make({
    id: "shampoo-brilho",
    name: "Shampoo Brilho",
    brand: "Fios de Seda",
    category: "Cabelo",
    rating: 4.5,
    image: cabelo,
    viral: false,
    whyTrending: "Recomendado para cabelos cacheados e ondulados.",
    pros: ["Sem sulfato", "Cheiro suave"],
    cons: ["Rende pouco"],
  }),
  make({
    id: "hidratante-corporal",
    name: "Hidratante Corporal",
    brand: "Pele Nua",
    category: "Corpo",
    rating: 4.6,
    image: corpo,
    viral: true,
    whyTrending: "Absorção rápida, ideal para o calor.",
    pros: ["Não é pegajoso", "Perfume leve"],
    cons: ["Embalagem pequena"],
  }),
  make({
    id: "protetor-solar",
    name: "Protetor Solar FPS 50",
    brand: "Sol Leve",
    category: "Pele",
    rating: 4.8,
    image: serum,
    viral: true,
    whyTrending: "Toque seco e sem efeito branco.",
    pros: ["Toque seco", "Sem cheiro"],
    cons: ["Difícil de achar"],
  }),
  make({
    id: "mascara-capilar",
    name: "Máscara Capilar",
    brand: "Fios de Seda",
    category: "Cabelo",
    rating: 4.7,
    image: cabelo,
    viral: false,
    whyTrending: "Recuperação em 5 minutos, segundo usuárias.",
    pros: ["Resultado rápido", "Maciez"],
    cons: ["Pesa em fios finos"],
  }),
  make({
    id: "gloss-labial",
    name: "Gloss Labial",
    brand: "Rosé Lab",
    category: "Maquiagem",
    rating: 4.4,
    image: batom,
    viral: true,
    whyTrending: 'O efeito "lábio de vidro" voltou com tudo.',
    pros: ["Brilho intenso", "Não gruda"],
    cons: ["Dura pouco"],
  }),
  make({
    id: "body-splash",
    name: "Body Splash Frutal",
    brand: "Flor de Lis",
    category: "Perfume",
    rating: 4.5,
    image: perfume,
    viral: false,
    whyTrending: "Perfume leve e barato para o dia a dia.",
    pros: ["Preço bom", "Refrescante"],
    cons: ["Baixa fixação"],
  }),
  make({
    id: "oleo-corporal",
    name: "Óleo Corporal",
    brand: "Pele Nua",
    category: "Corpo",
    rating: 4.6,
    image: corpo,
    viral: false,
    whyTrending: "Deixa a pele iluminada nas fotos.",
    pros: ["Brilho bonito", "Multiuso"],
    cons: ["Pode manchar roupa"],
  }),
  make({
    id: "corretivo",
    name: "Corretivo Alta Cobertura",
    brand: "Velvet Co.",
    category: "Maquiagem",
    rating: 4.7,
    image: base,
    viral: true,
    whyTrending: "Cobre olheiras sem craquelar.",
    pros: ["Alta cobertura", "Rende muito"],
    cons: ["Poucos tons claros"],
  }),
];

export const getProduct = (id: string) => PRODUCTS.find((p) => p.id === id);
