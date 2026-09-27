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

  const [
    products,
    setProducts,
  ] = useState<Product[]>([]);


  const [
    loading,
    setLoading,
  ] = useState(true);


  const [
    error,
    setError,
  ] = useState("");


  // ==========================================
  // CARGAR PRODUCTOS
  // ==========================================

  useEffect(() => {

    let active = true;


    async function loadProducts() {

      try {

        setLoading(
          true
        );

        setError("");


        const data =
          await getProducts();


        if (!active) {
          return;
        }


        setProducts(
          data.slice(
            0,
            4
          )
        );

      } catch (
        requestError
      ) {

        if (!active) {
          return;
        }


        if (
          requestError
            instanceof Error
        ) {

          setError(
            requestError.message
          );

        } else {

          setError(
            "No se pudieron cargar los productos."
          );

        }

      } finally {

        if (active) {

          setLoading(
            false
          );

        }

      }

    }


    void loadProducts();


    return () => {

      active = false;

    };

  }, []);


  return (

    <section className="best-sellers">


      {/* =====================================
          ENCABEZADO
      ===================================== */}

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


      {/* =====================================
          CARGANDO
      ===================================== */}

      {loading && (

        <p>
          Cargando perfumes...
        </p>

      )}


      {/* =====================================
          ERROR
      ===================================== */}

      {error && (

        <p>
          {error}
        </p>

      )}


      {/* =====================================
          PRODUCTOS
      ===================================== */}

      {!loading &&
        !error && (

        <div className="best-sellers-grid">

          {products.map(
            (
              product
            ) => (

              <ProductCard
                key={
                  product.id
                }

                product={
                  product
                }
              />

            )
          )}

        </div>

      )}

    </section>

  );

}


export default BestSellers;