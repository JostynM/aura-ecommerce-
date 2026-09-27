import {
  useState,
} from "react";

import {
  Check,
  Heart,
  ShoppingBag,
} from "lucide-react";

import {
  Link,
  useNavigate,
} from "react-router-dom";

import {
  useAuth,
} from "../context/useAuth";

import {
  useCart,
} from "../context/useCart";

import {
  useFavorites,
} from "../context/useFavorites";

import type {
  Product,
} from "../types/Product";

import "./ProductCard.css";


// ==========================================
// PROPS
// ==========================================

type ProductCardProps = {
  product: Product;
};


// ==========================================
// ESTRELLAS
// ==========================================

const STAR_VALUES = [
  1,
  2,
  3,
  4,
  5,
];


// ==========================================
// PRODUCT CARD
// ==========================================

function ProductCard({
  product,
}: ProductCardProps) {

  const navigate =
    useNavigate();


  // ========================================
  // AUTENTICACIÓN
  // ========================================

  const {
    isAuthenticated,
  } = useAuth();


  // ========================================
  // CARRITO
  // ========================================

  const {
    addToCart,
  } = useCart();


  // ========================================
  // FAVORITOS
  // ========================================

  const {
    isFavorite,
    toggleFavorite,
    refreshFavorites,
  } = useFavorites();


  // ========================================
  // ESTADOS
  // ========================================

  const [
    favoriteLoading,
    setFavoriteLoading,
  ] = useState(false);


  const [
    addedToCart,
    setAddedToCart,
  ] = useState(false);


  // ========================================
  // SABER SI ES FAVORITO
  // ========================================

  const productIsFavorite =
    isFavorite(
      product.id
    );


  // ========================================
  // RATING VISUAL
  // ========================================

  const roundedRating =
    Math.round(
      product.rating
    );


  // ========================================
  // FAVORITOS
  // ========================================

  const handleFavoriteClick =
    async () => {

      if (
        !isAuthenticated
      ) {

        navigate(
          "/login"
        );

        return;

      }


      if (
        favoriteLoading
      ) {

        return;

      }


      try {

        setFavoriteLoading(
          true
        );


        await toggleFavorite(
          product.id
        );

      } catch (error) {

        console.error(
          "Error actualizando favorito:",
          error
        );


        await refreshFavorites();

      } finally {

        setFavoriteLoading(
          false
        );

      }

    };


  // ========================================
  // AGREGAR AL CARRITO
  // ========================================

  const handleAddToCart = () => {

    if (
      product.stock <= 0
    ) {

      return;

    }


    addToCart(
      product,
      1
    );


    setAddedToCart(
      true
    );


    window.setTimeout(
      () => {

        setAddedToCart(
          false
        );

      },
      1200
    );

  };


  return (

    <article className="product-card">


      {/* =====================================
          IMAGEN
      ===================================== */}

      <div className="product-image-container">


        {/* ===================================
            FAVORITOS
        =================================== */}

        <button
          type="button"

          className={
            productIsFavorite
              ? "product-favorite product-favorite-active"
              : "product-favorite"
          }

          aria-label={
            productIsFavorite
              ? `Quitar ${product.name} de favoritos`
              : `Agregar ${product.name} a favoritos`
          }

          title={
            productIsFavorite
              ? "Quitar de favoritos"
              : "Agregar a favoritos"
          }

          disabled={
            favoriteLoading
          }

          onClick={
            handleFavoriteClick
          }
        >

          <Heart
            size={19}

            strokeWidth={1.4}

            fill={
              productIsFavorite
                ? "currentColor"
                : "none"
            }
          />

        </button>


        {/* ===================================
            IMAGEN DEL PRODUCTO
        =================================== */}

        <Link
          to={
            `/producto/${product.slug}`
          }

          className="product-image-link"
        >

          {product.image ? (

            <img
              src={
                product.image
              }

              alt={
                `${product.brand} ${product.name}`
              }

              className="product-image"

              loading="lazy"
            />

          ) : (

            <div className="product-image-placeholder">

              <span>
                AURA
              </span>

              <small>
                Imagen próximamente
              </small>

            </div>

          )}

        </Link>


        {/* ===================================
            AGREGAR AL CARRITO
        =================================== */}

        <button
          type="button"

          className="product-add-cart"

          disabled={
            product.stock <= 0
          }

          onClick={
            handleAddToCart
          }
        >

          {addedToCart ? (

            <>
              <Check
                size={16}
                strokeWidth={1.5}
              />

              Agregado
            </>

          ) : product.stock <= 0 ? (

            <>
              Agotado
            </>

          ) : (

            <>
              <ShoppingBag
                size={16}
                strokeWidth={1.5}
              />

              Agregar al carrito
            </>

          )}

        </button>

      </div>


      {/* =====================================
          INFORMACIÓN
      ===================================== */}

      <div className="product-info">


        {/* MARCA */}

        <span className="product-brand">

          {product.brand}

        </span>


        {/* NOMBRE */}

        <Link
          to={
            `/producto/${product.slug}`
          }

          className="product-name-link"
        >

          <h3>
            {product.name}
          </h3>

        </Link>


        {/* ===================================
            RATING REAL
        =================================== */}

        <div className="product-rating">

          {product.reviewCount > 0 ? (

            <>

              <span
                className="product-rating-stars"

                aria-label={
                  `${product.rating.toFixed(
                    1
                  )} de 5 estrellas`
                }
              >

                {STAR_VALUES.map(
                  (star) => (

                    <span
                      key={
                        star
                      }

                      className={
                        star <=
                        roundedRating
                          ? "product-rating-star product-rating-star-active"
                          : "product-rating-star"
                      }
                    >

                      {star <=
                      roundedRating
                        ? "★"
                        : "☆"}

                    </span>

                  )
                )}

              </span>


              <span className="product-rating-value">

                {product.rating.toFixed(
                  1
                )}

              </span>


              <span className="product-rating-count">

                (
                {product.reviewCount}
                )

              </span>

            </>

          ) : (

            <span className="product-no-reviews">

              Sin valoraciones

            </span>

          )}

        </div>


        {/* PRECIO */}

        <p className="product-price">

          S/ {product.price.toFixed(2)}

        </p>


      </div>

    </article>

  );

}


export default ProductCard;