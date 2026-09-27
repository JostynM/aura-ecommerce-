import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Heart,
} from "lucide-react";

import {
  Link,
} from "react-router-dom";

import ProductCard from "../components/ProductCard";

import {
  useAuth,
} from "../context/useAuth";

import {
  useFavorites,
} from "../context/useFavorites";

import {
  getProducts,
} from "../services/productService";

import type {
  Product,
} from "../types/Product";

import "./Favorites.css";


function Favorites() {

  const {
    isAuthenticated,
  } = useAuth();


  const {
    favoriteProductIds,
    loadingFavorites,
  } = useFavorites();


  const [
    products,
    setProducts,
  ] = useState<Product[]>([]);


  const [
    loadingProducts,
    setLoadingProducts,
  ] = useState(true);


  const [
    error,
    setError,
  ] = useState("");


  // ========================================
  // CARGAR PRODUCTOS
  // ========================================

  useEffect(() => {

    let active = true;


    const loadProducts =
      async () => {

        await Promise.resolve();


        try {

          setLoadingProducts(
            true
          );

          setError("");


          const data =
            await getProducts();


          if (!active) {
            return;
          }


          setProducts(
            data
          );

        } catch (requestError) {

          console.error(
            "Error cargando productos:",
            requestError
          );


          if (active) {

            setError(
              "No se pudieron cargar tus favoritos."
            );

          }

        } finally {

          if (active) {

            setLoadingProducts(
              false
            );

          }

        }

      };


    void loadProducts();


    return () => {

      active = false;

    };

  }, []);


  // ========================================
  // FILTRAR FAVORITOS
  // ========================================

  const favoriteProducts =
    useMemo(
      () => {

        return products.filter(
          (product) =>
            favoriteProductIds.includes(
              product.id
            )
        );

      },
      [
        products,
        favoriteProductIds,
      ]
    );


  // ========================================
  // SIN SESIÓN
  // ========================================

  if (
    !isAuthenticated
  ) {

    return (

      <main className="favorites-page">

        <section className="favorites-hero">

          <span>
            TU SELECCIÓN
          </span>


          <h1>
            Mis favoritos
          </h1>


          <p>
            Guarda tus fragancias preferidas
            y vuelve a ellas cuando quieras.
          </p>

        </section>


        <section className="favorites-empty">

          <Heart
            size={34}
            strokeWidth={1.1}
          />


          <h2>
            Inicia sesión para ver tus favoritos
          </h2>


          <p>
            Tus perfumes guardados estarán
            vinculados a tu cuenta AURA.
          </p>


          <Link
            to="/login"

            className="favorites-primary-button"
          >
            Iniciar sesión
          </Link>

        </section>

      </main>

    );

  }


  // ========================================
  // PÁGINA
  // ========================================

  return (

    <main className="favorites-page">


      {/* =====================================
          HERO
      ===================================== */}

      <section className="favorites-hero">

        <span>
          TU SELECCIÓN
        </span>


        <h1>
          Mis favoritos
        </h1>


        <p>
          Una colección personal de
          fragancias que captaron tu atención.
        </p>

      </section>


      {/* =====================================
          CONTENIDO
      ===================================== */}

      <section className="favorites-content">


        {/* ===================================
            CARGANDO
        =================================== */}

        {(
          loadingProducts ||
          loadingFavorites
        ) && (

          <div className="favorites-status">

            Cargando tus favoritos...

          </div>

        )}


        {/* ===================================
            ERROR
        =================================== */}

        {!loadingProducts &&
          error && (

          <div className="favorites-status favorites-error">

            {error}

          </div>

        )}


        {/* ===================================
            PRODUCTOS FAVORITOS
        =================================== */}

        {!loadingProducts &&
          !loadingFavorites &&
          !error &&
          favoriteProducts.length > 0 && (

          <>

            <div className="favorites-heading">

              <div>

                <span>
                  FAVORITOS
                </span>


                <h2>
                  Tu selección
                </h2>

              </div>


              <p>

                {favoriteProducts.length}

                {" "}

                {favoriteProducts.length === 1
                  ? "perfume"
                  : "perfumes"}

              </p>

            </div>


            <div className="favorites-grid">

              {favoriteProducts.map(
                (product) => (

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

          </>

        )}


        {/* ===================================
            SIN FAVORITOS
        =================================== */}

        {!loadingProducts &&
          !loadingFavorites &&
          !error &&
          favoriteProducts.length === 0 && (

          <div className="favorites-empty">

            <Heart
              size={34}
              strokeWidth={1.1}
            />


            <h2>
              Aún no tienes favoritos
            </h2>


            <p>
              Explora nuestro catálogo y pulsa
              el corazón de las fragancias que
              quieras guardar.
            </p>


            <Link
              to="/perfumes"

              className="favorites-primary-button"
            >
              Explorar perfumes
            </Link>

          </div>

        )}

      </section>

    </main>

  );

}


export default Favorites;