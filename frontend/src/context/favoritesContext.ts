import {
  createContext,
} from "react";


export type FavoritesContextType = {
  favoriteProductIds: number[];

  favoritesCount: number;

  loadingFavorites: boolean;

  isFavorite: (
    productId: number
  ) => boolean;

  addToFavorites: (
    productId: number
  ) => Promise<void>;

  removeFromFavorites: (
    productId: number
  ) => Promise<void>;

  toggleFavorite: (
    productId: number
  ) => Promise<void>;

  refreshFavorites:
    () => Promise<void>;
};


export const FavoritesContext =
  createContext<
    FavoritesContextType | undefined
  >(
    undefined
  );