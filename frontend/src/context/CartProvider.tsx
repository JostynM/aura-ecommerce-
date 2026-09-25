import {
  useEffect,
  useState,
  type ReactNode,
} from "react";

import type { Product } from "../types/Product";

import {
  CartContext,
  type CartItem,
} from "./cartContext";

type CartProviderProps = {
  children: ReactNode;
};

export function CartProvider({
  children,
}: CartProviderProps) {

  const [cartItems, setCartItems] =
    useState<CartItem[]>(() => {

      const savedCart =
        localStorage.getItem("aura-cart");

      if (savedCart) {
        try {
          return JSON.parse(savedCart);
        } catch {
          return [];
        }
      }

      return [];
    });

  useEffect(() => {

    localStorage.setItem(
      "aura-cart",
      JSON.stringify(cartItems)
    );

  }, [cartItems]);

  const addToCart = (
    product: Product,
    quantity = 1
  ) => {

    setCartItems((currentItems) => {

      const existingProduct =
        currentItems.find(
          (item) =>
            item.id === product.id
        );

      if (existingProduct) {

        return currentItems.map(
          (item) => {

            if (
              item.id === product.id
            ) {

              const newQuantity =
                Math.min(
                  item.quantity + quantity,
                  product.stock
                );

              return {
                ...item,
                quantity: newQuantity,
              };
            }

            return item;
          }
        );
      }

      return [
        ...currentItems,
        {
          ...product,
          quantity: Math.min(
            quantity,
            product.stock
          ),
        },
      ];
    });
  };

  const removeFromCart = (
    productId: number
  ) => {

    setCartItems((currentItems) =>
      currentItems.filter(
        (item) =>
          item.id !== productId
      )
    );

  };

  const increaseQuantity = (
    productId: number
  ) => {

    setCartItems((currentItems) =>
      currentItems.map((item) =>
        item.id === productId &&
        item.quantity < item.stock
          ? {
              ...item,
              quantity:
                item.quantity + 1,
            }
          : item
      )
    );

  };

  const decreaseQuantity = (
    productId: number
  ) => {

    setCartItems((currentItems) =>
      currentItems.map((item) =>
        item.id === productId &&
        item.quantity > 1
          ? {
              ...item,
              quantity:
                item.quantity - 1,
            }
          : item
      )
    );

  };

  const clearCart = () => {
    setCartItems([]);
  };

  const totalItems =
    cartItems.reduce(
      (total, item) =>
        total + item.quantity,
      0
    );

  const subtotal =
    cartItems.reduce(
      (total, item) =>
        total +
        item.price *
          item.quantity,
      0
    );

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        removeFromCart,
        increaseQuantity,
        decreaseQuantity,
        clearCart,
        totalItems,
        subtotal,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}