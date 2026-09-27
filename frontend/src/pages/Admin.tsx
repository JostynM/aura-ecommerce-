import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import {
  AlertTriangle,
  Banknote,
  Boxes,
  CircleOff,
  Clock,
  Package,
  Plus,
  ShoppingBag,
  Users,
  WalletCards,
} from "lucide-react";

import { useAuth } from "../context/useAuth";

import {
  changeProductStatus,
  getAdminProducts,
  getProductImageUrl,
  type ApiProduct,
} from "../services/productService";

import {
  getAdminOrderStats,
  type AdminOrderStatsResponse,
} from "../services/orderService";

import {
  getAdminUsers,
  type AdminUserResponse,
} from "../services/userService";

import "./Admin.css";

const LOW_STOCK_LIMIT = 5;
const DASHBOARD_REFRESH_INTERVAL = 30_000;

function Admin() {
  const {
    user,
    token,
    isAuthenticated,
    loading,
  } = useAuth();

  // ==========================================
  // PRODUCTOS
  // ==========================================

  const [products, setProducts] =
    useState<ApiProduct[]>([]);

  const [productsLoading, setProductsLoading] =
    useState(true);

  const [updatingProductId, setUpdatingProductId] =
    useState<number | null>(null);

  // ==========================================
  // ESTADÍSTICAS DE PEDIDOS
  // ==========================================

  const [orderStats, setOrderStats] =
    useState<AdminOrderStatsResponse | null>(null);

  const [ordersLoading, setOrdersLoading] =
    useState(true);

  // ==========================================
  // CLIENTES
  // ==========================================

  const [customers, setCustomers] =
    useState<AdminUserResponse[]>([]);

  const [customersLoading, setCustomersLoading] =
    useState(true);

  // ==========================================
  // ERROR
  // ==========================================

  const [error, setError] = useState("");

  // ==========================================
  // CARGAR DASHBOARD
  // ==========================================

  useEffect(() => {
    if (user?.role !== "admin" || !token) {
      return;
    }

    const adminToken = token;
    let requestInProgress = false;
    let active = true;

    async function loadAdminData(showLoading = false) {
      if (requestInProgress) {
        return;
      }

      requestInProgress = true;

      if (showLoading) {
        setProductsLoading(true);
        setOrdersLoading(true);
        setCustomersLoading(true);
      }

      const [
        productsResult,
        orderStatsResult,
        customersResult,
      ] = await Promise.allSettled([
        getAdminProducts(adminToken),
        getAdminOrderStats(adminToken),
        getAdminUsers(adminToken),
      ]);

      if (!active) {
        return;
      }

      const errors: string[] = [];

      // PRODUCTOS
      if (productsResult.status === "fulfilled") {
        setProducts(productsResult.value);
      } else {
        errors.push(
          "No se pudieron actualizar los productos."
        );
      }

      // PEDIDOS
      if (orderStatsResult.status === "fulfilled") {
        setOrderStats(orderStatsResult.value);
      } else {
        errors.push(
          "No se pudieron actualizar las estadísticas de pedidos."
        );
      }

      // CLIENTES
      if (customersResult.status === "fulfilled") {
        setCustomers(customersResult.value);
      } else {
        errors.push(
          "No se pudieron actualizar los clientes."
        );
      }

      setError(
        errors.length > 0
          ? errors.join(" ")
          : ""
      );

      if (showLoading) {
        setProductsLoading(false);
        setOrdersLoading(false);
        setCustomersLoading(false);
      }

      requestInProgress = false;
    }

    void loadAdminData(true);

    const intervalId = window.setInterval(() => {
      void loadAdminData(false);
    }, DASHBOARD_REFRESH_INTERVAL);

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [user?.role, token]);

  // ==========================================
  // ACTIVAR / DESACTIVAR PRODUCTO
  // ==========================================

  const handleStatusChange = async (
    product: ApiProduct
  ) => {
    if (!token) {
      return;
    }

    const newStatus = !product.is_active;

    const action = product.is_active
      ? "desactivar"
      : "reactivar";

    const confirmed = window.confirm(
      `¿Deseas ${action} ${product.name}?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setUpdatingProductId(product.id);
      setError("");

      const updatedProduct =
        await changeProductStatus(
          token,
          product.id,
          newStatus
        );

      setProducts((currentProducts) =>
        currentProducts.map((currentProduct) =>
          currentProduct.id === product.id
            ? updatedProduct
            : currentProduct
        )
      );
    } catch (requestError) {
      if (requestError instanceof Error) {
        setError(requestError.message);
      } else {
        setError(
          "No se pudo cambiar el estado del producto."
        );
      }
    } finally {
      setUpdatingProductId(null);
    }
  };

  // ==========================================
  // AUTENTICACIÓN
  // ==========================================

  if (loading) {
    return (
      <main className="admin-page">
        <p>Cargando panel...</p>
      </main>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  if (user.role !== "admin") {
    return (
      <Navigate
        to="/"
        replace
      />
    );
  }

  // ==========================================
  // ESTADÍSTICAS DE PRODUCTOS
  // ==========================================

  const activeProducts = products.filter(
    (product) => product.is_active
  );

  const totalStock = activeProducts.reduce(
    (total, product) =>
      total + product.stock,
    0
  );

  const lowStockProducts = activeProducts.filter(
    (product) =>
      product.stock > 0 &&
      product.stock <= LOW_STOCK_LIMIT
  );

  const outOfStockProducts =
    activeProducts.filter(
      (product) => product.stock === 0
    );

  // ==========================================
  // ESTADÍSTICAS DE PEDIDOS
  // ==========================================

  const totalOrders =
    orderStats?.total_orders ?? 0;

  const pendingOrders =
    orderStats?.pending_orders ?? 0;

  const paidOrders =
    orderStats?.paid_orders ?? 0;

  const pendingPayments =
    orderStats?.pending_payments ?? 0;

  const paidOrderValue = Number(
    orderStats?.paid_revenue ?? 0
  );

  // ==========================================
  // CLIENTES
  // ==========================================

  const totalCustomers = customers.length;

  return (
    <main className="admin-page">
      <section className="admin-container">

        {/* =====================================
            CABECERA
        ===================================== */}

        <div className="admin-header">
          <div>
            <span>PANEL ADMINISTRATIVO</span>

            <h1>Administración AURA</h1>

            <p>
              Gestiona productos, inventario,
              pedidos y clientes.
            </p>
          </div>

          <div className="admin-header-actions">
            <Link
              to="/admin/inventario"
              className="admin-secondary-button"
            >
              <Boxes size={17} />
              Inventario
            </Link>

            <Link
              to="/admin/pedidos"
              className="admin-secondary-button"
            >
              <ShoppingBag size={17} />
              Pedidos
            </Link>

            <Link
              to="/admin/clientes"
              className="admin-secondary-button"
            >
              <Users size={17} />
              Clientes
            </Link>

            <Link
              to="/admin/productos/nuevo"
              className="admin-new-product"
            >
              <Plus size={17} />
              Agregar producto
            </Link>
          </div>
        </div>

        {/* =====================================
            ERROR
        ===================================== */}

        {error && (
          <p className="admin-error">
            {error}
          </p>
        )}

        {/* =====================================
            KPIs
        ===================================== */}

        <div className="admin-stats">

          <article className="admin-stat-card">
            <Package size={22} />

            <div>
              <span>Productos activos</span>

              <strong>
                {productsLoading
                  ? "..."
                  : activeProducts.length}
              </strong>
            </div>
          </article>

          <article className="admin-stat-card">
            <Boxes size={22} />

            <div>
              <span>Stock total</span>

              <strong>
                {productsLoading
                  ? "..."
                  : totalStock}
              </strong>
            </div>
          </article>

          <article className="admin-stat-card">
            <AlertTriangle size={22} />

            <div>
              <span>Stock bajo</span>

              <strong>
                {productsLoading
                  ? "..."
                  : lowStockProducts.length}
              </strong>
            </div>
          </article>

          <article className="admin-stat-card">
            <CircleOff size={22} />

            <div>
              <span>Agotados</span>

              <strong>
                {productsLoading
                  ? "..."
                  : outOfStockProducts.length}
              </strong>
            </div>
          </article>

          <article className="admin-stat-card">
            <Users size={22} />

            <div>
              <span>Clientes</span>

              <strong>
                {customersLoading
                  ? "..."
                  : totalCustomers}
              </strong>
            </div>
          </article>

          <article className="admin-stat-card">
            <ShoppingBag size={22} />

            <div>
              <span>Pedidos totales</span>

              <strong>
                {ordersLoading
                  ? "..."
                  : totalOrders}
              </strong>
            </div>
          </article>

          <article className="admin-stat-card">
            <Clock size={22} />

            <div>
              <span>Pedidos pendientes</span>

              <strong>
                {ordersLoading
                  ? "..."
                  : pendingOrders}
              </strong>
            </div>
          </article>

          <article className="admin-stat-card">
            <WalletCards size={22} />

            <div>
              <span>Pedidos pagados</span>

              <strong>
                {ordersLoading
                  ? "..."
                  : paidOrders}
              </strong>
            </div>
          </article>

          <article className="admin-stat-card">
            <Banknote size={22} />

            <div>
              <span>Ventas pagadas</span>

              <strong>
                {ordersLoading
                  ? "..."
                  : `S/ ${paidOrderValue.toFixed(2)}`}
              </strong>
            </div>
          </article>

        </div>

        {/* =====================================
            ATENCIÓN REQUERIDA
        ===================================== */}

        <section className="admin-alerts-section">
          <div className="admin-section-heading">
            <span>MONITOREO</span>

            <h2>Atención requerida</h2>

            <p>
              Situaciones que podrían requerir
              revisión del administrador.
            </p>
          </div>

          <div className="admin-alerts-grid">

            <Link
              to="/admin/inventario"
              className={
                lowStockProducts.length > 0
                  ? "admin-alert-card warning"
                  : "admin-alert-card ok"
              }
            >
              <AlertTriangle size={21} />

              <div>
                <span>Stock bajo</span>

                <strong>
                  {lowStockProducts.length}{" "}
                  {lowStockProducts.length === 1
                    ? "producto"
                    : "productos"}
                </strong>

                <small>
                  5 unidades o menos
                </small>
              </div>
            </Link>

            <Link
              to="/admin/inventario"
              className={
                outOfStockProducts.length > 0
                  ? "admin-alert-card danger"
                  : "admin-alert-card ok"
              }
            >
              <CircleOff size={21} />

              <div>
                <span>
                  Productos agotados
                </span>

                <strong>
                  {outOfStockProducts.length}{" "}
                  {outOfStockProducts.length === 1
                    ? "producto"
                    : "productos"}
                </strong>

                <small>
                  Sin unidades disponibles
                </small>
              </div>
            </Link>

            <Link
              to="/admin/pedidos"
              className={
                pendingOrders > 0
                  ? "admin-alert-card pending"
                  : "admin-alert-card ok"
              }
            >
              <Clock size={21} />

              <div>
                <span>
                  Pedidos pendientes
                </span>

                <strong>
                  {pendingOrders}{" "}
                  {pendingOrders === 1
                    ? "pedido"
                    : "pedidos"}
                </strong>

                <small>
                  Requieren seguimiento
                </small>
              </div>
            </Link>

            <Link
              to="/admin/pedidos"
              className={
                pendingPayments > 0
                  ? "admin-alert-card payment"
                  : "admin-alert-card ok"
              }
            >
              <WalletCards size={21} />

              <div>
                <span>
                  Pagos pendientes
                </span>

                <strong>
                  {pendingPayments}{" "}
                  {pendingPayments === 1
                    ? "pago"
                    : "pagos"}
                </strong>

                <small>
                  Pendientes de confirmación
                </small>
              </div>
            </Link>

          </div>
        </section>

        {/* =====================================
            ACCESOS RÁPIDOS
        ===================================== */}

        <section className="admin-quick-section">
          <div className="admin-section-heading">
            <span>GESTIÓN</span>

            <h2>Accesos rápidos</h2>

            <p>
              Ingresa directamente a las
              principales áreas administrativas
              de AURA.
            </p>
          </div>

          <div className="admin-main-actions">

            <Link
              to="/admin/pedidos"
              className="admin-main-action"
            >
              <span>PEDIDOS</span>

              <strong>
                Gestionar pedidos
              </strong>

              <small>
                Revisa las compras, pagos,
                entregas y estados de los pedidos.
              </small>
            </Link>

            <Link
              to="/admin/inventario"
              className="admin-main-action"
            >
              <span>INVENTARIO</span>

              <strong>
                Controlar stock
              </strong>

              <small>
                Revisa existencias, productos
                con stock bajo y perfumes agotados.
              </small>
            </Link>

            <Link
              to="/admin/clientes"
              className="admin-main-action"
            >
              <span>CLIENTES</span>

              <strong>
                Ver clientes
              </strong>

              <small>
                Consulta las cuentas registradas
                y sus pedidos.
              </small>
            </Link>

            <Link
              to="/admin/productos/nuevo"
              className="admin-main-action"
            >
              <span>CATÁLOGO</span>

              <strong>
                Nuevo producto
              </strong>

              <small>
                Agrega un nuevo perfume
                al catálogo de AURA.
              </small>
            </Link>

          </div>
        </section>

        {/* =====================================
            PRODUCTOS
        ===================================== */}

        <section className="admin-products-section">
          <div className="admin-section-heading">
            <span>CATÁLOGO</span>
            <h2>Productos</h2>
          </div>

          {productsLoading && (
            <p>Cargando productos...</p>
          )}

          {!productsLoading &&
            products.length === 0 && (
              <p>
                No hay productos registrados.
              </p>
            )}

          {!productsLoading &&
            products.length > 0 && (

              <div className="admin-product-table">

                {/* CABECERA */}

                <div className="admin-product-row admin-product-header-row">
                  <span>Producto</span>
                  <span>Marca</span>
                  <span>Precio</span>
                  <span>Existencias</span>
                  <span>Estado</span>
                  <span>Acciones</span>
                </div>

                {/* PRODUCTOS */}

                {products.map((product) => (
                  <div
                    key={product.id}
                    className={
                      product.is_active
                        ? "admin-product-row"
                        : "admin-product-row admin-product-disabled"
                    }
                  >

                    <div className="admin-product-name">
                      <div className="admin-product-image">

                        {product.image_url ? (
                          <img
                            src={getProductImageUrl(
                              product.image_url
                            )}
                            alt={product.name}
                          />
                        ) : (
                          <span>AURA</span>
                        )}

                      </div>

                      <div>
                        <strong>
                          {product.name}
                        </strong>

                        <small>
                          {product.size_ml} ml
                        </small>
                      </div>
                    </div>

                    <span>
                      {product.brand}
                    </span>

                    <span>
                      S/{" "}
                      {Number(
                        product.price
                      ).toFixed(2)}
                    </span>

                    <span>
                      {product.stock}

                      {product.stock === 0 && (
                        <>
                          {" "}· Agotado
                        </>
                      )}

                      {product.stock > 0 &&
                        product.stock <=
                          LOW_STOCK_LIMIT && (
                          <>
                            {" "}· Stock bajo
                          </>
                        )}
                    </span>

                    <span
                      className={
                        product.is_active
                          ? "admin-status-active"
                          : "admin-status-inactive"
                      }
                    >
                      {product.is_active
                        ? "Activo"
                        : "Inactivo"}
                    </span>

                    <div className="admin-product-actions">
                      <Link
                        to={`/admin/productos/${product.id}`}
                        className="admin-edit-link"
                      >
                        Editar
                      </Link>

                      <button
                        type="button"
                        disabled={
                          updatingProductId ===
                          product.id
                        }
                        onClick={() =>
                          handleStatusChange(
                            product
                          )
                        }
                      >
                        {updatingProductId ===
                        product.id
                          ? "Procesando..."
                          : product.is_active
                            ? "Desactivar"
                            : "Reactivar"}
                      </button>
                    </div>

                  </div>
                ))}

              </div>

            )}

        </section>

      </section>
    </main>
  );
}

export default Admin;