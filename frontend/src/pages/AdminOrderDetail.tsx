import { useEffect, useState } from "react";
import {
  Link,
  Navigate,
  useParams,
} from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  CreditCard,
  MapPin,
  Package,
  Phone,
  ShoppingBag,
  User,
} from "lucide-react";

import { useAuth } from "../context/useAuth";
import {
  getAdminOrderById,
  refundAdminOrder,
  updateOrderStatus,
  type OrderResponse,
  type OrderStatus,
  type PaymentStatus,
  type RefundResponse,
  type StockStatus,
} from "../services/orderService";

import "./AdminOrderDetail.css";

function getOrderStatusLabel(status: OrderStatus) {
  switch (status) {
    case "confirmed":
      return "Confirmado";
    case "processing":
      return "Preparando";
    case "shipped":
      return "Despachado";
    case "delivered":
      return "Entregado";
    case "cancelled":
      return "Cancelado";
    case "pending":
    default:
      return "Pendiente";
  }
}

function getPaymentStatusLabel(status: PaymentStatus) {
  switch (status) {
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

function getStockStatusLabel(status: StockStatus) {
  switch (status) {
    case "reserved":
      return "Reservado";
    case "committed":
      return "Confirmado";
    case "released":
      return "Liberado";
    case "legacy":
      return "Pedido anterior";
    default:
      return status;
  }
}

function formatProcessingDate(value: string) {
  return new Date(value).toLocaleString(
    "es-PE",
    {
      timeZone: "America/Lima",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  );
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString(
    "es-PE",
    {
      timeZone: "America/Lima",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  );
}

function getNextOrderStatus(
  status: OrderStatus
): OrderStatus | null {
  switch (status) {
    case "confirmed":
      return "processing";
    case "processing":
      return "shipped";
    case "shipped":
      return "delivered";
    default:
      return null;
  }
}

function getOrderActionLabel(
  status: OrderStatus
) {
  switch (status) {
    case "confirmed":
      return "Iniciar preparación";
    case "processing":
      return "Marcar como despachado";
    case "shipped":
      return "Marcar como entregado";
    default:
      return "";
  }
}

function AdminOrderDetail() {
  const { orderId } = useParams();

  const {
    user,
    token,
    isAuthenticated,
    loading: authLoading,
  } = useAuth();

  const [order, setOrder] =
    useState<OrderResponse | null>(null);

  const [orderLoading, setOrderLoading] =
    useState(true);

  const [updating, setUpdating] =
    useState(false);

  const [refunding, setRefunding] =
    useState(false);

  const [refundResult, setRefundResult] =
    useState<RefundResponse | null>(null);

  const [error, setError] =
    useState("");

  const [currentTime, setCurrentTime] =
    useState<number | null>(null);

  useEffect(() => {
    const updateCurrentTime = () => {
      setCurrentTime(Date.now());
    };

    updateCurrentTime();

    const intervalId = window.setInterval(
      updateCurrentTime,
      30000
    );

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  const numericOrderId = Number(orderId);

  useEffect(() => {
    async function loadOrder() {
      if (
        !token ||
        !Number.isInteger(numericOrderId)
      ) {
        return;
      }

      try {
        setOrderLoading(true);
        setError("");

        const data = await getAdminOrderById(
          token,
          numericOrderId
        );

        setOrder(data);
      } catch (requestError) {
        if (requestError instanceof Error) {
          setError(requestError.message);
        } else {
          setError(
            "No se pudo cargar el pedido."
          );
        }
      } finally {
        setOrderLoading(false);
      }
    }

    if (
      user?.role === "admin" &&
      token
    ) {
      void loadOrder();
    }
  }, [
    token,
    user?.role,
    numericOrderId,
  ]);

  const handleStatusChange = async (
    newStatus: OrderStatus
  ) => {
    if (!token || !order) {
      return;
    }

    try {
      setUpdating(true);
      setError("");

      const updatedOrder =
        await updateOrderStatus(
          token,
          order.id,
          newStatus
        );

      setOrder(updatedOrder);
    } catch (requestError) {
      if (requestError instanceof Error) {
        setError(requestError.message);
      } else {
        setError(
          "No se pudo actualizar el pedido."
        );
      }
    } finally {
      setUpdating(false);
    }
  };

  const handleRefund = async () => {
    if (!token || !order) {
      return;
    }

    const confirmed = window.confirm(
      `¿Confirmas el reembolso total de S/ ${Number(
        order.total
      ).toFixed(2)} para el pedido ${order.order_number}?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setRefunding(true);
      setError("");
      setRefundResult(null);

      const result = await refundAdminOrder(
        token,
        order.id
      );

      setRefundResult(result);

      setOrder((currentOrder) => {
        if (!currentOrder) {
          return currentOrder;
        }

        return {
          ...currentOrder,
          payment_status: "refunded",
        };
      });
    } catch (requestError) {
      if (requestError instanceof Error) {
        setError(requestError.message);
      } else {
        setError(
          "No se pudo reembolsar el pago."
        );
      }
    } finally {
      setRefunding(false);
    }
  };

  if (authLoading) {
    return (
      <main className="admin-order-detail-page">
        <p>Cargando...</p>
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

  if (!Number.isInteger(numericOrderId)) {
    return (
      <main className="admin-order-detail-page">
        <section className="admin-order-detail-container">
          <p className="admin-order-detail-error">
            El ID del pedido no es válido.
          </p>

          <Link to="/admin/pedidos">
            Volver a pedidos
          </Link>
        </section>
      </main>
    );
  }

  if (orderLoading) {
    return (
      <main className="admin-order-detail-page">
        <section className="admin-order-detail-container">
          <p>Cargando pedido...</p>
        </section>
      </main>
    );
  }

  if (error && !order) {
    return (
      <main className="admin-order-detail-page">
        <section className="admin-order-detail-container">
          <p className="admin-order-detail-error">
            {error}
          </p>

          <Link to="/admin/pedidos">
            Volver a pedidos
          </Link>
        </section>
      </main>
    );
  }

  if (!order) {
    return null;
  }

  const nextStatus =
    getNextOrderStatus(order.status);

  const actionLabel =
    getOrderActionLabel(order.status);

  const scheduledProcessingTimestamp =
    order.scheduled_processing_at
      ? new Date(
          order.scheduled_processing_at
        ).getTime()
      : null;

  const hasValidScheduledProcessing =
    scheduledProcessingTimestamp !== null &&
    !Number.isNaN(
      scheduledProcessingTimestamp
    );

  const processingAvailable =
    scheduledProcessingTimestamp === null ||
    Number.isNaN(
      scheduledProcessingTimestamp
    ) ||
    (
      currentTime !== null &&
      currentTime >=
        scheduledProcessingTimestamp
    );

  const waitingForProcessingWindow =
    order.status === "confirmed" &&
    order.payment_status === "paid" &&
    hasValidScheduledProcessing &&
    !processingAvailable;

  const requiresRefundReview =
    order.payment_status === "paid" &&
    order.status === "cancelled" &&
    order.stock_status === "released";

  const isRefunded =
    order.payment_status === "refunded";

  return (
    <main className="admin-order-detail-page">
      <section className="admin-order-detail-container">
        <div className="admin-order-detail-back">
          <Link to="/admin/pedidos">
            <ArrowLeft size={17} />
            Volver a pedidos
          </Link>
        </div>

        <header className="admin-order-detail-header">
          <div>
            <span>PEDIDO</span>

            <h1>{order.order_number}</h1>

            <p>
              Realizado el{" "}
              {new Date(
                order.created_at
              ).toLocaleString("es-PE")}
            </p>
          </div>

          <div className="admin-order-total-header">
            <span>Total</span>

            <strong>
              S/{" "}
              {Number(
                order.total
              ).toFixed(2)}
            </strong>
          </div>
        </header>

        {error && (
          <p className="admin-order-detail-error">
            {error}
          </p>
        )}

        {refundResult && (
          <div className="admin-order-completed">
            <CheckCircle2 size={18} />

            <div>
              <strong>
                Pago reembolsado correctamente
              </strong>

              <div>
                {refundResult.mercado_pago_refund_id && (
                  <>
                    ID:{" "}
                    {
                      refundResult.mercado_pago_refund_id
                    }
                    {" · "}
                  </>
                )}

                {formatDateTime(
                  refundResult.refunded_at
                )}
              </div>
            </div>
          </div>
        )}

        {requiresRefundReview && (
          <div className="admin-order-management-note">
            <AlertTriangle size={18} />

            <div>
              <strong>
                Este pedido requiere revisión.
              </strong>

              <div>
                El pago fue confirmado después de
                que la reserva de stock había sido
                liberada. Puedes realizar un
                reembolso total desde la sección
                de gestión.
              </div>
            </div>
          </div>
        )}

        <section className="admin-order-status-grid">
          <article>
            <ShoppingBag size={21} />

            <div>
              <span>
                Estado del pedido
              </span>

              <strong>
                {getOrderStatusLabel(
                  order.status
                )}
              </strong>
            </div>
          </article>

          <article>
            <CreditCard size={21} />

            <div>
              <span>
                Estado del pago
              </span>

              <strong>
                {getPaymentStatusLabel(
                  order.payment_status
                )}
              </strong>
            </div>
          </article>

          <article>
            <Package size={21} />

            <div>
              <span>
                Estado del stock
              </span>

              <strong>
                {getStockStatusLabel(
                  order.stock_status
                )}
              </strong>
            </div>
          </article>

          <article>
            <Clock3 size={21} />

            <div>
              <span>
                {isRefunded
                  ? "Reembolso"
                  : order.payment_status === "paid"
                    ? "Procesamiento"
                    : "Reserva"}
              </span>

              <strong>
                {isRefunded
                  ? "Pago devuelto"
                  : order.payment_status === "paid"
                    ? order.status === "processing"
                      ? "Preparación iniciada"
                      : order.status === "shipped"
                        ? "Despachado"
                        : order.status === "delivered"
                          ? "Completado"
                          : order.status === "cancelled"
                            ? "No aplica"
                            : waitingForProcessingWindow &&
                                order.scheduled_processing_at
                              ? `Desde ${formatProcessingDate(
                                  order.scheduled_processing_at
                                )}`
                              : "Disponible para preparar"
                    : order.stock_reserved_until
                      ? new Date(
                          order.stock_reserved_until
                        ).toLocaleTimeString(
                          "es-PE",
                          {
                            timeZone:
                              "America/Lima",
                            hour: "2-digit",
                            minute: "2-digit",
                          }
                        )
                      : "Sin reserva activa"}
              </strong>
            </div>
          </article>
        </section>

        <section className="admin-order-info-grid">
          <article className="admin-order-card">
            <div className="admin-order-card-title">
              <User size={19} />
              <h2>Cliente</h2>
            </div>

            <strong>
              {order.recipient_name}
            </strong>

            <div className="admin-order-info-line">
              <Phone size={15} />
              <span>{order.phone}</span>
            </div>
          </article>

          <article className="admin-order-card">
            <div className="admin-order-card-title">
              <MapPin size={19} />
              <h2>
                Dirección de envío
              </h2>
            </div>

            <p>{order.address_line}</p>

            <p>
              {order.district},{" "}
              {order.province},{" "}
              {order.department}
            </p>

            {order.reference && (
              <small>
                Referencia:{" "}
                {order.reference}
              </small>
            )}
          </article>
        </section>

        <section className="admin-order-products-card">
          <div className="admin-order-section-title">
            <Package size={19} />
            <h2>
              Productos del pedido
            </h2>
          </div>

          <div className="admin-order-products-table-wrapper">
            <table className="admin-order-products-table">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Marca</th>
                  <th>Tamaño</th>
                  <th>Precio</th>
                  <th>Cantidad</th>
                  <th>Subtotal</th>
                </tr>
              </thead>

              <tbody>
                {order.items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>
                        {item.product_name}
                      </strong>
                    </td>

                    <td>{item.brand}</td>

                    <td>
                      {item.size_ml} ml
                    </td>

                    <td>
                      S/{" "}
                      {Number(
                        item.unit_price
                      ).toFixed(2)}
                    </td>

                    <td>{item.quantity}</td>

                    <td>
                      <strong>
                        S/{" "}
                        {Number(
                          item.line_total
                        ).toFixed(2)}
                      </strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="admin-order-summary">
            <div>
              <span>Subtotal</span>

              <strong>
                S/{" "}
                {Number(
                  order.subtotal
                ).toFixed(2)}
              </strong>
            </div>

            <div>
              <span>Envío</span>

              <strong>
                {Number(
                  order.shipping_cost
                ) === 0
                  ? "Gratis"
                  : `S/ ${Number(
                      order.shipping_cost
                    ).toFixed(2)}`}
              </strong>
            </div>

            <div className="admin-order-summary-total">
              <span>Total</span>

              <strong>
                S/{" "}
                {Number(
                  order.total
                ).toFixed(2)}
              </strong>
            </div>
          </div>
        </section>

        <section className="admin-order-management">
          <div>
            <span>GESTIÓN</span>

            <h2>
              Estado del pedido
            </h2>

            <p>
              Actualiza el avance logístico
              de esta compra.
            </p>
          </div>

          <div className="admin-order-management-control">
            {requiresRefundReview ? (
              <>
                <div className="admin-order-management-note">
                  Pago confirmado con el pedido
                  cancelado y el stock liberado.
                  El reembolso devolverá el total
                  de S/{" "}
                  {Number(
                    order.total
                  ).toFixed(2)}.
                </div>

                <button
                  type="button"
                  className="admin-order-action-button"
                  disabled={refunding}
                  onClick={() => {
                    void handleRefund();
                  }}
                >
                  {refunding
                    ? "Reembolsando..."
                    : `Reembolsar S/ ${Number(
                        order.total
                      ).toFixed(2)}`}
                </button>
              </>
            ) : isRefunded ? (
              <div className="admin-order-completed">
                <CheckCircle2 size={18} />
                Pago reembolsado
              </div>
            ) : nextStatus ? (
              <>
                <button
                  type="button"
                  className="admin-order-action-button"
                  disabled={
                    updating ||
                    (
                      nextStatus === "processing" &&
                      !processingAvailable
                    )
                  }
                  onClick={() => {
                    void handleStatusChange(
                      nextStatus
                    );
                  }}
                >
                  {updating
                    ? "Procesando..."
                    : actionLabel}
                </button>

                {nextStatus === "processing" &&
                  waitingForProcessingWindow &&
                  order.scheduled_processing_at && (
                    <div className="admin-order-management-note">
                      Podrás iniciar la preparación desde{" "}
                      <strong>
                        {formatProcessingDate(
                          order.scheduled_processing_at
                        )}
                      </strong>
                    </div>
                  )}
              </>
            ) : order.status === "delivered" ? (
              <div className="admin-order-completed">
                <CheckCircle2 size={18} />
                Pedido completado
              </div>
            ) : order.status === "cancelled" ? (
              <div className="admin-order-management-note">
                Este pedido fue cancelado y ya no
                puede avanzar.
              </div>
            ) : (
              <div className="admin-order-management-note">
                Esperando confirmación del pago
                para continuar.
              </div>
            )}
          </div>
        </section>

        <section className="admin-order-tracking">
          <div className="admin-order-section-title">
            <CheckCircle2 size={19} />
            <h2>
              Progreso del pedido
            </h2>
          </div>

          <div className="admin-order-tracking-list">
            <div className="completed">
              <span />
              Pedido creado
            </div>

            <div
              className={
                [
                  "paid",
                  "refunded",
                ].includes(
                  order.payment_status
                )
                  ? "completed"
                  : ""
              }
            >
              <span />
              {order.payment_status ===
              "refunded"
                ? "Pago reembolsado"
                : "Pago aprobado"}
            </div>

            <div
              className={
                [
                  "processing",
                  "shipped",
                  "delivered",
                ].includes(order.status)
                  ? "completed"
                  : ""
              }
            >
              <span />
              En preparación
            </div>

            <div
              className={
                [
                  "shipped",
                  "delivered",
                ].includes(order.status)
                  ? "completed"
                  : ""
              }
            >
              <span />
              Despachado
            </div>

            <div
              className={
                order.status === "delivered"
                  ? "completed"
                  : ""
              }
            >
              <span />
              Entregado
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}

export default AdminOrderDetail;
