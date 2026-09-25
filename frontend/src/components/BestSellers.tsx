import {
  useEffect,
  useState,
} from "react";

import ProductCard from "./ProductCard";

import {
  getProducts,
} from "../services/productService";

import type {
  Product,
} from "../types/Product";

import "./BestSellers.css";


function BestSellers() {
  const [products, setProducts] =
    useState<Product[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");


  useEffect(() => {
    async function loadProducts() {
      try {
        setLoading(true);
        setError("");

        const data =
          await getProducts();

        setProducts(
          data.slice(0, 4)
        );

      } catch (error) {
        if (error instanceof Error) {
          setError(error.message);
        } else {
          setError(
            "No se pudieron cargar los productos."
          );
        }
      } finally {
        setLoading(false);
      }
    }


    loadProducts();

  }, []);


  return (
    <section className="best-sellers">

      <div className="best-sellers-heading">

        <span>
          SELECCIÓN AURA
        </span>

        <h2>
          Perfumes destacados
        </h2>

        <p>
          Descubre algunas de nuestras
          fragancias seleccionadas.
        </p>

      </div>


      {loading && (
        <p>
          Cargando perfumes...
        </p>
      )}


      {error && (
        <p>
          {error}
        </p>
      )}


      {!loading && !error && (

        <div className="best-sellers-grid">

          {products.map(
            (product) => (

              <ProductCard
                key={product.id}
                slug={product.slug}
                brand={product.brand}
                name={product.name}
                price={product.price}
                rating={product.rating}
                image={product.image}
              />

            )
          )}

        </div>

      )}

    </section>
  );
}


export default BestSellers;