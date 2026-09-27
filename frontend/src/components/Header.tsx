import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Link,
} from "react-router-dom";

import {
  Heart,
  Search,
  ShieldCheck,
  ShoppingBag,
  UserRound,
  X,
} from "lucide-react";

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
  getProducts,
} from "../services/productService";

import type {
  Product,
} from "../types/Product";

import "./Header.css";


// ==========================================
// NORMALIZAR TEXTO
// ==========================================
//
// Permite encontrar:
//
// árabe -> arabe
// diseñador -> disenador
// Lancôme -> lancome
//
// ==========================================

function normalizeText(
  value: string
) {
  return value
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .toLowerCase()
    .trim();
}


// ==========================================
// HEADER
// ==========================================

function Header() {

  // ========================================
  // CARRITO
  // ========================================

  const {
    totalItems,
  } = useCart();


  // ========================================
  // FAVORITOS
  // ========================================

  const {
    favoritesCount,
  } = useFavorites();


  // ========================================
  // AUTENTICACIÓN
  // ========================================

  const {
    user,
    isAuthenticated,
    loading,
    logout,
  } = useAuth();


  // ========================================
  // BUSCADOR
  // ========================================

  const [
    searchOpen,
    setSearchOpen,
  ] = useState(false);


  const [
    searchTerm,
    setSearchTerm,
  ] = useState("");


  const [
    products,
    setProducts,
  ] = useState<Product[]>([]);


  const [
    productsLoaded,
    setProductsLoaded,
  ] = useState(false);


  const [
    searchLoading,
    setSearchLoading,
  ] = useState(false);


  const [
    searchError,
    setSearchError,
  ] = useState("");


  const searchInputRef =
    useRef<HTMLInputElement | null>(
      null
    );


  // ========================================
  // CARGAR PRODUCTOS PARA BÚSQUEDA
  // ========================================

  useEffect(() => {

    if (
      !searchOpen ||
      productsLoaded
    ) {
      return;
    }


    async function loadProducts() {

      try {

        setSearchLoading(true);

        setSearchError("");


        const data =
          await getProducts();


        setProducts(
          data
        );


        setProductsLoaded(
          true
        );

      } catch (error) {

        if (
          error instanceof Error
        ) {

          setSearchError(
            error.message
          );

        } else {

          setSearchError(
            "No se pudieron cargar los productos."
          );

        }

      } finally {

        setSearchLoading(
          false
        );

      }

    }


    void loadProducts();

  }, [
    searchOpen,
    productsLoaded,
  ]);


  // ========================================
  // CONTROL DEL MODAL DE BÚSQUEDA
  // ========================================

  useEffect(() => {

    if (!searchOpen) {
      return;
    }


    searchInputRef.current
      ?.focus();


    const handleKeyDown = (
      event: KeyboardEvent
    ) => {

      if (
        event.key === "Escape"
      ) {

        setSearchOpen(
          false
        );

        setSearchTerm("");

      }

    };


    const previousOverflow =
      document.body.style.overflow;


    document.body.style.overflow =
      "hidden";


    window.addEventListener(
      "keydown",
      handleKeyDown
    );


    return () => {

      window.removeEventListener(
        "keydown",
        handleKeyDown
      );


      document.body.style.overflow =
        previousOverflow;

    };

  }, [
    searchOpen,
  ]);


  // ========================================
  // RESULTADOS DE BÚSQUEDA
  // ========================================

  const searchResults =
    useMemo(() => {

      const query =
        normalizeText(
          searchTerm
        );


      if (!query) {
        return [];
      }


      return products
        .filter(
          (product) => {

            const searchableText =
              normalizeText(
                [
                  product.name,
                  product.brand,
                  product.type,
                  product.gender,
                  product.description,
                  ...product.topNotes,
                  ...product.heartNotes,
                  ...product.baseNotes,
                ].join(" ")
              );


            return searchableText
              .includes(
                query
              );

          }
        )
        .slice(
          0,
          6
        );

    }, [
      products,
      searchTerm,
    ]);


  // ========================================
  // ABRIR BUSCADOR
  // ========================================

  const handleOpenSearch = () => {

    setSearchOpen(
      true
    );

  };


  // ========================================
  // CERRAR BUSCADOR
  // ========================================

  const handleCloseSearch = () => {

    setSearchOpen(
      false
    );

    setSearchTerm("");

  };


  // ========================================
  // CERRAR SESIÓN
  // ========================================

  const handleLogout = () => {

    logout();

  };


  return (
    <>

      <header className="header">


        {/* =================================
            TOP BAR
        ================================= */}

        <div className="top-bar">

          <span>
            Envíos a todo el Perú
          </span>

          <span>
            Compra segura
          </span>

          <span>
            Productos 100% originales
          </span>

        </div>


        {/* =================================
            NAVBAR
        ================================= */}

        <div className="navbar">


          {/* ===============================
              LOGO
          =============================== */}

          <Link
            to="/"
            className="logo"
          >
            AURA
          </Link>


          {/* ===============================
              MENÚ
          =============================== */}

          <nav className="nav-menu">

            <Link to="/perfumes">
              Perfumes
            </Link>


            <Link to="/colecciones">
              Colecciones
            </Link>


            <Link
              to="/perfumes?tipo=arabe"
            >
              Árabes
            </Link>


            <Link
              to="/perfumes?tipo=diseñador"
            >
              Diseñador
            </Link>


            <Link to="/marcas">
              Marcas
            </Link>

          </nav>


          {/* ===============================
              ACCIONES
          =============================== */}

          <div className="nav-actions">


            {/* =============================
                BUSCADOR
            ============================= */}

            <button
              type="button"

              className="nav-icon-button"

              aria-label="Buscar"

              title="Buscar"

              onClick={
                handleOpenSearch
              }
            >

              <Search
                size={20}
                strokeWidth={1.5}
              />

            </button>


            {/* =============================
                FAVORITOS
            ============================= */}

            <Link
              to="/favoritos"

              className="favorites-button"

              aria-label="Favoritos"

              title="Favoritos"
            >

              <Heart
                size={20}
                strokeWidth={1.5}
              />


              {favoritesCount > 0 && (

                <span className="favorites-count">

                  {favoritesCount}

                </span>

              )}

            </Link>


            {/* =============================
                CARRITO
            ============================= */}

            <Link
              to="/carrito"

              className="cart-button"

              aria-label="Carrito"

              title="Carrito"
            >

              <ShoppingBag
                size={20}
                strokeWidth={1.5}
              />


              {totalItems > 0 && (

                <span className="cart-count">

                  {totalItems}

                </span>

              )}

            </Link>


            {/* =============================
                SESIÓN
            ============================= */}

            {!loading && (
              <>

                {isAuthenticated &&
                user ? (

                  <div className="header-user">


                    {/* CUENTA */}

                    <Link
                      to="/cuenta"

                      className="header-user-info"

                      title="Mi cuenta"
                    >

                      <UserRound
                        size={20}
                        strokeWidth={1.5}
                      />

                      <span>
                        {user.first_name}
                      </span>

                    </Link>


                    {/* ADMIN */}

                    {(
                      user.role === "admin" ||
                      user.role === "demo_admin"
                    ) && (

                      <Link
                        to="/admin"

                        className="header-admin-link"

                        title="Administración AURA"

                        aria-label="Administración AURA"
                      >

                        <ShieldCheck
                          size={17}
                          strokeWidth={1.5}
                        />

                        <span>
                          Administrar
                        </span>

                      </Link>

                    )}


                    {/* LOGOUT */}

                    <button
                      type="button"

                      className="logout-button"

                      onClick={
                        handleLogout
                      }
                    >
                      Cerrar sesión
                    </button>

                  </div>

                ) : (

                  <Link
                    to="/login"

                    aria-label="Mi cuenta"

                    title="Iniciar sesión"

                    className="account-button"
                  >

                    <UserRound
                      size={20}
                      strokeWidth={1.5}
                    />

                  </Link>

                )}

              </>
            )}

          </div>

        </div>

      </header>


      {/* =====================================
          BUSCADOR
      ===================================== */}

      {searchOpen && (

        <div
          className="search-overlay"

          onMouseDown={(event) => {

            if (
              event.target ===
              event.currentTarget
            ) {

              handleCloseSearch();

            }

          }}
        >

          <section className="search-panel">


            {/* ===============================
                HEADER DEL BUSCADOR
            =============================== */}

            <div className="search-panel-header">

              <div>

                <span>
                  DESCUBRE AURA
                </span>

                <h2>
                  ¿Qué estás buscando?
                </h2>

              </div>


              <button
                type="button"

                className="search-close"

                onClick={
                  handleCloseSearch
                }

                aria-label="Cerrar búsqueda"
              >

                <X
                  size={23}
                  strokeWidth={1.3}
                />

              </button>

            </div>


            {/* ===============================
                INPUT
            =============================== */}

            <div className="search-input-wrapper">

              <Search
                size={23}
                strokeWidth={1.3}
              />


              <input
                ref={
                  searchInputRef
                }

                type="search"

                value={
                  searchTerm
                }

                placeholder="Busca por perfume, marca, nota o estilo..."

                onChange={(event) =>
                  setSearchTerm(
                    event.target.value
                  )
                }
              />


              {searchTerm && (

                <button
                  type="button"

                  className="search-clear"

                  onClick={() =>
                    setSearchTerm("")
                  }

                  aria-label="Limpiar búsqueda"
                >

                  <X
                    size={17}
                  />

                </button>

              )}

            </div>


            {/* ===============================
                SUGERENCIAS
            =============================== */}

            {!searchTerm.trim() && (

              <div className="search-empty-intro">

                <span>
                  PUEDES BUSCAR
                </span>


                <div className="search-examples">

                  <button
                    type="button"

                    onClick={() =>
                      setSearchTerm(
                        "vainilla"
                      )
                    }
                  >
                    Vainilla
                  </button>


                  <button
                    type="button"

                    onClick={() =>
                      setSearchTerm(
                        "Lattafa"
                      )
                    }
                  >
                    Lattafa
                  </button>


                  <button
                    type="button"

                    onClick={() =>
                      setSearchTerm(
                        "árabe"
                      )
                    }
                  >
                    Árabes
                  </button>


                  <button
                    type="button"

                    onClick={() =>
                      setSearchTerm(
                        "unisex"
                      )
                    }
                  >
                    Unisex
                  </button>

                </div>

              </div>

            )}


            {/* ===============================
                CARGANDO
            =============================== */}

            {searchLoading && (

              <div className="search-status">

                Buscando en el catálogo...

              </div>

            )}


            {/* ===============================
                ERROR
            =============================== */}

            {searchError && (

              <div className="search-error">

                {searchError}

              </div>

            )}


            {/* ===============================
                RESULTADOS
            =============================== */}

            {!searchLoading &&
              searchTerm.trim() &&
              searchResults.length > 0 && (

              <div className="search-results">


                <div className="search-results-heading">

                  <span>
                    RESULTADOS
                  </span>


                  <small>

                    {searchResults.length}

                    {" "}

                    {searchResults.length ===
                    1
                      ? "resultado"
                      : "resultados"}

                  </small>

                </div>


                {searchResults.map(
                  (product) => (

                    <Link
                      key={
                        product.id
                      }

                      to={
                        `/producto/${product.slug}`
                      }

                      className="search-result"

                      onClick={
                        handleCloseSearch
                      }
                    >

                      {/* IMAGEN */}

                      <div className="search-result-image">

                        {product.image ? (

                          <img
                            src={
                              product.image
                            }

                            alt={
                              `${product.brand} ${product.name}`
                            }
                          />

                        ) : (

                          <span>
                            AURA
                          </span>

                        )}

                      </div>


                      {/* INFORMACIÓN */}

                      <div className="search-result-info">

                        <span>
                          {product.brand}
                        </span>


                        <strong>
                          {product.name}
                        </strong>


                        <small>

                          {product.size}

                          {" · "}

                          {product.gender}

                        </small>

                      </div>


                      {/* PRECIO */}

                      <div className="search-result-price">

                        S/{" "}

                        {product.price
                          .toFixed(2)}

                      </div>

                    </Link>

                  )
                )}


                <Link
                  to="/perfumes"

                  className="search-all-results"

                  onClick={
                    handleCloseSearch
                  }
                >

                  Ver todo el catálogo

                </Link>

              </div>

            )}


            {/* ===============================
                SIN RESULTADOS
            =============================== */}

            {!searchLoading &&
              searchTerm.trim() &&
              searchResults.length ===
                0 && (

              <div className="search-no-results">

                <Search
                  size={29}
                  strokeWidth={1.1}
                />

                <h3>
                  No encontramos coincidencias
                </h3>

                <p>
                  Prueba con otra marca,
                  nombre o nota olfativa.
                </p>

              </div>

            )}

          </section>

        </div>

      )}

    </>
  );
}


export default Header;