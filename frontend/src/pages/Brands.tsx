import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ArrowRight,
} from "lucide-react";

import {
  Link,
} from "react-router-dom";

import {
  getProducts,
} from "../services/productService";

import type {
  Product,
} from "../types/Product";

import "./Brands.css";


type BrandInfo = {
  name: string;
  products: number;
};


function Brands() {

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

    async function loadProducts() {

      try {

        setLoading(true);

        setError("");


        const data =
          await getProducts();


        setProducts(
          data,
        );

      } catch (requestError) {

        if (
          requestError instanceof Error
        ) {

          setError(
            requestError.message,
          );

        } else {

          setError(
            "No se pudieron cargar las marcas.",
          );

        }

      } finally {

        setLoading(false);

      }
    }


    void loadProducts();

  }, []);


  // ==========================================
  // GENERAR MARCAS
  // ==========================================

  const brands =
    useMemo<BrandInfo[]>(
      () => {

        const counter =
          new Map<
            string,
            number
          >();


        products.forEach(
          (product) => {

            const current =
              counter.get(
                product.brand,
              ) ?? 0;


            counter.set(
              product.brand,
              current + 1,
            );

          },
        );


        return Array.from(
          counter.entries(),
        )
          .map(
            (
              [
                name,
                productCount,
              ],
            ) => ({
              name,
              products:
                productCount,
            }),
          )
          .sort(
            (a, b) =>
              a.name.localeCompare(
                b.name,
                "es",
              ),
          );

      },
      [products],
    );


  return (
    <main className="brands-page">

      {/* ======================================
          HERO
      ====================================== */}

      <section className="brands-hero">

        <div className="brands-hero-inner">

          <span>
            CASAS DE PERFUMERÍA
          </span>

          <h1>
            Marcas
          </h1>

          <p>
            Descubre las casas detrás de algunas
            de las fragancias más memorables
            de nuestra selección.
          </p>

        </div>

      </section>


      {/* ======================================
          MARCAS
      ====================================== */}

      <section className="brands-section">

        {loading && (

          <div className="brands-message">
            Cargando marcas...
          </div>

        )}


        {error && (

          <div className="brands-error">
            {error}
          </div>

        )}


        {!loading &&
          !error && (

          <div className="brands-grid">

            {brands.map(
              (
                brand,
                index,
              ) => (

                <Link
                  key={brand.name}
                  to={
                    `/perfumes?marca=${encodeURIComponent(
                      brand.name,
                    )}`
                  }
                  className="brand-card"
                >

                  <div className="brand-card-number">

                    {String(
                      index + 1,
                    ).padStart(
                      2,
                      "0",
                    )}

                  </div>


                  <div className="brand-card-main">

                    <span>
                      CASA
                    </span>

                    <h2>
                      {brand.name}
                    </h2>

                  </div>


                  <div className="brand-card-footer">

                    <span>

                      {brand.products}

                      {" "}

                      {brand.products === 1
                        ? "fragancia"
                        : "fragancias"}

                    </span>


                    <ArrowRight
                      size={17}
                      strokeWidth={1.3}
                    />

                  </div>

                </Link>

              ),
            )}

          </div>

        )}

      </section>


      {/* ======================================
          CIERRE
      ====================================== */}

      <section className="brands-closing">

        <span>
          AURA SELECTION
        </span>

        <h2>
          Diferentes casas.
          <br />
          Una misma pasión.
        </h2>

        <p>
          Nuestra selección reúne perfumes
          con diferentes estilos, orígenes
          y personalidades para que puedas
          encontrar el que hable por ti.
        </p>


        <Link
          to="/perfumes"
          className="brands-closing-link"
        >
          Ver todo el catálogo

          <ArrowRight
            size={15}
            strokeWidth={1.3}
          />
        </Link>

      </section>

    </main>
  );
}


export default Brands;