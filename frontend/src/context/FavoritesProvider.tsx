import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import type {
  ReactNode,
} from "react";

import {
  addFavorite,
  getFavorites,
  removeFavorite,
} from "../services/favoriteService";

import {
  FavoritesContext,
} from "./favoritesContext";

import {
  useAuth,
} from "./useAuth";


type FavoritesProviderProps = {
  children: ReactNode;
};


export function FavoritesProvider({
  children,
}: FavoritesProviderProps) {

  const {
    token,
    isAuthenticated,
  } = useAuth();


  const [
    favoriteProductIds,
    setFavoriteProductIds,
  ] = useState<number[]>([]);


  const [
    loadingFavorites,
    setLoadingFavorites,
  ] = useState(false);


  // ========================================
  // REFRESCAR FAVORITOS
  // ========================================

  const refreshFavorites =
    useCallback(
      async () => {

        if (
          !token ||
          !isAuthenticated
        ) {

          setFavoriteProductIds([]);

          setLoadingFavorites(false);

          return;
        }


        try {

          setLoadingFavorites(true);


          const favorites =
            await getFavorites(
              token
            );


          const productIds =
            favorites.map(
              (favorite) =>
                favorite.product_id
            );


          setFavoriteProductIds(
            productIds
          );

        } catch (error) {

          console.error(
            "Error cargando favoritos:",
            error
          );


          setFavoriteProductIds([]);

        } finally {

          setLoadingFavorites(false);

        }

      },
      [
        token,
        isAuthenticated,
      ]
    );


  // ========================================
  // CARGAR FAVORITOS AL INICIAR
  // ========================================

  useEffect(() => {

    let active = true;


    const loadFavorites =
      async () => {

        await Promise.resolve();


        if (!active) {
          return;
        }


        if (
          !token ||
          !isAuthenticated
        ) {

          setFavoriteProductIds([]);

          setLoadingFavorites(false);

          return;
        }


        try {

          setLoadingFavorites(true);


          const favorites =
            await getFavorites(
              token
            );


          if (!active) {
            return;
          }


          const productIds =
            favorites.map(
              (favorite) =>
                favorite.product_id
            );


          setFavoriteProductIds(
            productIds
          );

        } catch (error) {

          console.error(
            "Error cargando favoritos:",
            error
          );


          if (active) {

            setFavoriteProductIds([]);

          }

        } finally {

          if (active) {

            setLoadingFavorites(false);

          }

        }

      };


    void loadFavorites();


    return () => {

      active = false;

    };

  }, [
    token,
    isAuthenticated,
  ]);


  // ========================================
  // SABER SI ES FAVORITO
  // ========================================

  const isFavorite =
    useCallback(
      (
        productId: number
      ) => {

        return favoriteProductIds.includes(
          productId
        );

      },
      [
        favoriteProductIds,
      ]
    );


  // ========================================
  // AGREGAR
  // ========================================

  const addToFavorites =
    useCallback(
      async (
        productId: number
      ) => {

        if (!token) {

          throw new Error(
            "Debes iniciar sesión para guardar favoritos."
          );

        }


        await addFavorite(
          token,
          productId
        );


        setFavoriteProductIds(
          (current) => {

            if (
              current.includes(
                productId
              )
            ) {

              return current;

            }


            return [
              ...current,
              productId,
            ];

          }
        );

      },
      [
        token,
      ]
    );


  // ========================================
  // ELIMINAR
  // ========================================

  const removeFromFavorites =
    useCallback(
      async (
        productId: number
      ) => {

        if (!token) {

          throw new Error(
            "Debes iniciar sesión."
          );

        }


        await removeFavorite(
          token,
          productId
        );


        setFavoriteProductIds(
          (current) =>
            current.filter(
              (id) =>
                id !== productId
            )
        );

      },
      [
        token,
      ]
    );


  // ========================================
  // ALTERNAR
  // ========================================

  const toggleFavorite =
    useCallback(
      async (
        productId: number
      ) => {

        const alreadyFavorite =
          favoriteProductIds.includes(
            productId
          );


        if (
          alreadyFavorite
        ) {

          await removeFromFavorites(
            productId
          );

          return;
        }


        await addToFavorites(
          productId
        );

      },
      [
        favoriteProductIds,
        addToFavorites,
        removeFromFavorites,
      ]
    );


  // ========================================
  // VALOR GLOBAL
  // ========================================

  const value =
    useMemo(
      () => ({

        favoriteProductIds,

        favoritesCount:
          favoriteProductIds.length,

        loadingFavorites,

        isFavorite,

        addToFavorites,

        removeFromFavorites,

        toggleFavorite,

        refreshFavorites,

      }),
      [
        favoriteProductIds,
        loadingFavorites,
        isFavorite,
        addToFavorites,
        removeFromFavorites,
        toggleFavorite,
        refreshFavorites,
      ]
    );


  return (

    <FavoritesContext.Provider
      value={value}
    >

      {children}

    </FavoritesContext.Provider>

  );
}