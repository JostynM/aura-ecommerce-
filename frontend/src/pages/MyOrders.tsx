import {
  useEffect,
  useState,
} from "react";

import {
  ArrowLeft,
  ArrowRight,
  Package,
  ShoppingBag,
} from "lucide-react";

import {
  Link,
  useNavigate,
} from "react-router-dom";

import {
  useAuth,
} from "../context/useAuth";

import {
  getOrders,
  type OrderResponse,
  type OrderStatus,
  type PaymentStatus,
  type PaginatedOrdersResponse,
} from "../services/orderService";

import "./MyOrders.css";


// ==========================================
// CONFIGURACIÓN DE PAGINACIÓN
// ==========================================

const PAGE_SIZE = 10;


// ==========================================
// ESTADOS DEL PEDIDO
// ==========================================

const ORDER_STATUS_LABELS:
  Record<OrderStatus, string> = {

    pending:
      "Pendiente",

    confirmed:
      "Confirmado",

    processing:
      "En preparación",

    shipped:
      "Enviado",

    delivered:
      "Entregado",

    cancelled:
      "Cancelado",

  };


// ==========================================
// ESTADOS DEL PAGO
// ==========================================

const PAYMENT_STATUS_LABELS:
  Record<PaymentStatus, string> = {

    pending:
      "Pago pendiente",

    paid:
      "Pagado",

    failed:
      "Pago fallido",

    refunded:
      "Reembolsado",

  };


// ==========================================
// FORMATEAR PRECIO
// ==========================================

function formatPrice(
  value: string | number
) {

  const amount =
    Number(value);


  if (
    Number.isNaN(amount)
  ) {

    return "S/ 0.00";

  }


  return new Intl.NumberFormat(
    "es-PE",
    {
      style:
        "currency",

      currency:
        "PEN",

      minimumFractionDigits:
        2,
    }
  ).format(
    amount
  );

}


// ==========================================
// FORMATEAR FECHA
// ==========================================

function formatDate(
  value: string
) {

  const date =
    new Date(value);


  if (
    Number.isNaN(
      date.getTime()
    )
  ) {

    return value;

  }


  return new Intl.DateTimeFormat(
    "es-PE",
    {
      day:
        "2-digit",

      month:
        "long",

      year:
        "numeric",

      timeZone:
        "America/Lima",
    }
  ).format(
    date
  );

}


// ==========================================
// TOTAL DE PRODUCTOS
// ==========================================

function getTotalItems(
  order: OrderResponse
) {

  return order.items.reduce(
    (
      total,
      item
    ) => {

      return (
        total +
        item.quantity
      );

    },
    0
  );

}


// ==========================================
// ESTADO DE ERROR POR PÁGINA
// ==========================================

type OrdersErrorState = {
  page: number;
  message: string;
};


// ==========================================
// MIS PEDIDOS
// ==========================================

function MyOrders() {

  const navigate =
    useNavigate();


  // ========================================
  // AUTENTICACIÓN
  // ========================================

  const {
    token,
    loading:
      authLoading,
    isAuthenticated,
  } =
    useAuth();


  // ========================================
  // PAGINACIÓN
  // ========================================

  const [
    page,
    setPage,
  ] =
    useState(1);


  // ========================================
  // DATOS PAGINADOS
  // ========================================

  const [
    pageData,
    setPageData,
  ] =
    useState<
      PaginatedOrdersResponse | null
    >(
      null
    );


  // ========================================
  // ERROR
  // ========================================

  const [
    errorState,
    setErrorState,
  ] =
    useState<
      OrdersErrorState | null
    >(
      null
    );


  // ========================================
  // ERROR DE LA PÁGINA ACTUAL
  // ========================================

  const currentError =
    errorState?.page === page
      ? errorState.message
      : "";


  // ========================================
  // DATOS DE LA PÁGINA ACTUAL
  // ========================================

  const currentPageData =
    pageData?.page === page
      ? pageData
      : null;


  const orders =
    currentPageData?.items ??
    [];


  const totalOrders =
    currentPageData?.total ??
    0;


  const totalPages =
    currentPageData?.total_pages ??
    0;


  // ========================================
  // CARGA DERIVADA
  //
  // Evitamos llamar setLoading(true)
  // directamente dentro del useEffect.
  // ========================================

  const ordersLoading =
    !authLoading &&
    isAuthenticated &&
    Boolean(token) &&
    !currentPageData &&
    !currentError;


  // ========================================
  // CARGAR PEDIDOS
  // ========================================

  useEffect(() => {

    // ======================================
    // ESPERAR AUTENTICACIÓN
    // ======================================

    if (
      authLoading
    ) {

      return;

    }


    // ======================================
    // USUARIO SIN SESIÓN
    // ======================================

    if (
      !isAuthenticated ||
      !token
    ) {

      navigate(
        "/login",
        {
          replace: true,
        }
      );

      return;

    }


    // ======================================
    // TOKEN VALIDADO
    // ======================================

    const authToken =
      token;


    const requestedPage =
      page;


    let active =
      true;


    async function loadOrders() {

      try {

        const data =
          await getOrders(
            authToken,
            requestedPage,
            PAGE_SIZE
          );


        if (
          !active
        ) {

          return;

        }


        setPageData(
          data
        );


        setErrorState(
          null
        );

      } catch (
        requestError
      ) {

        if (
          !active
        ) {

          return;

        }


        const message =
          requestError
            instanceof Error
            ? requestError.message
            : "No pudimos cargar tus pedidos.";


        setErrorState({
          page:
            requestedPage,

          message,
        });

      }

    }


    void loadOrders();


    return () => {

      active =
        false;

    };

  }, [
    authLoading,
    isAuthenticated,
    navigate,
    page,
    token,
  ]);


  // ========================================
  // CAMBIAR DE PÁGINA
  // ========================================

  function goToPreviousPage() {

    if (
      page <= 1
    ) {

      return;

    }


    setPage(
      (
        currentPage
      ) =>
        currentPage - 1
    );


    window.scrollTo({
      top: 0,
      behavior:
        "smooth",
    });

  }


  function goToNextPage() {

    if (
      totalPages === 0 ||
      page >= totalPages
    ) {

      return;

    }


    setPage(
      (
        currentPage
      ) =>
        currentPage + 1
    );


    window.scrollTo({
      top: 0,
      behavior:
        "smooth",
    });

  }


  // ========================================
  // AUTENTICACIÓN CARGANDO
  // ========================================

  if (
    authLoading
  ) {

    return (

      <main className="my-orders-page">

        <div className="my-orders-state">

          <ShoppingBag
            size={28}
            strokeWidth={1.2}
          />

          <span>
            AURA
          </span>

          <h1>
            Preparando tu cuenta...
          </h1>

        </div>

      </main>

    );

  }


  // ========================================
  // PEDIDOS CARGANDO
  // ========================================

  if (
    ordersLoading
  ) {

    return (

      <main className="my-orders-page">

        <div className="my-orders-state">

          <Package
            size={28}
            strokeWidth={1.2}
          />

          <span>
            AURA
          </span>

          <h1>
            Cargando tus pedidos...
          </h1>

        </div>

      </main>

    );

  }


  // ========================================
  // RENDER
  // ========================================

  return (

    <main className="my-orders-page">


      {/* =====================================
          CABECERA
      ===================================== */}

      <section className="my-orders-header">

        <Link
          to="/cuenta"
          className="my-orders-back"
        >

          <ArrowLeft
            size={15}
            strokeWidth={1.5}
          />

          Mi cuenta

        </Link>


        <span className="my-orders-eyebrow">

          AURA · MI CUENTA

        </span>


        <h1>
          Mis pedidos
        </h1>


        <p>

          Consulta tus compras,
          pagos y el estado de
          cada pedido.

        </p>

      </section>


      {/* =====================================
          ERROR
      ===================================== */}

      {currentError && (

        <section className="my-orders-message">

          <Package
            size={26}
            strokeWidth={1.2}
          />

          <h2>
            No pudimos cargar tus pedidos
          </h2>


          <p>
            {currentError}
          </p>

        </section>

      )}


      {/* =====================================
          SIN PEDIDOS
      ===================================== */}

      {!currentError &&
        currentPageData &&
        totalOrders === 0 && (

        <section className="my-orders-empty">

          <div className="my-orders-empty-icon">

            <ShoppingBag
              size={30}
              strokeWidth={1.1}
            />

          </div>


          <span>
            TU HISTORIAL
          </span>


          <h2>
            Aún no tienes pedidos
          </h2>


          <p>

            Cuando realices tu primera
            compra aparecerá aquí junto
            con toda la información de
            seguimiento.

          </p>


          <Link
            to="/perfumes"
            className="my-orders-shop-link"
          >

            Explorar perfumes

            <ArrowRight
              size={15}
              strokeWidth={1.5}
            />

          </Link>

        </section>

      )}


      {/* =====================================
          LISTADO
      ===================================== */}

      {!currentError &&
        currentPageData &&
        orders.length > 0 && (

        <section className="my-orders-content">


          {/* =================================
              RESUMEN
          ================================= */}

          <div className="my-orders-summary">

            <span>
              HISTORIAL DE COMPRAS
            </span>


            <p>

              {totalOrders}{" "}

              {totalOrders === 1
                ? "pedido"
                : "pedidos"}

            </p>

          </div>


          {/* =================================
              LISTA
          ================================= */}

          <div className="my-orders-list">

            {orders.map(
              (
                order
              ) => {

                const totalItems =
                  getTotalItems(
                    order
                  );


                return (

                  <article
                    key={
                      order.id
                    }
                    className="my-order-card"
                  >


                    {/* =========================
                        CABECERA
                    ========================= */}

                    <div className="my-order-card-header">

                      <div>

                        <span className="my-order-card-label">

                          PEDIDO

                        </span>


                        <h2>

                          {
                            order.order_number
                          }

                        </h2>

                      </div>


                      <span
                        className={
                          `my-order-status my-order-status-${order.status}`
                        }
                      >

                        {
                          ORDER_STATUS_LABELS[
                            order.status
                          ]
                        }

                      </span>

                    </div>


                    {/* =========================
                        INFORMACIÓN
                    ========================= */}

                    <div className="my-order-card-information">


                      {/* FECHA */}

                      <div>

                        <span>
                          Fecha
                        </span>

                        <strong>

                          {formatDate(
                            order.created_at
                          )}

                        </strong>

                      </div>


                      {/* PRODUCTOS */}

                      <div>

                        <span>
                          Productos
                        </span>

                        <strong>

                          {totalItems}{" "}

                          {totalItems === 1
                            ? "producto"
                            : "productos"}

                        </strong>

                      </div>


                      {/* PAGO */}

                      <div>

                        <span>
                          Pago
                        </span>

                        <strong
                          className={
                            `my-payment-status my-payment-status-${order.payment_status}`
                          }
                        >

                          {
                            PAYMENT_STATUS_LABELS[
                              order.payment_status
                            ]
                          }

                        </strong>

                      </div>


                      {/* TOTAL */}

                      <div>

                        <span>
                          Total
                        </span>

                        <strong className="my-order-card-total">

                          {formatPrice(
                            order.total
                          )}

                        </strong>

                      </div>

                    </div>


                    {/* =========================
                        PRODUCTOS
                    ========================= */}

                    <div className="my-order-card-products">

                      {order.items
                        .slice(
                          0,
                          2
                        )
                        .map(
                          (
                            item
                          ) => (

                            <div
                              key={
                                item.id
                              }
                              className="my-order-card-product"
                            >

                              <div>

                                <span>

                                  {
                                    item.brand
                                  }

                                </span>


                                <strong>

                                  {
                                    item.product_name
                                  }

                                </strong>

                              </div>


                              <p>

                                {
                                  item.quantity
                                }

                                {" × "}

                                {formatPrice(
                                  item.unit_price
                                )}

                              </p>

                            </div>

                          )
                        )}


                      {order.items.length >
                        2 && (

                        <p className="my-order-card-more">

                          +

                          {
                            order.items.length -
                            2
                          }

                          {" productos más"}

                        </p>

                      )}

                    </div>


                    {/* =========================
                        FOOTER
                    ========================= */}

                    <div className="my-order-card-footer">

                      <div>

                        <span>
                          Entrega
                        </span>


                        <p>

                          {
                            order.district
                          },

                          {" "}

                          {
                            order.province
                          }

                        </p>

                      </div>


                      <Link
                        to={
                          `/cuenta/pedidos/${order.id}`
                        }
                        className="my-order-detail-link"
                      >

                        Ver detalle

                        <ArrowRight
                          size={15}
                          strokeWidth={1.5}
                        />

                      </Link>

                    </div>

                  </article>

                );

              }
            )}

          </div>


          {/* =================================
              PAGINACIÓN
          ================================= */}

          {totalPages > 1 && (

            <div className="my-orders-pagination">

              <button
                type="button"
                className="my-orders-pagination-button"
                onClick={
                  goToPreviousPage
                }
                disabled={
                  page <= 1
                }
              >

                <ArrowLeft
                  size={14}
                  strokeWidth={1.4}
                />

                Anterior

              </button>


              <div className="my-orders-pagination-info">

                <span>
                  PÁGINA
                </span>

                <strong>

                  {page}

                  {" DE "}

                  {totalPages}

                </strong>

              </div>


              <button
                type="button"
                className="my-orders-pagination-button"
                onClick={
                  goToNextPage
                }
                disabled={
                  page >=
                  totalPages
                }
              >

                Siguiente

                <ArrowRight
                  size={14}
                  strokeWidth={1.4}
                />

              </button>

            </div>

          )}

        </section>

      )}

    </main>

  );

}


export default MyOrders;