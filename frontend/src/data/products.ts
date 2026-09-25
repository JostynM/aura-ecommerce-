import type { Product } from "../types/Product";

export const products: Product[] = [
  {
    id: 1,
    slug: "lattafa-khamrah-qahwa",

    brand: "Lattafa",
    name: "Khamrah Qahwa",

    price: 189,
    rating: 4.8,

    image: "/images/products/khamrah-qahwa.webp",

    type: "arabe",
    gender: "unisex",

    stock: 12,
    size: "100 ml",

    description:
      "Una fragancia cálida, intensa y envolvente con acordes dulces, especiados y orientales. Ideal para quienes buscan una esencia con personalidad y gran presencia.",

    topNotes: [
      "Canela",
      "Cardamomo",
      "Jengibre",
    ],

    heartNotes: [
      "Praliné",
      "Frutas confitadas",
      "Flores blancas",
    ],

    baseNotes: [
      "Café",
      "Vainilla",
      "Benjuí",
      "Tonka",
    ],
  },

  {
    id: 2,
    slug: "dior-sauvage-edp",

    brand: "Dior",
    name: "Sauvage Eau de Parfum",

    price: 459,
    rating: 4.9,

    image: "/images/products/sauvage.webp",

    type: "disenador",
    gender: "hombre",

    stock: 8,
    size: "100 ml",

    description:
      "Una fragancia masculina fresca y sofisticada con una personalidad intensa, pensada para uso versátil y ocasiones especiales.",

    topNotes: [
      "Bergamota",
    ],

    heartNotes: [
      "Pimienta",
      "Lavanda",
    ],

    baseNotes: [
      "Ambroxan",
      "Vainilla",
      "Maderas",
    ],
  },

  {
    id: 3,
    slug: "versace-eros-edp",

    brand: "Versace",
    name: "Eros Eau de Parfum",

    price: 420,
    rating: 4.7,

    image: "/images/products/eros.webp",

    type: "disenador",
    gender: "hombre",

    stock: 5,
    size: "100 ml",

    description:
      "Una fragancia intensa y seductora con acordes frescos, dulces y amaderados, ideal para noches y ocasiones especiales.",

    topNotes: [
      "Menta",
      "Limón",
      "Manzana",
    ],

    heartNotes: [
      "Geranio",
      "Salvia",
    ],

    baseNotes: [
      "Vainilla",
      "Cedro",
      "Vetiver",
    ],
  },

  {
    id: 4,
    slug: "afnan-9pm",

    brand: "Afnan",
    name: "9PM",

    price: 199,
    rating: 4.8,

    image: "/images/products/afnan-9pm.webp",

    type: "arabe",
    gender: "hombre",

    stock: 14,
    size: "100 ml",

    description:
      "Una fragancia dulce, juvenil e intensa, pensada especialmente para noches, salidas y ocasiones donde buscas destacar.",

    topNotes: [
      "Manzana",
      "Canela",
      "Bergamota",
    ],

    heartNotes: [
      "Lavanda",
      "Flor de azahar",
    ],

    baseNotes: [
      "Vainilla",
      "Tonka",
      "Ámbar",
    ],
  },
];