import { Heart, ShoppingBag } from "lucide-react";
import { Link } from "react-router-dom";

import "./ProductCard.css";

type ProductCardProps = {
  slug: string;

  brand: string;
  name: string;

  price: number;
  image: string;
  rating: number;
};

function ProductCard({
  slug,
  brand,
  name,
  price,
  image,
  rating,
}: ProductCardProps) {
  return (
    <article className="product-card">

      <div className="product-image-container">

        <button
          className="product-favorite"
          aria-label="Agregar a favoritos"
        >
          <Heart size={19} strokeWidth={1.4} />
        </button>

        <Link to={`/producto/${slug}`}>
          <img
            src={image}
            alt={`${brand} ${name}`}
            className="product-image"
          />
        </Link>

        <button className="product-add-cart">
          <ShoppingBag size={16} strokeWidth={1.5} />

          Agregar al carrito
        </button>

      </div>

      <div className="product-info">

        <span className="product-brand">
          {brand}
        </span>

        <Link to={`/producto/${slug}`}>
          <h3>{name}</h3>
        </Link>

        <div className="product-rating">
          ★ {rating}
        </div>

        <p className="product-price">
          S/ {price.toFixed(2)}
        </p>

      </div>

    </article>
  );
}

export default ProductCard;