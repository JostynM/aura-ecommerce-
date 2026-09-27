import {
  useEffect,
  useState,
} from "react";

import ProductReviews
  from "../components/ProductReviews";

import {
  ArrowLeft,
  Check,
  Heart,
  Minus,
  Plus,
  ShoppingBag,
  Sparkles,
} from "lucide-react";

import {
  Link,
  useNavigate,
  useParams,
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

import {
  getProductBySlug,
} from "../services/productService";

import type {
  Product,
} from "../types/Product";

import "./ProductDetail.css";


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


function ProductDetail() {

  // ========================================
  // ROUTER
  // ========================================

  const {
    slug,
  } = useParams();


  const navigate =
    useNavigate();


  // ========================================
  // CARRITO
  // ========================================

  const {
    addToCart,
  } = useCart();


  // ========================================
  // AUTENTICACIÓN
  // ========================================

  const {
    isAuthenticated,
  } = useAuth();


  // ========================================
  // FAVORITOS
  // ========================================

  const {
    isFavorite,
    toggleFavorite,
    refreshFavorites,
  } = useFavorites();


  // ========================================
  // PRODUCTO
  // ========================================

  const [
    product,
    setProduct,
  ] = useState<Product | null>(
    null
  );


  const [
    quantity,
    setQuantity,
  ] = useState(1);


  const [
    loading,
    setLoading,
  ] = useState(true);


  const [
    error,
    setError,
  ] = useState("");


  const [
    imageError,
    setImageError,
  ] = useState(false);


  // ========================================
  // FAVORITO
  // ========================================

  const [
    favoriteLoading,
    setFavoriteLoading,
  ] = useState(false);


  // ========================================
  // CARGAR PRODUCTO
  // ========================================

  useEffect(() => {

    async function loadProduct() {

      if (!slug) {

        setError(
          "Producto no encontrado."
        );

        setLoading(
          false
        );

        return;
      }


      try {

        setLoading(
          true
        );

        setError("");

        setImageError(
          false
        );


        const data =
          await getProductBySlug(
            slug
          );


        setProduct(
          data
        );

        setQuantity(
          1
        );

      } catch (requestError) {

        if (
          requestError
            instanceof Error
        ) {

          setError(
            requestError.message
          );

        } else {

          setError(
            "No se pudo cargar el producto."
          );

        }

      } finally {

        setLoading(
          false
        );

      }

    }


    void loadProduct();

  }, [
    slug,
  ]);


  // ========================================
  // FAVORITO ACTUAL
  // ========================================

  const productIsFavorite =
    product
      ? isFavorite(
          product.id
        )
      : false;


  // ========================================
  // CAMBIAR FAVORITO
  // ========================================

  const handleFavoriteClick =
    async () => {

      if (!product) {
        return;
      }


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

      } catch (favoriteError) {

        console.error(
          "Error actualizando favorito:",
          favoriteError
        );


        await refreshFavorites();

      } finally {

        setFavoriteLoading(
          false
        );

      }

    };


  // ========================================
  // CARGANDO
  // ========================================

  if (
    loading
  ) {

    return (

      <main className="product-state-page">

        <div className="product-state-icon">

          <Sparkles
            size={28}
            strokeWidth={1.2}
          />

        </div>


        <span>
          AURA
        </span>


        <h1>
          Preparando tu fragancia...
        </h1>

      </main>

    );

  }


  // ========================================
  // PRODUCTO NO ENCONTRADO
  // ========================================

  if (
    error ||
    !product
  ) {

    return (

      <main className="product-state-page">

        <span>
          AURA
        </span>


        <h1>
          Producto no encontrado
        </h1>


        <p>
          {error}
        </p>


        <Link
          to="/perfumes"
          className="product-state-link"
        >

          <ArrowLeft
            size={15}
          />

          Volver al catálogo

        </Link>

      </main>

    );

  }


  // ========================================
  // CANTIDAD
  // ========================================

  const increaseQuantity = () => {

    if (
      quantity <
      product.stock
    ) {

      setQuantity(
        quantity + 1
      );

    }

  };


  const decreaseQuantity = () => {

    if (
      quantity > 1
    ) {

      setQuantity(
        quantity - 1
      );

    }

  };


  // ========================================
  // NOTAS DESTACADAS
  // ========================================

  const highlightedNotes = [

    ...product.topNotes,

    ...product.heartNotes,

    ...product.baseNotes,

  ].slice(
    0,
    4
  );


  // ========================================
  // IMAGEN
  // ========================================

  const hasImage =
    Boolean(
      product.image
    ) &&
    !imageError;


  // ========================================
  // RATING
  // ========================================

  const roundedRating =
    Math.round(
      product.rating
    );


  return (

    <main className="product-detail-page">


      {/* =====================================
          BREADCRUMB
      ===================================== */}

      <div className="product-breadcrumb">

        <Link to="/">
          Inicio
        </Link>

        <span>
          /
        </span>

        <Link to="/perfumes">
          Perfumes
        </Link>

        <span>
          /
        </span>

        <span className="product-breadcrumb-current">

          {product.name}

        </span>

      </div>


      {/* =====================================
          HERO
      ===================================== */}

      <section className="product-hero">


        {/* ===================================
            IMAGEN
        =================================== */}

        <div className="product-gallery">

          <div className="product-image-frame">

            {hasImage ? (

              <img
                src={
                  product.image
                }

                alt={
                  `${product.brand} ${product.name}`
                }

                onError={() =>
                  setImageError(
                    true
                  )
                }
              />

            ) : (

              <div className="product-image-placeholder">

                <Sparkles
                  size={30}
                  strokeWidth={1}
                />

                <span>
                  AURA
                </span>

                <p>
                  Imagen próximamente
                </p>

              </div>

            )}

          </div>

        </div>


        {/* ===================================
            INFORMACIÓN
        =================================== */}

        <div className="product-detail-info">


          <div className="product-detail-top">


            {/* MARCA */}

            <span className="detail-brand">

              {product.brand}

            </span>


            {/* NOMBRE */}

            <h1>

              {product.name}

            </h1>


            {/* =================================
                RATING REAL
            ================================= */}

            <div className="detail-rating">

              {product.reviewCount > 0 ? (

                <>

                  <span
                    className="detail-stars"

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
                              ? "detail-star detail-star-active"
                              : "detail-star"
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


                  <span className="detail-rating-value">

                    {product.rating.toFixed(
                      1
                    )}

                  </span>


                  <span className="detail-rating-count">

                    · {product.reviewCount}{" "}

                    {product.reviewCount ===
                    1
                      ? "valoración"
                      : "valoraciones"}

                  </span>

                </>

              ) : (

                <span className="detail-no-reviews">

                  Sin valoraciones

                </span>

              )}

            </div>


            {/* PRECIO */}

            <p className="detail-price">

              S/{" "}

              {product.price.toFixed(
                2
              )}

            </p>


            {/* NOTAS DESTACADAS */}

            {highlightedNotes.length >
              0 && (

              <div className="detail-note-tags">

                {highlightedNotes.map(
                  (
                    note
                  ) => (

                    <span
                      key={
                        note
                      }
                    >

                      {note}

                    </span>

                  )
                )}

              </div>

            )}


            {/* DESCRIPCIÓN */}

            <p className="detail-description">

              {product.description}

            </p>

          </div>


          {/* =================================
              COMPRA
          ================================= */}

          <div className="detail-purchase-area">


            {/* TAMAÑO */}

            <div className="detail-size">

              <span className="detail-field-label">

                Tamaño

              </span>


              <button
                type="button"
                className="detail-size-option"
              >

                {product.size}

              </button>

            </div>


            {/* STOCK */}

            <div className="detail-stock">

              {product.stock > 0 ? (

                <>

                  <Check
                    size={14}
                    strokeWidth={1.7}
                  />

                  <span>
                    En stock
                  </span>

                  <span className="detail-stock-muted">

                    · {product.stock}{" "}
                    disponibles

                  </span>

                </>

              ) : (

                <span className="out-of-stock">

                  Agotado

                </span>

              )}

            </div>


            {/* =================================
                CANTIDAD + CARRITO
            ================================= */}

            <div className="detail-buy-row">


              <div className="quantity-selector">

                <button
                  type="button"

                  onClick={
                    decreaseQuantity
                  }

                  disabled={
                    quantity <= 1
                  }

                  aria-label="Disminuir cantidad"
                >

                  <Minus
                    size={15}
                    strokeWidth={1.4}
                  />

                </button>


                <span>
                  {quantity}
                </span>


                <button
                  type="button"

                  onClick={
                    increaseQuantity
                  }

                  disabled={
                    quantity >=
                    product.stock
                  }

                  aria-label="Aumentar cantidad"
                >

                  <Plus
                    size={15}
                    strokeWidth={1.4}
                  />

                </button>

              </div>


              <button
                type="button"

                className="detail-add-cart"

                disabled={
                  product.stock === 0
                }

                onClick={() =>
                  addToCart(
                    product,
                    quantity
                  )
                }
              >

                <ShoppingBag
                  size={17}
                  strokeWidth={1.4}
                />

                Agregar al carrito

              </button>

            </div>


            {/* =================================
                FAVORITOS
            ================================= */}

            <button
              type="button"

              className={
                productIsFavorite
                  ? "detail-favorite detail-favorite-active"
                  : "detail-favorite"
              }

              disabled={
                favoriteLoading
              }

              onClick={
                handleFavoriteClick
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
            >

              <Heart
                size={16}
                strokeWidth={1.4}

                fill={
                  productIsFavorite
                    ? "currentColor"
                    : "none"
                }
              />


              {favoriteLoading
                ? "Actualizando..."
                : productIsFavorite
                  ? "Quitar de favoritos"
                  : "Agregar a favoritos"}

            </button>

          </div>


          {/* =================================
              BENEFICIOS
          ================================= */}

          <div className="detail-services">

            <div>

              <span>
                01
              </span>

              <p>
                Producto original
              </p>

            </div>


            <div>

              <span>
                02
              </span>

              <p>
                Envíos a todo el Perú
              </p>

            </div>


            <div>

              <span>
                03
              </span>

              <p>
                Compra segura
              </p>

            </div>

          </div>

        </div>

      </section>


      {/* =====================================
          PERFIL OLFATIVO
      ===================================== */}

      <section className="olfactory-section">

        <div className="olfactory-heading">

          <span>
            COMPOSICIÓN
          </span>


          <h2>
            Perfil olfativo
          </h2>


          <p>
            Descubre las capas que construyen
            la identidad de esta fragancia.
          </p>

        </div>


        <div className="olfactory-grid">


          {/* SALIDA */}

          <article className="olfactory-card">

            <span className="note-number">
              01
            </span>


            <div className="olfactory-card-heading">

              <span>
                PRIMERA IMPRESIÓN
              </span>

              <h3>
                Notas de salida
              </h3>

            </div>


            <div className="olfactory-notes">

              {product.topNotes.map(
                (
                  note
                ) => (

                  <p
                    key={
                      note
                    }
                  >

                    {note}

                  </p>

                )
              )}

            </div>

          </article>


          {/* CORAZÓN */}

          <article className="olfactory-card">

            <span className="note-number">
              02
            </span>


            <div className="olfactory-card-heading">

              <span>
                EL CORAZÓN
              </span>

              <h3>
                Notas de corazón
              </h3>

            </div>


            <div className="olfactory-notes">

              {product.heartNotes.map(
                (
                  note
                ) => (

                  <p
                    key={
                      note
                    }
                  >

                    {note}

                  </p>

                )
              )}

            </div>

          </article>


          {/* FONDO */}

          <article className="olfactory-card">

            <span className="note-number">
              03
            </span>


            <div className="olfactory-card-heading">

              <span>
                LA ESTELA
              </span>

              <h3>
                Notas de fondo
              </h3>

            </div>


            <div className="olfactory-notes">

              {product.baseNotes.map(
                (
                  note
                ) => (

                  <p
                    key={
                      note
                    }
                  >

                    {note}

                  </p>

                )
              )}

            </div>

          </article>

        </div>

      </section>


      {/* =====================================
          RESEÑAS
      ===================================== */}

      <ProductReviews
        productId={
          product.id
        }
      />


      {/* =====================================
          CIERRE EDITORIAL
      ===================================== */}

      <section className="product-editorial">

        <div className="product-editorial-label">

          AURA

        </div>


        <div className="product-editorial-content">

          <span>
            UNA FRAGANCIA,
            UNA HISTORIA
          </span>


          <h2>

            Encuentra el aroma que
            mejor expresa quién eres.

          </h2>


          <Link
            to="/perfumes"
            className="product-editorial-link"
          >

            Explorar más perfumes

            <ArrowLeft
              size={14}
              className="editorial-arrow"
            />

          </Link>

        </div>

      </section>

    </main>

  );

}


export default ProductDetail;