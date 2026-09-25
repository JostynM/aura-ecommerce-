import { createContext } from "react";

import type { Product } from "../types/Product";

export type CartItem = Product & {
  quantity: number;
};

export type CartContextType = {
  cartItems: CartItem[];

  addToCart: (
    product: Product,
    quantity?: number
  ) => void;

  removeFromCart: (
    productId: number
  ) => void;

  increaseQuantity: (
    productId: number
  ) => void;

  decreaseQuantity: (
    productId: number
  ) => void;

  clearCart: () => void;

  totalItems: number;

  subtotal: number;
};

export const CartContext =
  createContext<CartContextType | undefined>(
    undefined
  );