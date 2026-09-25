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
  Eye,
  Search,
  RotateCcw,
} from "lucide-react";

import { useAuth } from "../context/useAuth";

import {
  getAdminOrders,
  type OrderResponse,
  type OrderStatus,
  type PaymentStatus,
} from "../services/orderService";

import "./AdminOrders.css";


// ==========================================
// TIPOS DE FILTROS
// ==========================================

type OrderStatusFilter =
  | "all"
  | OrderStatus;

type PaymentStatusFilter =
  | "all"
  | PaymentStatus;


// ==========================================
// ESTADO DEL PEDIDO EN ESPAÑOL
// ==========================================

function getOrderStatusLabel(
  status: OrderStatus
) {
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


// ==========================================
// ESTADO DE PAGO EN ESPAÑOL
// ==========================================

function getPaymentStatusLabel(
  paymentStatus: PaymentStatus
) {
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


// ==========================================
// COMPONENTE
// ==========================================

function AdminOrders() {

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
    orders,
    setOrders,
  ] = useState<OrderResponse[]>([]);

  const [
    ordersLoading,
    setOrdersLoading,
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
    orderStatusFilter,
    setOrderStatusFilter,
  ] = useState<OrderStatusFilter>(
    "all"
  );

  const [
    paymentStatusFilter,
    setPaymentStatusFilter,
  ] = useState<PaymentStatusFilter>(
    "all"
  );


  // ==========================================
  // CARGAR PEDIDOS
  // ==========================================

  useEffect(() => {

    async function loadOrders() {

      if (!token) {
        return;
      }

      try {

        setOrdersLoading(true);

        setError("");

        const data =
          await getAdminOrders(
            token
          );

        setOrders(data);

      } catch (error) {

        if (
          error instanceof Error
        ) {

          setError(
            error.message
          );

        } else {

          setError(
            "No se pudieron cargar los pedidos."
          );

        }

      } finally {

        setOrdersLoading(false);

      }
    }


    if (
      isAuthenticated &&
      user?.role === "admin"
    ) {

      loadOrders();

    }

  }, [
    token,
    isAuthenticated,
    user?.role,
  ]);


  // ==========================================
  // PEDIDOS FILTRADOS
  // ==========================================

  const filteredOrders =
    useMemo(() => {

      const normalizedSearch =
        searchTerm
          .trim()
          .toLowerCase();


      return orders.filter(
        (order) => {

          // ==============================
          // BÚSQUEDA
          // ==============================

          const matchesSearch =
            normalizedSearch === "" ||

            order.order_number
              .toLowerCase()
              .includes(
                normalizedSearch
              ) ||

            order.recipient_name
              .toLowerCase()
              .includes(
                normalizedSearch
              ) ||

            order.phone
              .toLowerCase()
              .includes(
                normalizedSearch
              ) ||

            order.district
              .toLowerCase()
              .includes(
                normalizedSearch
              );


          // ==============================
          // ESTADO DEL PEDIDO
          // ==============================

          const matchesOrderStatus =
            orderStatusFilter === "all" ||
            order.status ===
              orderStatusFilter;


          // ==============================
          // ESTADO DEL PAGO
          // ==============================

          const matchesPaymentStatus =
            paymentStatusFilter === "all" ||
            order.payment_status ===
              paymentStatusFilter;


          return (
            matchesSearch &&
            matchesOrderStatus &&
            matchesPaymentStatus
          );
        }
      );

    }, [
      orders,
      searchTerm,
      orderStatusFilter,
      paymentStatusFilter,
    ]);


  // ==========================================
  // LIMPIAR FILTROS
  // ==========================================

  const clearFilters = () => {

    setSearchTerm("");

    setOrderStatusFilter(
      "all"
    );

    setPaymentStatusFilter(
      "all"
    );
  };


  // ==========================================
  // CARGANDO AUTH
  // ==========================================

  if (loading) {

    return (
      <main className="admin-orders-page">

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
  // NO ES ADMIN
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

    <main className="admin-orders-page">

      <section className="admin-orders-container">


        {/* ================================= */}
        {/* CABECERA */}
        {/* ================================= */}

        <div className="admin-orders-top">

          <div>

            <span>
              ADMINISTRACIÓN
            </span>

            <h1>
              Pedidos
            </h1>

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


        {/* ================================= */}
        {/* FILTROS */}
        {/* ================================= */}

        <section className="admin-orders-filters">

          <div className="admin-orders-search">

            <Search
              size={18}
            />

            <input
              type="text"
              placeholder="Buscar pedido, cliente, teléfono o distrito..."
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


          <div className="admin-orders-filter-controls">

            <select
              value={
                orderStatusFilter
              }
              onChange={(event) => {

                setOrderStatusFilter(
                  event.target.value as
                    OrderStatusFilter
                );

              }}
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
              value={
                paymentStatusFilter
              }
              onChange={(event) => {

                setPaymentStatusFilter(
                  event.target.value as
                    PaymentStatusFilter
                );

              }}
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
              onClick={
                clearFilters
              }
              className="admin-orders-clear"
            >

              <RotateCcw
                size={16}
              />

              Limpiar

            </button>

          </div>

        </section>


        {/* ================================= */}
        {/* CONTADOR */}
        {/* ================================= */}

        {!ordersLoading && (

          <div className="admin-orders-results">

            <strong>
              {filteredOrders.length}
            </strong>

            {" "}

            {filteredOrders.length === 1
              ? "pedido encontrado"
              : "pedidos encontrados"}

            {filteredOrders.length !==
              orders.length && (

              <span>

                {" "}
                de {orders.length}

              </span>

            )}

          </div>

        )}


        {/* ================================= */}
        {/* ERROR */}
        {/* ================================= */}

        {error && (

          <p className="admin-orders-error">
            {error}
          </p>

        )}


        {/* ================================= */}
        {/* CONTENIDO */}
        {/* ================================= */}

        {ordersLoading ? (

          <p>
            Cargando pedidos...
          </p>

        ) : orders.length === 0 ? (

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
              Prueba cambiando o limpiando
              los filtros.
            </p>

            <button
              type="button"
              onClick={
                clearFilters
              }
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

                  <th>
                    Pedido
                  </th>

                  <th>
                    Cliente
                  </th>

                  <th>
                    Fecha
                  </th>

                  <th>
                    Productos
                  </th>

                  <th>
                    Total
                  </th>

                  <th>
                    Pago
                  </th>

                  <th>
                    Estado
                  </th>

                  <th>
                    Detalle
                  </th>

                </tr>

              </thead>


              <tbody>

                {filteredOrders.map(
                  (order) => (

                    <tr
                      key={
                        order.id
                      }
                    >

                      {/* PEDIDO */}

                      <td>

                        <strong>
                          {order.order_number}
                        </strong>

                      </td>


                      {/* CLIENTE */}

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


                      {/* FECHA */}

                      <td>

                        {new Date(
                          order.created_at
                        ).toLocaleDateString(
                          "es-PE"
                        )}

                      </td>


                      {/* PRODUCTOS */}

                      <td>

                        {order.items.reduce(
                          (
                            total,
                            item
                          ) =>
                            total +
                            item.quantity,
                          0
                        )}

                      </td>


                      {/* TOTAL */}

                      <td>

                        <strong>

                          S/{" "}

                          {Number(
                            order.total
                          ).toFixed(2)}

                        </strong>

                      </td>


                      {/* PAGO */}

                      <td>

                        <span
                          className={
                            `admin-payment-status ${order.payment_status}`
                          }
                        >

                          {getPaymentStatusLabel(
                            order.payment_status
                          )}

                        </span>

                      </td>


                      {/* ESTADO */}

                      <td>

                        <span
                          className={
                            `admin-order-status ${order.status}`
                          }
                        >

                          {getOrderStatusLabel(
                            order.status
                          )}

                        </span>

                      </td>


                      {/* DETALLE */}

                      <td>

                        <Link
                          to={
                            `/admin/pedidos/${order.id}`
                          }
                          className="admin-order-detail-link"
                        >

                          <Eye
                            size={16}
                          />

                          Ver

                        </Link>

                      </td>

                    </tr>

                  )
                )}

              </tbody>

            </table>

          </div>

        )}

      </section>

    </main>
  );
}


export default AdminOrders;