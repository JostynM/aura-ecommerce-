export type Product = {
  id: number;
  slug: string;

  brand: string;
  name: string;

  price: number;
  rating: number;

  image: string;

  type: "arabe" | "disenador";
  gender: "hombre" | "mujer" | "unisex";

  stock: number;
  size: string;

  description: string;

  topNotes: string[];
  heartNotes: string[];
  baseNotes: string[];
};