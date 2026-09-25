import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Link,
  Navigate,
} from "react-router-dom";

import {
  AlertTriangle,
  Boxes,
  CircleOff,
  Edit3,
  PackageCheck,
  RotateCcw,
  Search,
} from "lucide-react";

import { useAuth } from "../context/useAuth";

import {
  getAdminProducts,
  type ApiProduct,
} from "../services/productService";

import "./AdminInventory.css";


// ==========================================
// TIPO DE FILTRO DE STOCK
// ==========================================

type StockFilter =
  | "all"
  | "available"
  | "low"
  | "out";


// ==========================================
// UMBRAL DE STOCK BAJO
// ==========================================

const LOW_STOCK_LIMIT = 5;


// ==========================================
// ESTADO DEL STOCK
// ==========================================

function getStockStatus(
  stock: number
) {

  if (stock === 0) {

    return {
      key: "out",
      label: "Agotado",
    };
  }


  if (
    stock <= LOW_STOCK_LIMIT
  ) {

    return {
      key: "low",
      label: "Stock bajo",
    };
  }


  return {
    key: "available",
    label: "Disponible",
  };
}


// ==========================================
// COMPONENTE
// ==========================================

function AdminInventory() {

  const {
    user,
    token,
    isAuthenticated,
    loading,
  } = useAuth();


  // ==========================================
  // DATOS
  // ==========================================

  const [
    products,
    setProducts,
  ] = useState<ApiProduct[]>([]);

  const [
    productsLoading,
    setProductsLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");


  // ==========================================
  // FILTROS
  // ==========================================

  const [
    searchTerm,
    setSearchTerm,
  ] = useState("");

  const [
    stockFilter,
    setStockFilter,
  ] = useState<StockFilter>(
    "all"
  );

  const [
    activeFilter,
    setActiveFilter,
  ] = useState<
    "all" |
    "active" |
    "inactive"
  >("all");


  // ==========================================
  // CARGAR PRODUCTOS
  // ==========================================

  useEffect(() => {

    async function loadProducts() {

      if (!token) {
        return;
      }


      try {

        setProductsLoading(true);

        setError("");


        const data =
          await getAdminProducts(
            token
          );


        setProducts(data);

      } catch (error) {

        if (
          error instanceof Error
        ) {

          setError(
            error.message
          );

        } else {

          setError(
            "No se pudo cargar el inventario."
          );

        }

      } finally {

        setProductsLoading(false);

      }
    }


    if (
      isAuthenticated &&
      user?.role === "admin"
    ) {

      loadProducts();

    }

  }, [
    token,
    isAuthenticated,
    user?.role,
  ]);


  // ==========================================
  // MÉTRICAS
  // ==========================================

  const metrics =
    useMemo(() => {

      const totalProducts =
        products.length;


      const totalStock =
        products.reduce(
          (
            total,
            product
          ) =>
            total +
            product.stock,
          0
        );


      const lowStock =
        products.filter(
          (product) =>
            product.stock > 0 &&
            product.stock <=
              LOW_STOCK_LIMIT
        ).length;


      const outOfStock =
        products.filter(
          (product) =>
            product.stock === 0
        ).length;


      return {
        totalProducts,
        totalStock,
        lowStock,
        outOfStock,
      };

    }, [
      products,
    ]);


  // ==========================================
  // PRODUCTOS FILTRADOS
  // ==========================================

  const filteredProducts =
    useMemo(() => {

      const normalizedSearch =
        searchTerm
          .trim()
          .toLowerCase();


      return products.filter(
        (product) => {

          // ==============================
          // BÚSQUEDA
          // ==============================

          const matchesSearch =
            normalizedSearch === "" ||

            product.name
              .toLowerCase()
              .includes(
                normalizedSearch
              ) ||

            product.brand
              .toLowerCase()
              .includes(
                normalizedSearch
              ) ||

            product.slug
              .toLowerCase()
              .includes(
                normalizedSearch
              );


          // ==============================
          // STOCK
          // ==============================

          const stockStatus =
            getStockStatus(
              product.stock
            );


          const matchesStock =
            stockFilter === "all" ||
            stockStatus.key ===
              stockFilter;


          // ==============================
          // ACTIVO / INACTIVO
          // ==============================

          const matchesActive =
            activeFilter === "all" ||

            (
              activeFilter ===
                "active" &&
              product.is_active
            ) ||

            (
              activeFilter ===
                "inactive" &&
              !product.is_active
            );


          return (
            matchesSearch &&
            matchesStock &&
            matchesActive
          );
        }
      );

    }, [
      products,
      searchTerm,
      stockFilter,
      activeFilter,
    ]);


  // ==========================================
  // LIMPIAR FILTROS
  // ==========================================

  const clearFilters = () => {

    setSearchTerm("");

    setStockFilter(
      "all"
    );

    setActiveFilter(
      "all"
    );
  };


  // ==========================================
  // AUTH CARGANDO
  // ==========================================

  if (loading) {

    return (
      <main className="admin-inventory-page">

        <p>
          Cargando panel...
        </p>

      </main>
    );
  }


  // ==========================================
  // SIN SESIÓN
  // ==========================================

  if (!isAuthenticated) {

    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }


  // ==========================================
  // NO ADMIN
  // ==========================================

  if (
    user?.role !== "admin"
  ) {

    return (
      <Navigate
        to="/"
        replace
      />
    );
  }


  // ==========================================
  // VISTA
  // ==========================================

  return (

    <main className="admin-inventory-page">

      <section className="admin-inventory-container">


        {/* ================================= */}
        {/* CABECERA */}
        {/* ================================= */}

        <header className="admin-inventory-header">

          <div>

            <span>
              ADMINISTRACIÓN
            </span>

            <h1>
              Inventario
            </h1>

            <p>
              Controla el stock disponible
              de los perfumes de AURA.
            </p>

          </div>


          <div className="admin-inventory-header-actions">

            <Link
              to="/admin/productos/nuevo"
              className="admin-inventory-new"
            >
              Agregar producto
            </Link>

            <Link
              to="/admin"
              className="admin-inventory-back"
            >
              Volver al panel
            </Link>

          </div>

        </header>


        {/* ================================= */}
        {/* KPIS */}
        {/* ================================= */}

        <section className="admin-inventory-kpis">

          <article>

            <div className="admin-inventory-kpi-icon">

              <Boxes
                size={21}
              />

            </div>


            <div>

              <span>
                Productos
              </span>

              <strong>
                {metrics.totalProducts}
              </strong>

              <small>
                Registrados
              </small>

            </div>

          </article>


          <article>

            <div className="admin-inventory-kpi-icon">

              <PackageCheck
                size={21}
              />

            </div>


            <div>

              <span>
                Stock total
              </span>

              <strong>
                {metrics.totalStock}
              </strong>

              <small>
                Unidades
              </small>

            </div>

          </article>


          <article>

            <div className="admin-inventory-kpi-icon warning">

              <AlertTriangle
                size={21}
              />

            </div>


            <div>

              <span>
                Stock bajo
              </span>

              <strong>
                {metrics.lowStock}
              </strong>

              <small>
                5 unidades o menos
              </small>

            </div>

          </article>


          <article>

            <div className="admin-inventory-kpi-icon danger">

              <CircleOff
                size={21}
              />

            </div>


            <div>

              <span>
                Agotados
              </span>

              <strong>
                {metrics.outOfStock}
              </strong>

              <small>
                Sin unidades
              </small>

            </div>

          </article>

        </section>


        {/* ================================= */}
        {/* FILTROS */}
        {/* ================================= */}

        <section className="admin-inventory-filters">

          <div className="admin-inventory-search">

            <Search
              size={18}
            />

            <input
              type="text"
              placeholder="Buscar producto, marca o slug..."
              value={
                searchTerm
              }
              onChange={(event) => {

                setSearchTerm(
                  event.target.value
                );

              }}
            />

          </div>


          <div className="admin-inventory-filter-actions">

            <select
              value={
                stockFilter
              }
              onChange={(event) => {

                setStockFilter(
                  event.target.value as
                    StockFilter
                );

              }}
            >

              <option value="all">
                Todo el stock
              </option>

              <option value="available">
                Disponible
              </option>

              <option value="low">
                Stock bajo
              </option>

              <option value="out">
                Agotado
              </option>

            </select>


            <select
              value={
                activeFilter
              }
              onChange={(event) => {

                const value =
                  event.target.value;


                if (
                  value === "active" ||
                  value === "inactive"
                ) {

                  setActiveFilter(
                    value
                  );

                } else {

                  setActiveFilter(
                    "all"
                  );

                }

              }}
            >

              <option value="all">
                Todos
              </option>

              <option value="active">
                Activos
              </option>

              <option value="inactive">
                Inactivos
              </option>

            </select>


            <button
              type="button"
              onClick={
                clearFilters
              }
              className="admin-inventory-clear"
            >

              <RotateCcw
                size={16}
              />

              Limpiar

            </button>

          </div>

        </section>


        {/* ================================= */}
        {/* RESULTADOS */}
        {/* ================================= */}

        {!productsLoading && (

          <div className="admin-inventory-results">

            <strong>
              {filteredProducts.length}
            </strong>

            {" "}

            {filteredProducts.length === 1
              ? "producto"
              : "productos"}

            {filteredProducts.length !==
              products.length && (

              <span>
                {" "}
                de {products.length}
              </span>

            )}

          </div>

        )}


        {/* ================================= */}
        {/* ERROR */}
        {/* ================================= */}

        {error && (

          <p className="admin-inventory-error">
            {error}
          </p>

        )}


        {/* ================================= */}
        {/* CONTENIDO */}
        {/* ================================= */}

        {productsLoading ? (

          <p>
            Cargando inventario...
          </p>

        ) : products.length === 0 ? (

          <div className="admin-inventory-empty">

            <h2>
              No hay productos
            </h2>

            <p>
              Agrega productos para comenzar
              a gestionar el inventario.
            </p>

          </div>

        ) : filteredProducts.length === 0 ? (

          <div className="admin-inventory-empty">

            <h2>
              No encontramos productos
            </h2>

            <p>
              Intenta cambiar los filtros.
            </p>

            <button
              type="button"
              onClick={
                clearFilters
              }
            >
              Limpiar filtros
            </button>

          </div>

        ) : (

          <div className="admin-inventory-table-wrapper">

            <table className="admin-inventory-table">

              <thead>

                <tr>

                  <th>
                    Producto
                  </th>

                  <th>
                    Marca
                  </th>

                  <th>
                    Tamaño
                  </th>

                  <th>
                    Precio
                  </th>

                  <th>
                    Stock
                  </th>

                  <th>
                    Inventario
                  </th>

                  <th>
                    Publicación
                  </th>

                  <th>
                    Acción
                  </th>

                </tr>

              </thead>


              <tbody>

                {filteredProducts.map(
                  (product) => {

                    const stockStatus =
                      getStockStatus(
                        product.stock
                      );


                    return (

                      <tr
                        key={
                          product.id
                        }
                      >

                        {/* PRODUCTO */}

                        <td>

                          <div className="admin-inventory-product">

                            {product.image_url ? (

                              <img
                                src={
                                  product.image_url
                                }
                                alt={
                                  product.name
                                }
                              />

                            ) : (

                              <div className="admin-inventory-no-image">
                                AURA
                              </div>

                            )}


                            <div>

                              <strong>
                                {product.name}
                              </strong>

                              <span>
                                {product.slug}
                              </span>

                            </div>

                          </div>

                        </td>


                        {/* MARCA */}

                        <td>
                          {product.brand}
                        </td>


                        {/* TAMAÑO */}

                        <td>

                          {product.size_ml}
                          {" "}
                          ml

                        </td>


                        {/* PRECIO */}

                        <td>

                          S/{" "}

                          {Number(
                            product.price
                          ).toFixed(2)}

                        </td>


                        {/* STOCK */}

                        <td>

                          <strong className="admin-inventory-stock-number">

                            {product.stock}

                          </strong>

                        </td>


                        {/* ESTADO STOCK */}

                        <td>

                          <span
                            className={
                              `admin-inventory-stock-status ${stockStatus.key}`
                            }
                          >

                            {stockStatus.label}

                          </span>

                        </td>


                        {/* ACTIVO */}

                        <td>

                          <span
                            className={
                              product.is_active
                                ? "admin-inventory-product-status active"
                                : "admin-inventory-product-status inactive"
                            }
                          >

                            {product.is_active
                              ? "Activo"
                              : "Inactivo"}

                          </span>

                        </td>


                        {/* EDITAR */}

                        <td>

                          <Link
                            to={
                              `/admin/productos/${product.id}`
                            }
                            className="admin-inventory-edit"
                          >

                            <Edit3
                              size={15}
                            />

                            Editar

                          </Link>

                        </td>

                      </tr>

                    );
                  }
                )}

              </tbody>

            </table>

          </div>

        )}

      </section>

    </main>
  );
}


export default AdminInventory;