import {
  useEffect,
  useState,
} from "react";

import {
  Heart,
  Minus,
  Plus,
  ShoppingBag,
} from "lucide-react";

import {
  Link,
  useParams,
} from "react-router-dom";

import { useCart } from "../context/useCart";

import {
  getProductBySlug,
} from "../services/productService";

import type {
  Product,
} from "../types/Product";

import "./ProductDetail.css";


function ProductDetail() {
  const { slug } = useParams();

  const { addToCart } = useCart();


  const [product, setProduct] =
    useState<Product | null>(null);


  const [quantity, setQuantity] =
    useState(1);


  const [loading, setLoading] =
    useState(true);


  const [error, setError] =
    useState("");


  useEffect(() => {
    async function loadProduct() {
      if (!slug) {
        setError(
          "Producto no encontrado."
        );

        setLoading(false);

        return;
      }


      try {
        setLoading(true);
        setError("");

        const data =
          await getProductBySlug(slug);

        setProduct(data);

        setQuantity(1);

      } catch (error) {
        if (error instanceof Error) {
          setError(error.message);
        } else {
          setError(
            "No se pudo cargar el producto."
          );
        }
      } finally {
        setLoading(false);
      }
    }


    loadProduct();

  }, [slug]);


  if (loading) {
    return (
      <main className="product-not-found">

        <h1>
          Cargando perfume...
        </h1>

      </main>
    );
  }


  if (error || !product) {
    return (
      <main className="product-not-found">

        <h1>
          Producto no encontrado
        </h1>

        <p>
          {error}
        </p>

        <Link to="/perfumes">
          Volver al catálogo
        </Link>

      </main>
    );
  }


  const increaseQuantity = () => {
    if (quantity < product.stock) {
      setQuantity(
        quantity + 1
      );
    }
  };


  const decreaseQuantity = () => {
    if (quantity > 1) {
      setQuantity(
        quantity - 1
      );
    }
  };


  return (
    <main className="product-detail-page">

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

        <span>
          {product.name}
        </span>

      </div>


      <section className="product-detail-main">

        <div className="product-detail-image">

          <img
            src={product.image}
            alt={`${product.brand} ${product.name}`}
          />

        </div>


        <div className="product-detail-info">

          <span className="detail-brand">
            {product.brand}
          </span>


          <h1>
            {product.name}
          </h1>


          <div className="detail-rating">

            ★ {product.rating}

            <span>
              {" "}
              · Reseñas verificadas
            </span>

          </div>


          <p className="detail-price">
            S/ {product.price.toFixed(2)}
          </p>


          <p className="detail-description">
            {product.description}
          </p>


          <div className="detail-size">

            <span>
              Tamaño
            </span>

            <button type="button">
              {product.size}
            </button>

          </div>


          <div className="detail-stock">

            {product.stock > 0 ? (

              <span>
                En stock ·{" "}
                {product.stock} disponibles
              </span>

            ) : (

              <span className="out-of-stock">
                Agotado
              </span>

            )}

          </div>


          <div className="detail-purchase">

            <div className="quantity-selector">

              <button
                type="button"
                onClick={decreaseQuantity}
                disabled={quantity <= 1}
                aria-label="Disminuir cantidad"
              >
                <Minus size={16} />
              </button>


              <span>
                {quantity}
              </span>


              <button
                type="button"
                onClick={increaseQuantity}
                disabled={
                  quantity >= product.stock
                }
                aria-label="Aumentar cantidad"
              >
                <Plus size={16} />
              </button>

            </div>


            <button
              type="button"
              className="detail-add-cart"
              disabled={product.stock === 0}
              onClick={() =>
                addToCart(
                  product,
                  quantity
                )
              }
            >

              <ShoppingBag size={17} />

              Agregar al carrito

            </button>

          </div>


          <button
            type="button"
            className="detail-favorite"
          >

            <Heart
              size={17}
              strokeWidth={1.5}
            />

            Agregar a favoritos

          </button>

        </div>

      </section>


      <section className="olfactory-section">

        <div className="olfactory-heading">

          <span>
            COMPOSICIÓN
          </span>

          <h2>
            Perfil olfativo
          </h2>

        </div>


        <div className="olfactory-grid">

          <div>

            <span className="note-number">
              01
            </span>

            <h3>
              Notas de salida
            </h3>

            {product.topNotes.map(
              (note) => (

                <p key={note}>
                  {note}
                </p>

              )
            )}

          </div>


          <div>

            <span className="note-number">
              02
            </span>

            <h3>
              Notas de corazón
            </h3>

            {product.heartNotes.map(
              (note) => (

                <p key={note}>
                  {note}
                </p>

              )
            )}

          </div>


          <div>

            <span className="note-number">
              03
            </span>

            <h3>
              Notas de fondo
            </h3>

            {product.baseNotes.map(
              (note) => (

                <p key={note}>
                  {note}
                </p>

              )
            )}

          </div>

        </div>

      </section>

    </main>
  );
}


export default ProductDetail;