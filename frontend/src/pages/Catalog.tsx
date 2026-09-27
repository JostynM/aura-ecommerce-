import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useSearchParams,
} from "react-router-dom";

import CatalogFilters from "../components/CatalogFilters";
import ProductCard from "../components/ProductCard";

import {
  getProducts,
} from "../services/productService";

import type {
  Product,
} from "../types/Product";

import "./Catalog.css";

/* ==========================================
   NORMALIZAR TIPO DE PERFUME
========================================== */

const normalizeType = (
  value: string
) => {
  const normalized =
    value
      .trim()
      .toLowerCase();

  if (
    normalized === "disenador" ||
    normalized === "diseñador"
  ) {
    return "diseñador";
  }

  if (
    normalized === "árabe" ||
    normalized === "árabes" ||
    normalized === "arabes"
  ) {
    return "arabe";
  }

  return normalized;
};

/* ==========================================
   CATALOG
========================================== */

function Catalog() {
  /* ========================================
     URL
  ======================================== */

  const [
    searchParams,
    setSearchParams,
  ] = useSearchParams();

  /* ========================================
     PRODUCTOS
  ======================================== */

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

  /* ========================================
     FILTROS DESDE URL
  ======================================== */

  const selectedTypes =
    searchParams
      .getAll("tipo")
      .map(normalizeType);

  const selectedGenders =
    searchParams
      .getAll("genero")
      .map((value) =>
        value
          .trim()
          .toLowerCase()
      );

  const selectedBrands =
    searchParams.getAll(
      "marca"
    );

  /* ========================================
     ORDEN DESDE URL
  ======================================== */

  const orderParam =
    searchParams.get(
      "orden"
    );

  let sortBy =
    "popular";

  if (
    orderParam === "nuevos"
  ) {
    sortBy =
      "newest";
  } else if (
    orderParam === "price-low"
  ) {
    sortBy =
      "price-low";
  } else if (
    orderParam === "price-high"
  ) {
    sortBy =
      "price-high";
  } else if (
    orderParam === "rating"
  ) {
    sortBy =
      "rating";
  }

  /* ========================================
     CARGAR PRODUCTOS
  ======================================== */

  useEffect(() => {
    let active = true;

    async function loadProducts() {
      try {
        setLoading(true);
        setError("");

        const data =
          await getProducts();

        if (!active) {
          return;
        }

        setProducts(data);
      } catch (requestError) {
        if (!active) {
          return;
        }

        if (
          requestError instanceof Error
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
          setLoading(false);
        }
      }
    }

    void loadProducts();

    return () => {
      active = false;
    };
  }, []);

  /* ========================================
     MARCAS DISPONIBLES
  ======================================== */

  const availableBrands =
    useMemo(() => {
      const brands =
        products
          .map(
            (product) =>
              product.brand
          )
          .filter(
            (
              brand,
              index,
              array
            ) =>
              array.indexOf(
                brand
              ) === index
          )
          .sort(
            (a, b) =>
              a.localeCompare(
                b,
                "es"
              )
          );

      return brands;
    }, [products]);

  /* ========================================
     CAMBIAR FILTRO MÚLTIPLE
  ======================================== */

  const toggleSearchParam = (
    key: string,
    value: string
  ) => {
    const nextParams =
      new URLSearchParams(
        searchParams
      );

    const currentValues =
      nextParams.getAll(
        key
      );

    const exists =
      currentValues.includes(
        value
      );

    nextParams.delete(
      key
    );

    let newValues:
      string[];

    if (exists) {
      newValues =
        currentValues.filter(
          (item) =>
            item !== value
        );
    } else {
      newValues = [
        ...currentValues,
        value,
      ];
    }

    newValues.forEach(
      (item) => {
        nextParams.append(
          key,
          item
        );
      }
    );

    setSearchParams(
      nextParams
    );
  };

  /* ========================================
     TIPO
  ======================================== */

  const toggleType = (
    type: string
  ) => {
    toggleSearchParam(
      "tipo",
      normalizeType(
        type
      )
    );
  };

  /* ========================================
     GÉNERO
  ======================================== */

  const toggleGender = (
    gender: string
  ) => {
    toggleSearchParam(
      "genero",
      gender
        .trim()
        .toLowerCase()
    );
  };

  /* ========================================
     MARCA
  ======================================== */

  const toggleBrand = (
    brand: string
  ) => {
    toggleSearchParam(
      "marca",
      brand
    );
  };

  /* ========================================
     ORDEN
  ======================================== */

  const handleSortChange = (
    value: string
  ) => {
    const nextParams =
      new URLSearchParams(
        searchParams
      );

    if (
      value === "popular"
    ) {
      nextParams.delete(
        "orden"
      );
    } else if (
      value === "newest"
    ) {
      nextParams.set(
        "orden",
        "nuevos"
      );
    } else {
      nextParams.set(
        "orden",
        value
      );
    }

    setSearchParams(
      nextParams
    );
  };

  /* ========================================
     LIMPIAR FILTROS
  ======================================== */

  const clearFilters = () => {
    setSearchParams({});
  };

  /* ========================================
     FILTRAR Y ORDENAR PRODUCTOS
  ======================================== */

  const filteredProducts =
    useMemo(() => {
      const result =
        products.filter(
          (product) => {
            /* ============================
               TIPO
            ============================ */

            const productType =
              normalizeType(
                product.type
              );

            const typeMatches =
              selectedTypes.length ===
                0 ||
              selectedTypes.includes(
                productType
              );

            /* ============================
               GÉNERO
            ============================ */

            const productGender =
              product.gender
                .trim()
                .toLowerCase();

            const genderMatches =
              selectedGenders.length ===
                0 ||
              selectedGenders.includes(
                productGender
              );

            /* ============================
               MARCA
            ============================ */

            const brandMatches =
              selectedBrands.length ===
                0 ||
              selectedBrands.includes(
                product.brand
              );

            return (
              typeMatches &&
              genderMatches &&
              brandMatches
            );
          }
        );

      /* ==================================
         ORDEN
      ================================== */

      return [
        ...result,
      ].sort(
        (a, b) => {
          /* ============================
             NOVEDADES
          ============================ */

          if (
            sortBy ===
            "newest"
          ) {
            return (
              b.id -
              a.id
            );
          }

          /* ============================
             PRECIO MENOR
          ============================ */

          if (
            sortBy ===
            "price-low"
          ) {
            return (
              a.price -
              b.price
            );
          }

          /* ============================
             PRECIO MAYOR
          ============================ */

          if (
            sortBy ===
            "price-high"
          ) {
            return (
              b.price -
              a.price
            );
          }

          /* ============================
             RATING
          ============================ */

          if (
            sortBy ===
            "rating"
          ) {
            return (
              b.rating -
              a.rating
            );
          }

          return 0;
        }
      );
    }, [
      products,
      selectedTypes,
      selectedGenders,
      selectedBrands,
      sortBy,
    ]);

  /* ========================================
     TÍTULO DINÁMICO
  ======================================== */

  let heroLabel =
    "DESCUBRE AURA";

  let heroTitle =
    "Perfumes";

  let heroDescription =
    "Encuentra una fragancia que represente tu esencia.";

  /* ========================================
     PERFUMERÍA ÁRABE
  ======================================== */

  if (
    selectedTypes.length ===
      1 &&
    selectedTypes[0] ===
      "arabe"
  ) {
    heroLabel =
      "PERFUMERÍA ÁRABE";

    heroTitle =
      "Perfumes Árabes";

    heroDescription =
      "Fragancias intensas, envolventes y llenas de carácter.";
  }

  /* ========================================
     DISEÑADOR
  ======================================== */

  if (
    selectedTypes.length ===
      1 &&
    selectedTypes[0] ===
      "diseñador"
  ) {
    heroLabel =
      "CASAS DE PERFUMERÍA";

    heroTitle =
      "Perfumes de Diseñador";

    heroDescription =
      "Descubre fragancias de casas reconocidas y encuentra tu próxima firma olfativa.";
  }

  /* ========================================
     UNISEX
  ======================================== */

  if (
    selectedGenders.length ===
      1 &&
    selectedGenders[0] ===
      "unisex" &&
    selectedTypes.length ===
      0 &&
    selectedBrands.length ===
      0
  ) {
    heroLabel =
      "SIN ETIQUETAS";

    heroTitle =
      "Perfumes Unisex";

    heroDescription =
      "Fragancias creadas para trascender etiquetas y adaptarse a cualquier estilo.";
  }

  /* ========================================
     NOVEDADES
  ======================================== */

  if (
    sortBy ===
      "newest" &&
    selectedTypes.length ===
      0 &&
    selectedGenders.length ===
      0 &&
    selectedBrands.length ===
      0
  ) {
    heroLabel =
      "RECIÉN LLEGADOS";

    heroTitle =
      "Novedades";

    heroDescription =
      "Descubre las últimas fragancias incorporadas al catálogo de AURA.";
  }

  /* ========================================
     MARCA
  ======================================== */

  if (
    selectedBrands.length ===
      1 &&
    selectedTypes.length ===
      0 &&
    selectedGenders.length ===
      0
  ) {
    heroLabel =
      "DESCUBRE LA MARCA";

    heroTitle =
      selectedBrands[0];

    heroDescription =
      `Explora las fragancias de ${selectedBrands[0]} disponibles en AURA.`;
  }

  return (
    <main className="catalog-page">
      {/* ====================================
          HERO
      ==================================== */}

      <section className="catalog-hero">
        <span>
          {heroLabel}
        </span>

        <h1>
          {heroTitle}
        </h1>

        <p>
          {heroDescription}
        </p>
      </section>

      {/* ====================================
          CATÁLOGO
      ==================================== */}

      <section className="catalog-container">
        {/* ==================================
            FILTROS
        ================================== */}

        <CatalogFilters
          selectedTypes={
            selectedTypes
          }
          selectedGenders={
            selectedGenders
          }
          selectedBrands={
            selectedBrands
          }
          availableBrands={
            availableBrands
          }
          onTypeChange={
            toggleType
          }
          onGenderChange={
            toggleGender
          }
          onBrandChange={
            toggleBrand
          }
          onClear={
            clearFilters
          }
        />

        {/* ==================================
            PRODUCTOS
        ================================== */}

        <div className="catalog-products">
          {/* ================================
              TOOLBAR
          ================================ */}

          <div className="catalog-toolbar">
            <span>
              {
                filteredProducts.length
              }{" "}

              {filteredProducts.length ===
              1
                ? "producto"
                : "productos"}
            </span>

            <select
              value={sortBy}
              onChange={(
                event
              ) =>
                handleSortChange(
                  event.target.value
                )
              }
              aria-label="Ordenar productos"
            >
              <option value="popular">
                Más vendidos
              </option>

              <option value="newest">
                Novedades
              </option>

              <option value="price-low">
                Precio: menor a mayor
              </option>

              <option value="price-high">
                Precio: mayor a menor
              </option>

              <option value="rating">
                Mejor valorados
              </option>
            </select>
          </div>

          {/* ================================
              LOADING
          ================================ */}

          {loading && (
            <p className="catalog-message">
              Cargando perfumes...
            </p>
          )}

          {/* ================================
              ERROR
          ================================ */}

          {error && (
            <p className="catalog-error">
              {error}
            </p>
          )}

          {/* ================================
              GRID
          ================================ */}

          {!loading &&
            !error && (
              <div className="catalog-grid">
                {filteredProducts.length >
                0 ? (
                  filteredProducts.map(
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
                  )
                ) : (
                  <div className="catalog-empty">
                    <span>
                      AURA
                    </span>

                    <h2>
                      No encontramos perfumes
                    </h2>

                    <p>
                      Prueba eliminando alguno
                      de los filtros seleccionados.
                    </p>

                    <button
                      type="button"
                      onClick={
                        clearFilters
                      }
                    >
                      Ver todos los perfumes
                    </button>
                  </div>
                )}
              </div>
            )}
        </div>
      </section>
    </main>
  );
}

export default Catalog;