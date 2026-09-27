import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

import "./Hero.css";

type FeaturedProduct = {
  id: number;
  brand: string;
  name: string;
  slug: string;
  image: string;
  label: string;
  title: string;
  description: string;
};

const featuredProducts: FeaturedProduct[] = [
  {
    id: 1,
    brand: "Lattafa",
    name: "Khamrah Qahwa",
    slug: "lattafa-khamrah-qahwa",
    image: "/images/hero/khamrah-main.jpg",
    label: "ESENCIAS DE ORIENTE",
    title: "Intensidad que deja una huella.",
    description:
      "Descubre Khamrah Qahwa, una fragancia cálida, intensa y envolvente con el carácter de la perfumería árabe.",
  },
  {
    id: 2,
    brand: "Versace",
    name: "Eros Eau de Toilette",
    slug: "versace-eros-edt",
    image: "/images/hero/eros-main.jpg",
    label: "CARÁCTER Y SEDUCCIÓN",
    title: "Deja que tu esencia hable por ti.",
    description:
      "Versace Eros combina frescura, intensidad y seducción en una fragancia creada para dejar presencia.",
  },
  {
    id: 3,
    brand: "Dior",
    name: "Sauvage Eau de Parfum",
    slug: "dior-sauvage-edp",
    image: "/images/hero/sauvage-main.jpg",
    label: "ELEGANCIA ATEMPORAL",
    title: "Una presencia imposible de ignorar.",
    description:
      "Dior Sauvage Eau de Parfum ofrece un carácter intenso y sofisticado para quienes buscan una fragancia memorable.",
  },
];

function Hero() {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setCurrentIndex((current) =>
        current === featuredProducts.length - 1
          ? 0
          : current + 1
      );
    }, 5000);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  const currentProduct = featuredProducts[currentIndex];

  const getPosition = (index: number) => {
    if (index === currentIndex) {
      return "main";
    }

    const nextIndex =
      (currentIndex + 1) % featuredProducts.length;

    if (index === nextIndex) {
      return "right";
    }

    return "left";
  };

  return (
    <section className="hero">
      <div className="hero-content">

        <div
          key={currentProduct.id}
          className="hero-text"
        >
          <span className="hero-label">
            {currentProduct.label}
          </span>

          <h1>
            {currentProduct.title}
          </h1>

          <p>
            {currentProduct.description}
          </p>

          <div className="hero-actions">
            <Link
              to={`/producto/${currentProduct.slug}`}
              className="hero-button"
            >
              Descubrir fragancia

              <ArrowRight
                size={17}
                strokeWidth={1.5}
              />
            </Link>

            <Link
              to="/perfumes"
              className="hero-secondary"
            >
              Ver colección
            </Link>
          </div>

          <div className="hero-brands">
            {featuredProducts.map((product, index) => (
              <button
                key={product.id}
                type="button"
                className={
                  index === currentIndex
                    ? "hero-brand hero-brand-active"
                    : "hero-brand"
                }
                onClick={() => setCurrentIndex(index)}
              >
                {product.brand}
              </button>
            ))}
          </div>
        </div>

        <div className="hero-showcase">
          <div className="hero-showcase-light" />

          {featuredProducts.map((product, index) => {
            const position = getPosition(index);

            return (
              <Link
                key={product.id}
                to={`/producto/${product.slug}`}
                className={`hero-product hero-product-${position}`}
              >
                <img
                  src={product.image}
                  alt={`${product.brand} ${product.name}`}
                />

                <div className="hero-product-info">
                  <span>{product.brand}</span>
                  <strong>{product.name}</strong>
                </div>
              </Link>
            );
          })}
        </div>

      </div>
    </section>
  );
}

export default Hero;