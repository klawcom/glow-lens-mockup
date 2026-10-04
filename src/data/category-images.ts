// Imagens genéricas por categoria (não copiamos fotos de terceiros).
import batom from "@/assets/p-batom.jpg";
import serum from "@/assets/p-serum.jpg";
import perfume from "@/assets/p-perfume.jpg";
import cabelo from "@/assets/p-cabelo.jpg";
import corpo from "@/assets/p-corpo.jpg";

const MAP: Record<string, string> = { Pele: serum, Cabelo: cabelo, Maquiagem: batom, Perfume: perfume, Corpo: corpo };
export const categoryImage = (c: string) => MAP[c] ?? serum;
