import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Eye,
  RotateCcw,
  Search,
} from "lucide-react";

import { useAuth } from "../context/useAuth";

import {
  getAdminOrders,
  type OrderResponse,
  type OrderStatus,
  type PaginatedOrdersResponse,
  type PaymentStatus,
} from "../services/orderService";

import "./AdminOrders.css";

const PAGE_SIZE = 20;

type OrderStatusFilter = "all" | OrderStatus;
type PaymentStatusFilter = "all" | PaymentStatus;

type OrdersErrorState = {
  page: number;
  message: string;
};

function getOrderStatusLabel(status: OrderStatus) {
  switch (status) {
    case "confirmed":
      return "Confirmado";

    case "processing":
      return "Preparando";

    case "shipped":
      return "Enviado";

    case "delivered":
      return "Entregado";

    case "cancelled":
      return "Cancelado";

    case "pending":
    default:
      return "Pendiente";
  }
}

function getPaymentStatusLabel(paymentStatus: PaymentStatus) {
  switch (paymentStatus) {
    case "paid":
      return "Pagado";

    case "failed":
      return "Fallido";

    case "refunded":
      return "Reembolsado";

    case "pending":
    default:
      return "Pendiente";
  }
}

function getOrderItemCount(order: OrderResponse) {
  return order.items.reduce(
    (total, item) => total + item.quantity,
    0
  );
}

function formatOrderDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/Lima",
  }).format(date);
}

function formatPrice(value: string | number) {
  const amount = Number(value);

  if (Number.isNaN(amount)) {
    return "S/ 0.00";
  }

  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    minimumFractionDigits: 2,
  }).format(amount);
}

function requiresManualReview(order: OrderResponse) {
  return (
    order.payment_status === "paid" &&
    (
      order.status === "cancelled" ||
      order.stock_status === "released"
    )
  );
}

function AdminOrders() {
  const {
    user,
    token,
    isAuthenticated,
    loading: authLoading,
  } = useAuth();

  const [page, setPage] = useState(1);

  const [pageData, setPageData] =
    useState<PaginatedOrdersResponse | null>(null);

  const [errorState, setErrorState] =
    useState<OrdersErrorState | null>(null);

  const [searchTerm, setSearchTerm] = useState("");

  const [orderStatusFilter, setOrderStatusFilter] =
    useState<OrderStatusFilter>("all");

  const [paymentStatusFilter, setPaymentStatusFilter] =
    useState<PaymentStatusFilter>("all");

  const currentPageData =
    pageData?.page === page
      ? pageData
      : null;

  const orders =
    currentPageData?.items ?? [];

  const totalOrders =
    currentPageData?.total ?? 0;

  const totalPages =
    currentPageData?.total_pages ?? 0;

  const currentError =
    errorState?.page === page
      ? errorState.message
      : "";

  const ordersLoading =
    !authLoading &&
    isAuthenticated &&
    user?.role === "admin" &&
    Boolean(token) &&
    !currentPageData &&
    !currentError;

  useEffect(() => {
    if (
      authLoading ||
      !isAuthenticated ||
      user?.role !== "admin" ||
      !token
    ) {
      return;
    }

    const adminToken = token;
    const requestedPage = page;
    let active = true;

    async function loadOrders() {
      try {
        const data = await getAdminOrders(
          adminToken,
          requestedPage,
          PAGE_SIZE
        );

        if (!active) {
          return;
        }

        if (
          data.total_pages > 0 &&
          requestedPage > data.total_pages
        ) {
          setPage(data.total_pages);
          return;
        }

        setPageData(data);
        setErrorState(null);
      } catch (requestError) {
        if (!active) {
          return;
        }

        const message =
          requestError instanceof Error
            ? requestError.message
            : "No se pudieron cargar los pedidos.";

        setErrorState({
          page: requestedPage,
          message,
        });
      }
    }

    void loadOrders();

    return () => {
      active = false;
    };
  }, [
    authLoading,
    isAuthenticated,
    page,
    token,
    user?.role,
  ]);

  const filteredOrders = useMemo(() => {
    const normalizedSearch =
      searchTerm.trim().toLowerCase();

    return orders.filter((order) => {
      const matchesSearch =
        normalizedSearch === "" ||
        order.order_number
          .toLowerCase()
          .includes(normalizedSearch) ||
        order.recipient_name
          .toLowerCase()
          .includes(normalizedSearch) ||
        order.phone
          .toLowerCase()
          .includes(normalizedSearch) ||
        order.district
          .toLowerCase()
          .includes(normalizedSearch);

      const matchesOrderStatus =
        orderStatusFilter === "all" ||
        order.status === orderStatusFilter;

      const matchesPaymentStatus =
        paymentStatusFilter === "all" ||
        order.payment_status === paymentStatusFilter;

      return (
        matchesSearch &&
        matchesOrderStatus &&
        matchesPaymentStatus
      );
    });
  }, [
    orders,
    searchTerm,
    orderStatusFilter,
    paymentStatusFilter,
  ]);

  const reviewOrders = useMemo(
    () => orders.filter(requiresManualReview),
    [orders]
  );

  const reviewCount = reviewOrders.length;

  const hasActiveFilters =
    searchTerm.trim() !== "" ||
    orderStatusFilter !== "all" ||
    paymentStatusFilter !== "all";

  function clearFilters() {
    setSearchTerm("");
    setOrderStatusFilter("all");
    setPaymentStatusFilter("all");
  }

  function goToPreviousPage() {
    if (page <= 1) {
      return;
    }

    setPage((currentPage) => currentPage - 1);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function goToNextPage() {
    if (
      totalPages === 0 ||
      page >= totalPages
    ) {
      return;
    }

    setPage((currentPage) => currentPage + 1);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  if (authLoading) {
    return (
      <main className="admin-orders-page">
        <p>Cargando panel...</p>
      </main>
    );
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  if (user?.role !== "admin") {
    return (
      <Navigate
        to="/"
        replace
      />
    );
  }

  return (
    <main className="admin-orders-page">
      <section className="admin-orders-container">
        <div className="admin-orders-top">
          <div>
            <span>ADMINISTRACIÓN</span>

            <h1>Pedidos</h1>

            <p>
              Gestiona los pedidos realizados
              por los clientes de AURA.
            </p>
          </div>

          <Link
            to="/admin"
            className="admin-orders-back"
          >
            Volver al panel
          </Link>
        </div>

        {reviewCount > 0 && (
          <section className="admin-orders-review-alert">
            <div className="admin-orders-review-alert-icon">
              <AlertTriangle size={22} />
            </div>

            <div>
              <strong>
                {reviewCount === 1
                  ? "1 pedido requiere revisión en esta página"
                  : `${reviewCount} pedidos requieren revisión en esta página`}
              </strong>

              <p>
                Hay pagos confirmados asociados a
                pedidos cancelados o cuyo stock ya
                fue liberado. Revisa estos pedidos
                antes de continuar con su gestión.
              </p>
            </div>
          </section>
        )}

        <section className="admin-orders-filters">
          <div className="admin-orders-search">
            <Search size={18} />

            <input
              type="text"
              placeholder="Buscar en esta página..."
              value={searchTerm}
              onChange={(event) =>
                setSearchTerm(
                  event.target.value
                )
              }
            />
          </div>

          <div className="admin-orders-filter-controls">
            <select
              value={orderStatusFilter}
              onChange={(event) =>
                setOrderStatusFilter(
                  event.target.value as OrderStatusFilter
                )
              }
            >
              <option value="all">
                Todos los estados
              </option>

              <option value="pending">
                Pendiente
              </option>

              <option value="confirmed">
                Confirmado
              </option>

              <option value="processing">
                Preparando
              </option>

              <option value="shipped">
                Enviado
              </option>

              <option value="delivered">
                Entregado
              </option>

              <option value="cancelled">
                Cancelado
              </option>
            </select>

            <select
              value={paymentStatusFilter}
              onChange={(event) =>
                setPaymentStatusFilter(
                  event.target.value as PaymentStatusFilter
                )
              }
            >
              <option value="all">
                Todos los pagos
              </option>

              <option value="pending">
                Pago pendiente
              </option>

              <option value="paid">
                Pagado
              </option>

              <option value="failed">
                Pago fallido
              </option>

              <option value="refunded">
                Reembolsado
              </option>
            </select>

            <button
              type="button"
              onClick={clearFilters}
              className="admin-orders-clear"
              disabled={!hasActiveFilters}
            >
              <RotateCcw size={16} />
              Limpiar
            </button>
          </div>
        </section>

        {!ordersLoading &&
          currentPageData && (
            <div className="admin-orders-results">
              {hasActiveFilters ? (
                <>
                  <strong>
                    {filteredOrders.length}
                  </strong>{" "}
                  {filteredOrders.length === 1
                    ? "coincidencia"
                    : "coincidencias"}{" "}
                  en esta página

                  <span>
                    {" "}
                    · {totalOrders} pedidos totales
                  </span>
                </>
              ) : (
                <>
                  Mostrando{" "}
                  <strong>
                    {orders.length}
                  </strong>{" "}
                  de{" "}
                  <strong>
                    {totalOrders}
                  </strong>{" "}
                  {totalOrders === 1
                    ? "pedido"
                    : "pedidos"}
                </>
              )}
            </div>
          )}

        {currentError && (
          <p className="admin-orders-error">
            {currentError}
          </p>
        )}

        {ordersLoading ? (
          <p>Cargando pedidos...</p>
        ) : currentError ? null : totalOrders === 0 ? (
          <div className="admin-orders-empty">
            <h2>
              No hay pedidos todavía
            </h2>

            <p>
              Los pedidos realizados por los
              clientes aparecerán aquí.
            </p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="admin-orders-empty">
            <h2>
              No encontramos pedidos
            </h2>

            <p>
              No hay coincidencias con los
              filtros dentro de esta página.
            </p>

            <button
              type="button"
              onClick={clearFilters}
              className="admin-orders-empty-button"
            >
              Limpiar filtros
            </button>
          </div>
        ) : (
          <div className="admin-orders-table-wrapper">
            <table className="admin-orders-table">
              <thead>
                <tr>
                  <th>Pedido</th>
                  <th>Cliente</th>
                  <th>Fecha</th>
                  <th>Productos</th>
                  <th>Total</th>
                  <th>Pago</th>
                  <th>Estado</th>
                  <th>Detalle</th>
                </tr>
              </thead>

              <tbody>
                {filteredOrders.map((order) => {
                  const requiresReview =
                    requiresManualReview(order);

                  return (
                    <tr
                      key={order.id}
                      className={
                        requiresReview
                          ? "admin-order-row-review"
                          : undefined
                      }
                    >
                      <td>
                        <div className="admin-order-number">
                          <strong>
                            {order.order_number}
                          </strong>

                          {requiresReview && (
                            <>
                              <span className="admin-order-review-badge">
                                <AlertTriangle size={12} />
                                Requiere revisión
                              </span>

                              <small className="admin-order-review-note">
                                Pago confirmado con stock liberado
                                o pedido cancelado.
                              </small>
                            </>
                          )}
                        </div>
                      </td>

                      <td>
                        <div className="admin-order-customer">
                          <strong>
                            {order.recipient_name}
                          </strong>

                          <span>
                            {order.district}
                          </span>
                        </div>
                      </td>

                      <td>
                        {formatOrderDate(
                          order.created_at
                        )}
                      </td>

                      <td>
                        {getOrderItemCount(order)}
                      </td>

                      <td>
                        <strong>
                          {formatPrice(
                            order.total
                          )}
                        </strong>
                      </td>

                      <td>
                        <span
                          className={`admin-payment-status ${order.payment_status}`}
                        >
                          {getPaymentStatusLabel(
                            order.payment_status
                          )}
                        </span>
                      </td>

                      <td>
                        <span
                          className={`admin-order-status ${order.status}`}
                        >
                          {getOrderStatusLabel(
                            order.status
                          )}
                        </span>
                      </td>

                      <td>
                        <Link
                          to={`/admin/pedidos/${order.id}`}
                          className="admin-order-detail-link"
                        >
                          <Eye size={16} />
                          Ver
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!currentError &&
          currentPageData &&
          totalPages > 1 && (
            <div className="admin-orders-pagination">
              <button
                type="button"
                onClick={goToPreviousPage}
                disabled={
                  page <= 1 ||
                  ordersLoading
                }
              >
                <ChevronLeft size={16} />
                Anterior
              </button>

              <div className="admin-orders-pagination-info">
                <span>PÁGINA</span>

                <strong>
                  {page} de {totalPages}
                </strong>
              </div>

              <button
                type="button"
                onClick={goToNextPage}
                disabled={
                  page >= totalPages ||
                  ordersLoading
                }
              >
                Siguiente
                <ChevronRight size={16} />
              </button>
            </div>
          )}
      </section>
    </main>
  );
}

export default AdminOrders;