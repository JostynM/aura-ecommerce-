import {
  useEffect,
  useState,
} from "react";

import {
  ArrowLeft,
  Check,
  Clock3,
  CreditCard,
  MapPin,
  Package,
  ReceiptText,
  Truck,
} from "lucide-react";

import {
  Link,
  useNavigate,
  useParams,
} from "react-router-dom";

import {
  useAuth,
} from "../context/useAuth";

import {
  getOrderById,
  type OrderResponse,
  type OrderStatus,
  type PaymentStatus,
} from "../services/orderService";

import "./OrderDetail.css";


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
// ESTADOS DE PAGO
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
// PASOS DEL PEDIDO
// ==========================================

const ORDER_STEPS: {
  status: OrderStatus;
  label: string;
}[] = [

  {
    status: "pending",
    label: "Pedido recibido",
  },

  {
    status: "confirmed",
    label: "Confirmado",
  },

  {
    status: "processing",
    label: "En preparación",
  },

  {
    status: "shipped",
    label: "Enviado",
  },

  {
    status: "delivered",
    label: "Entregado",
  },

];


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
      style: "currency",
      currency: "PEN",
      minimumFractionDigits: 2,
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


  return date.toLocaleString(
    "es-PE",
    {
      timeZone:
        "America/Lima",

      day:
        "2-digit",

      month:
        "long",

      year:
        "numeric",

      hour:
        "2-digit",

      minute:
        "2-digit",
    }
  );

}


// ==========================================
// TIPO DE ERROR
// ==========================================

type OrderErrorState = {
  orderId: number;
  message: string;
};


// ==========================================
// ORDER DETAIL
// ==========================================

function OrderDetail() {

  // ========================================
  // ROUTER
  // ========================================

  const {
    orderId,
  } =
    useParams();


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
  // ESTADOS
  // ========================================

  const [
    order,
    setOrder,
  ] =
    useState<OrderResponse | null>(
      null
    );


  const [
    errorState,
    setErrorState,
  ] =
    useState<OrderErrorState | null>(
      null
    );


  // ========================================
  // ID DEL PEDIDO
  // ========================================

  const parsedOrderId =
    Number(orderId);


  const invalidOrderId =
    !orderId ||
    Number.isNaN(
      parsedOrderId
    );


  // ========================================
  // ERROR DEL PEDIDO ACTUAL
  // ========================================

  const currentError =
    !invalidOrderId &&
    errorState?.orderId ===
      parsedOrderId
      ? errorState.message
      : "";


  // ========================================
  // ESTADO DE CARGA DERIVADO
  // ========================================

  const orderLoading =
    !invalidOrderId &&
    !currentError &&
    order?.id !==
      parsedOrderId;


  // ========================================
  // CARGAR PEDIDO
  // ========================================

  useEffect(() => {

    // ======================================
    // ESPERAR AUTH
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
    // ID INVÁLIDO
    // ======================================

    if (
      invalidOrderId
    ) {

      return;

    }


    // ======================================
    // TOKEN YA VALIDADO
    // ======================================

    const authToken =
      token;


    const requestedOrderId =
      parsedOrderId;


    let active =
      true;


    async function loadOrder() {

      try {

        const data =
          await getOrderById(
            authToken,
            requestedOrderId
          );


        if (
          !active
        ) {

          return;

        }


        setOrder(
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


        setOrder(
          null
        );


        if (
          requestError
            instanceof Error
        ) {

          setErrorState({
            orderId:
              requestedOrderId,

            message:
              requestError.message,
          });

        } else {

          setErrorState({
            orderId:
              requestedOrderId,

            message:
              "No se pudo cargar el pedido.",
          });

        }

      }

    }


    void loadOrder();


    return () => {

      active =
        false;

    };

  }, [
    authLoading,
    invalidOrderId,
    isAuthenticated,
    navigate,
    parsedOrderId,
    token,
  ]);


  // ========================================
  // AUTENTICACIÓN CARGANDO
  // ========================================

  if (
    authLoading
  ) {

    return (

      <main className="order-detail-page">

        <section className="order-detail-state">

          <Package
            size={30}
            strokeWidth={1.2}
          />

          <span>
            AURA
          </span>

          <h1>
            Preparando tu cuenta...
          </h1>

        </section>

      </main>

    );

  }


  // ========================================
  // PEDIDO CARGANDO
  // ========================================

  if (
    orderLoading
  ) {

    return (

      <main className="order-detail-page">

        <section className="order-detail-state">

          <Package
            size={30}
            strokeWidth={1.2}
          />

          <span>
            AURA
          </span>

          <h1>
            Cargando pedido...
          </h1>

        </section>

      </main>

    );

  }


  // ========================================
  // ERROR
  // ========================================

  if (
    invalidOrderId ||
    currentError ||
    !order
  ) {

    const errorMessage =
      invalidOrderId
        ? "Pedido no válido."
        : currentError ||
          "El pedido solicitado no está disponible.";


    return (

      <main className="order-detail-page">

        <section className="order-detail-state">

          <ReceiptText
            size={30}
            strokeWidth={1.2}
          />

          <span>
            AURA
          </span>

          <h1>
            No pudimos encontrar el pedido
          </h1>


          <p>

            {errorMessage}

          </p>


          <Link
            to="/cuenta/pedidos"
            className="order-detail-state-link"
          >

            <ArrowLeft
              size={15}
              strokeWidth={1.5}
            />

            Volver a mis pedidos

          </Link>

        </section>

      </main>

    );

  }


  // ========================================
  // PASO ACTUAL
  // ========================================

  const currentStepIndex =
    ORDER_STEPS.findIndex(
      (
        step
      ) =>
        step.status ===
        order.status
    );


  // ========================================
  // RENDER
  // ========================================

  return (

    <main className="order-detail-page">


      {/* =====================================
          CABECERA
      ===================================== */}

      <section className="order-detail-header">

        <Link
          to="/cuenta/pedidos"
          className="order-detail-back"
        >

          <ArrowLeft
            size={15}
            strokeWidth={1.5}
          />

          Mis pedidos

        </Link>


        <div className="order-detail-heading">

          <div>

            <span className="order-detail-eyebrow">

              AURA · PEDIDO

            </span>


            <h1>

              {order.order_number}

            </h1>


            <p>

              Realizado el{" "}

              {formatDate(
                order.created_at
              )}

            </p>

          </div>


          <div
            className={
              `order-detail-status order-detail-status-${order.status}`
            }
          >

            {
              ORDER_STATUS_LABELS[
                order.status
              ]
            }

          </div>

        </div>

      </section>


      {/* =====================================
          SEGUIMIENTO
      ===================================== */}

      <section className="order-tracking-section">

        <div className="order-section-heading">

          <span>
            SEGUIMIENTO
          </span>

          <h2>
            Estado de tu pedido
          </h2>

        </div>


        {order.status ===
        "cancelled" ? (

          <div className="order-cancelled-box">

            <Package
              size={22}
              strokeWidth={1.2}
            />


            <div>

              <strong>
                Pedido cancelado
              </strong>


              <p>

                Este pedido ya no
                continuará con el
                proceso de preparación
                y entrega.

              </p>

            </div>

          </div>

        ) : (

          <div className="order-tracking">

            {ORDER_STEPS.map(
              (
                step,
                index
              ) => {

                const completed =
                  index <=
                  currentStepIndex;


                const current =
                  index ===
                  currentStepIndex;


                return (

                  <div
                    key={
                      step.status
                    }

                    className={
                      completed
                        ? "tracking-step tracking-step-completed"
                        : "tracking-step"
                    }
                  >

                    <div className="tracking-step-indicator">

                      <div
                        className={
                          current
                            ? "tracking-dot tracking-dot-current"
                            : "tracking-dot"
                        }
                      >

                        {completed && (

                          <Check
                            size={12}
                            strokeWidth={2}
                          />

                        )}

                      </div>


                      {index <
                        ORDER_STEPS.length -
                          1 && (

                        <div
                          className={
                            index <
                            currentStepIndex
                              ? "tracking-line tracking-line-completed"
                              : "tracking-line"
                          }
                        />

                      )}

                    </div>


                    <span>

                      {step.label}

                    </span>

                  </div>

                );

              }
            )}

          </div>

        )}

      </section>


      {/* =====================================
          CONTENIDO PRINCIPAL
      ===================================== */}

      <section className="order-detail-grid">


        {/* ===================================
            PRODUCTOS
        =================================== */}

        <div className="order-detail-main">

          <div className="order-section-heading">

            <span>
              TU COMPRA
            </span>

            <h2>
              Productos
            </h2>

          </div>


          <div className="order-products-list">

            {order.items.map(
              (
                item
              ) => (

                <article
                  key={
                    item.id
                  }

                  className="order-product-item"
                >

                  <div className="order-product-icon">

                    <Package
                      size={21}
                      strokeWidth={1.2}
                    />

                  </div>


                  <div className="order-product-info">

                    <span>

                      {item.brand}

                    </span>


                    <h3>

                      {item.product_name}

                    </h3>


                    <p>

                      {item.size_ml} ml

                    </p>

                  </div>


                  <div className="order-product-quantity">

                    <span>
                      Cantidad
                    </span>

                    <strong>

                      {item.quantity}

                    </strong>

                  </div>


                  <div className="order-product-price">

                    <span>

                      {item.quantity}

                      {" × "}

                      {formatPrice(
                        item.unit_price
                      )}

                    </span>


                    <strong>

                      {formatPrice(
                        item.line_total
                      )}

                    </strong>

                  </div>

                </article>

              )
            )}

          </div>


          {/* =================================
              DIRECCIÓN
          ================================= */}

          <div className="order-address-section">

            <div className="order-section-icon">

              <MapPin
                size={20}
                strokeWidth={1.3}
              />

            </div>


            <div>

              <span className="order-small-label">

                ENTREGA

              </span>


              <h3>

                Dirección de entrega

              </h3>


              <strong>

                {order.recipient_name}

              </strong>


              <p>

                {order.address_line}

              </p>


              <p>

                {order.district},
                {" "}
                {order.province},
                {" "}
                {order.department}

              </p>


              <p>

                Tel.{" "}
                {order.phone}

              </p>


              {order.reference && (

                <p className="order-address-reference">

                  Referencia:{" "}

                  {order.reference}

                </p>

              )}

            </div>

          </div>

        </div>


        {/* ===================================
            RESUMEN
        =================================== */}

        <aside className="order-detail-summary">


          {/* =================================
              TÍTULO
          ================================= */}

          <div className="order-summary-title">

            <ReceiptText
              size={19}
              strokeWidth={1.3}
            />

            <h2>
              Resumen
            </h2>

          </div>


          {/* =================================
              ESTADO DE PAGO
          ================================= */}

          <div className="order-summary-status">

            <CreditCard
              size={17}
              strokeWidth={1.3}
            />


            <div>

              <span>

                Estado del pago

              </span>


              <strong
                className={
                  `order-payment-${order.payment_status}`
                }
              >

                {
                  PAYMENT_STATUS_LABELS[
                    order.payment_status
                  ]
                }

              </strong>

            </div>

          </div>


          {/* =================================
              ESTADO DE ENVÍO
          ================================= */}

          <div className="order-summary-status">

            <Truck
              size={17}
              strokeWidth={1.3}
            />


            <div>

              <span>

                Estado del envío

              </span>


              <strong>

                {
                  ORDER_STATUS_LABELS[
                    order.status
                  ]
                }

              </strong>

            </div>

          </div>


          {/* =================================
              PROCESAMIENTO
          ================================= */}

          {order.scheduled_processing_at && (

            <div className="order-summary-status">

              <Clock3
                size={17}
                strokeWidth={1.3}
              />


              <div>

                <span>
                  Procesamiento
                </span>


                <strong>

                  {formatDate(
                    order.scheduled_processing_at
                  )}

                </strong>

              </div>

            </div>

          )}


          {/* =================================
              SUBTOTAL Y ENVÍO
          ================================= */}

          <div className="order-summary-prices">

            <div>

              <span>
                Subtotal
              </span>


              <strong>

                {formatPrice(
                  order.subtotal
                )}

              </strong>

            </div>


            <div>

              <span>
                Envío
              </span>


              <strong>

                {Number(
                  order.shipping_cost
                ) === 0
                  ? "Gratis"
                  : formatPrice(
                      order.shipping_cost
                    )}

              </strong>

            </div>

          </div>


          {/* =================================
              TOTAL
          ================================= */}

          <div className="order-summary-total">

            <span>
              Total
            </span>


            <strong>

              {formatPrice(
                order.total
              )}

            </strong>

          </div>


          {/* =================================
              SEGUIR COMPRANDO
          ================================= */}

          <Link
            to="/perfumes"
            className="order-detail-shop"
          >

            Seguir comprando

          </Link>

        </aside>

      </section>

    </main>

  );

}


export default OrderDetail;