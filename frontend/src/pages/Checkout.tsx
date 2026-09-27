import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";

import { useAuth } from "../context/useAuth";
import { useCart } from "../context/useCart";

import {
  getAddresses,
  type AddressResponse,
} from "../services/addressService";

import {
  createOrder,
  getOrderById,
  type OrderResponse,
} from "../services/orderService";

import type {
  PaymentResponse,
} from "../services/paymentService";

import MercadoPagoCard from "../components/MercadoPagoCard";

import "./Checkout.css";

const CHECKOUT_STORAGE_KEY = "aura_checkout_order";

type SavedCheckout = {
  orderId: number;
  stage: "awaiting_payment" | "processing";
};

function saveCheckout(
  orderId: number,
  stage: SavedCheckout["stage"]
) {
  localStorage.setItem(
    CHECKOUT_STORAGE_KEY,
    JSON.stringify({
      orderId,
      stage,
    })
  );
}

function getSavedCheckout(): SavedCheckout | null {
  try {
    const value = localStorage.getItem(
      CHECKOUT_STORAGE_KEY
    );

    if (!value) {
      return null;
    }

    const parsed = JSON.parse(
      value
    ) as Partial<SavedCheckout>;

    if (
      typeof parsed.orderId !== "number" ||
      (
        parsed.stage !== "awaiting_payment" &&
        parsed.stage !== "processing"
      )
    ) {
      localStorage.removeItem(
        CHECKOUT_STORAGE_KEY
      );

      return null;
    }

    return {
      orderId: parsed.orderId,
      stage: parsed.stage,
    };
  } catch {
    localStorage.removeItem(
      CHECKOUT_STORAGE_KEY
    );

    return null;
  }
}

function clearSavedCheckout() {
  localStorage.removeItem(
    CHECKOUT_STORAGE_KEY
  );
}

function Checkout() {
  const {
    token,
    isAuthenticated,
    loading,
  } = useAuth();

  const {
    cartItems,
    subtotal,
    clearCart,
  } = useCart();

  const [addresses, setAddresses] =
    useState<AddressResponse[]>([]);

  const [
    selectedAddressId,
    setSelectedAddressId,
  ] = useState<number | null>(null);

  const [
    addressesLoading,
    setAddressesLoading,
  ] = useState(true);

  const [
    restoringCheckout,
    setRestoringCheckout,
  ] = useState(true);

  const [
    checkoutError,
    setCheckoutError,
  ] = useState("");

  const [
    creatingOrder,
    setCreatingOrder,
  ] = useState(false);

  const [
    pendingOrder,
    setPendingOrder,
  ] = useState<OrderResponse | null>(null);

  const [
    completedOrder,
    setCompletedOrder,
  ] = useState<OrderResponse | null>(null);

  const [
    paymentPending,
    setPaymentPending,
  ] = useState(false);

  const [
    paymentReviewOrder,
    setPaymentReviewOrder,
  ] = useState<OrderResponse | null>(null);

  // =====================================
  // CARGAR DIRECCIONES
  // =====================================

  useEffect(() => {
    async function loadAddresses() {
      if (!token) {
        setAddressesLoading(false);
        return;
      }

      try {
        setAddressesLoading(true);

        const data =
          await getAddresses(token);

        setAddresses(data);

        const defaultAddress =
          data.find(
            (address) =>
              address.is_default
          );

        if (defaultAddress) {
          setSelectedAddressId(
            defaultAddress.id
          );
        } else if (data.length > 0) {
          setSelectedAddressId(
            data[0].id
          );
        }
      } catch (error) {
        if (error instanceof Error) {
          setCheckoutError(
            error.message
          );
        } else {
          setCheckoutError(
            "No se pudieron cargar las direcciones."
          );
        }
      } finally {
        setAddressesLoading(false);
      }
    }

    void loadAddresses();
  }, [token]);

  // =====================================
  // RECUPERAR CHECKOUT DESPUÉS DE F5
  // =====================================

  useEffect(() => {
    async function restoreCheckout() {
      if (!token) {
        setRestoringCheckout(false);
        return;
      }

      const saved =
        getSavedCheckout();

      if (!saved) {
        setRestoringCheckout(false);
        return;
      }

      try {
        const order =
          await getOrderById(
            token,
            saved.orderId
          );

        // Compra aprobada normalmente.
        if (
          order.payment_status === "paid" &&
          order.status !== "cancelled" &&
          order.stock_status === "committed"
        ) {
          setCompletedOrder(order);
          setPendingOrder(null);
          setPaymentPending(false);

          clearSavedCheckout();
          clearCart();

          return;
        }

        // Pago recibido cuando el stock
        // ya había sido liberado.
        if (
          order.payment_status === "paid" &&
          (
            order.status === "cancelled" ||
            order.stock_status === "released"
          )
        ) {
          setPaymentReviewOrder(order);
          setPendingOrder(null);
          setPaymentPending(false);

          clearSavedCheckout();

          return;
        }

        // Pedido que ya no puede pagarse.
        if (
          order.payment_status === "failed" ||
          order.status === "cancelled" ||
          order.stock_status === "released"
        ) {
          clearSavedCheckout();

          setPendingOrder(null);
          setPaymentPending(false);

          setCheckoutError(
            "El pedido anterior ya no puede utilizarse. Puedes generar un nuevo pedido."
          );

          return;
        }

        // Pedido pendiente.
        setPendingOrder(order);

        setPaymentPending(
          saved.stage === "processing"
        );
      } catch {
        clearSavedCheckout();
      } finally {
        setRestoringCheckout(false);
      }
    }

    void restoreCheckout();
  }, [token, clearCart]);

  // =====================================
  // CONSULTAR PAGO PENDIENTE
  // =====================================

  useEffect(() => {
    if (
      !token ||
      !paymentPending ||
      !pendingOrder
    ) {
      return;
    }

    let cancelled = false;

    async function checkOrder() {
      try {
        const order =
          await getOrderById(
            token!,
            pendingOrder!.id
          );

        if (cancelled) {
          return;
        }

        // Pago aprobado.
        if (
          order.payment_status === "paid" &&
          order.status !== "cancelled" &&
          order.stock_status === "committed"
        ) {
          setCompletedOrder(order);
          setPendingOrder(null);
          setPaymentPending(false);

          clearSavedCheckout();
          clearCart();

          return;
        }

        // Pago aprobado demasiado tarde.
        if (
          order.payment_status === "paid" &&
          (
            order.status === "cancelled" ||
            order.stock_status === "released"
          )
        ) {
          setPaymentReviewOrder(order);
          setPendingOrder(null);
          setPaymentPending(false);

          clearSavedCheckout();

          return;
        }

        // Pago rechazado o reserva vencida.
        if (
          order.payment_status === "failed" ||
          order.status === "cancelled" ||
          order.stock_status === "released"
        ) {
          setPendingOrder(null);
          setPaymentPending(false);

          clearSavedCheckout();

          setCheckoutError(
            order.payment_status === "failed"
              ? "El pago fue rechazado. Puedes generar un nuevo pedido e intentarlo nuevamente."
              : "La reserva del pedido venció. Puedes generar un nuevo pedido e intentarlo nuevamente."
          );
        }
      } catch (error) {
        console.error(
          "No se pudo actualizar el estado del pedido:",
          error
        );
      }
    }

    void checkOrder();

    const intervalId =
      window.setInterval(
        () => {
          void checkOrder();
        },
        5000
      );

    return () => {
      cancelled = true;

      window.clearInterval(
        intervalId
      );
    };
  }, [
    token,
    paymentPending,
    pendingOrder,
    clearCart,
  ]);

  // =====================================
  // CREAR PEDIDO
  // =====================================

  const handleCreateOrder = async () => {
    if (!token) {
      return;
    }

    if (!selectedAddressId) {
      setCheckoutError(
        "Selecciona una dirección de entrega."
      );
      return;
    }

    if (cartItems.length === 0) {
      setCheckoutError(
        "Tu carrito está vacío."
      );
      return;
    }

    try {
      setCreatingOrder(true);
      setCheckoutError("");
      setPaymentPending(false);

      const order =
        await createOrder(
          token,
          {
            address_id:
              selectedAddressId,

            items:
              cartItems.map(
                (item) => ({
                  product_id:
                    item.id,
                  quantity:
                    item.quantity,
                })
              ),
          }
        );

      setPendingOrder(order);

      saveCheckout(
        order.id,
        "awaiting_payment"
      );
    } catch (error) {
      if (error instanceof Error) {
        setCheckoutError(
          error.message
        );
      } else {
        setCheckoutError(
          "No se pudo crear el pedido."
        );
      }
    } finally {
      setCreatingOrder(false);
    }
  };

  // =====================================
  // RESULTADO DEL PAGO
  // =====================================

  const handlePaymentResult = (
    payment: PaymentResponse
  ) => {
    if (!pendingOrder) {
      return;
    }

    // PAGO APROBADO
    if (payment.payment_status === "paid") {
      const paidOrder: OrderResponse = {
        ...pendingOrder,
        status: "confirmed",
        payment_status: "paid",
        stock_status: "committed",
        stock_reserved_until: null,
      };

      setCompletedOrder(
        paidOrder
      );

      setPendingOrder(null);
      setPaymentPending(false);
      setCheckoutError("");

      clearSavedCheckout();
      clearCart();

      return;
    }

    // PAGO RECHAZADO
    if (payment.payment_status === "failed") {
      setPendingOrder(null);
      setPaymentPending(false);

      clearSavedCheckout();

      setCheckoutError(
        "El pago fue rechazado. Puedes generar un nuevo pedido e intentarlo nuevamente."
      );

      return;
    }

    // PAGO PENDIENTE
    setPaymentPending(true);
    setCheckoutError("");

    saveCheckout(
      pendingOrder.id,
      "processing"
    );
  };

  // =====================================
  // ERROR DE PAGO
  // =====================================

  const handlePaymentError = (
    error: unknown
  ) => {
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo procesar el pago.";

    const normalizedMessage =
      message.toLowerCase();

    const orderCanNoLongerBeUsed =
      normalizedMessage.includes("rechazó") ||
      normalizedMessage.includes("rechazado") ||
      normalizedMessage.includes("cancelado") ||
      normalizedMessage.includes("ya falló") ||
      normalizedMessage.includes("ha vencido") ||
      normalizedMessage.includes(
        "ya no está activa"
      );

    if (orderCanNoLongerBeUsed) {
      setPendingOrder(null);
      setPaymentPending(false);

      clearSavedCheckout();

      setCheckoutError(
        "No se completó el pago. El pedido anterior ya no puede utilizarse. Puedes generar un nuevo pedido e intentarlo nuevamente."
      );

      return;
    }

    setCheckoutError(message);
  };

  // =====================================
  // CARGANDO
  // =====================================

  if (
    loading ||
    restoringCheckout
  ) {
    return (
      <main className="checkout-page">
        <p>
          Cargando checkout...
        </p>
      </main>
    );
  }

  // =====================================
  // NO AUTENTICADO
  // =====================================

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  // =====================================
  // PAGO RECIBIDO / REVISIÓN
  // =====================================

  if (paymentReviewOrder) {
    return (
      <main className="checkout-page">
        <section className="checkout-success">
          <span>
            PAGO RECIBIDO
          </span>

          <h1>
            Tu pedido requiere revisión
          </h1>

          <p>
            Mercado Pago confirmó el pago,
            pero la reserva del producto ya
            había finalizado. No vuelvas a
            realizar otro pago para este pedido.
          </p>

          <div className="checkout-success-number">
            <small>
              Número de pedido
            </small>

            <strong>
              {paymentReviewOrder.order_number}
            </strong>
          </div>

          <div className="checkout-success-total">
            <span>
              Total
            </span>

            <strong>
              S/{" "}
              {Number(
                paymentReviewOrder.total
              ).toFixed(2)}
            </strong>
          </div>

          <div className="checkout-success-actions">
            <Link to="/cuenta/pedidos">
              Ver pedido
            </Link>
          </div>
        </section>
      </main>
    );
  }

  // =====================================
  // COMPRA FINALIZADA
  // =====================================

  if (completedOrder) {
    return (
      <main className="checkout-page">
        <section className="checkout-success">
          <span>
            PAGO APROBADO
          </span>

          <h1>
            Gracias por tu compra
          </h1>

          <p>
            Tu pago fue procesado y tu pedido
            fue registrado correctamente.
          </p>

          <div className="checkout-success-number">
            <small>
              Número de pedido
            </small>

            <strong>
              {completedOrder.order_number}
            </strong>
          </div>

          <div className="checkout-success-total">
            <span>
              Total
            </span>

            <strong>
              S/{" "}
              {Number(
                completedOrder.total
              ).toFixed(2)}
            </strong>
          </div>

          <div className="checkout-success-actions">
            <Link to="/cuenta/pedidos">
              Ver mis pedidos
            </Link>

            <Link to="/catalogo">
              Seguir comprando
            </Link>
          </div>
        </section>
      </main>
    );
  }

  // =====================================
  // PAGO PENDIENTE
  // =====================================

  if (
    paymentPending &&
    pendingOrder
  ) {
    return (
      <main className="checkout-page">
        <section className="checkout-success">
          <span>
            PAGO EN PROCESO
          </span>

          <h1>
            Estamos verificando tu pago
          </h1>

          <p>
            Mercado Pago todavía está
            procesando la operación. No
            necesitas volver a pagar este
            pedido.
          </p>

          <div className="checkout-success-number">
            <small>
              Número de pedido
            </small>

            <strong>
              {pendingOrder.order_number}
            </strong>
          </div>

          <div className="checkout-success-total">
            <span>
              Total
            </span>

            <strong>
              S/{" "}
              {Number(
                pendingOrder.total
              ).toFixed(2)}
            </strong>
          </div>

          <div className="checkout-success-actions">
            <Link to="/cuenta/pedidos">
              Ver estado del pedido
            </Link>

            <Link to="/catalogo">
              Seguir comprando
            </Link>
          </div>
        </section>
      </main>
    );
  }

  // =====================================
  // PEDIDO CREADO - PAGAR
  // =====================================

  if (
    pendingOrder &&
    token
  ) {
    return (
      <main className="checkout-page">
        <section className="checkout-container">
          <div className="checkout-heading">
            <span>
              PASO 03
            </span>

            <h1>
              Realizar pago
            </h1>

            <p>
              Tu pedido fue creado. Ahora
              completa el pago para finalizar
              la compra.
            </p>
          </div>

          {checkoutError && (
            <p className="checkout-error">
              {checkoutError}
            </p>
          )}

          <div className="checkout-payment-layout">
            <div className="checkout-payment-main">
              <MercadoPagoCard
                orderId={
                  pendingOrder.id
                }
                amount={
                  Number(
                    pendingOrder.total
                  )
                }
                accessToken={token}
                onPaymentResult={
                  handlePaymentResult
                }
                onPaymentError={
                  handlePaymentError
                }
              />
            </div>

            <aside className="checkout-summary">
              <span className="checkout-summary-label">
                PEDIDO
              </span>

              <h2>
                Resumen
              </h2>

              <div className="checkout-summary-row">
                <span>
                  Número
                </span>

                <strong>
                  {pendingOrder.order_number}
                </strong>
              </div>

              <div className="checkout-summary-row">
                <span>
                  Subtotal
                </span>

                <strong>
                  S/{" "}
                  {Number(
                    pendingOrder.subtotal
                  ).toFixed(2)}
                </strong>
              </div>

              <div className="checkout-summary-row">
                <span>
                  Envío
                </span>

                <strong>
                  {Number(
                    pendingOrder.shipping_cost
                  ) === 0
                    ? "Gratis"
                    : `S/ ${Number(
                        pendingOrder.shipping_cost
                      ).toFixed(2)}`}
                </strong>
              </div>

              <div className="checkout-summary-total">
                <span>
                  Total
                </span>

                <strong>
                  S/{" "}
                  {Number(
                    pendingOrder.total
                  ).toFixed(2)}
                </strong>
              </div>

              <p className="checkout-summary-note">
                El monto mostrado proviene
                directamente del pedido
                registrado en el servidor.
              </p>
            </aside>
          </div>
        </section>
      </main>
    );
  }

  // =====================================
  // CHECKOUT PRINCIPAL
  // =====================================

  return (
    <main className="checkout-page">
      <section className="checkout-container">
        <div className="checkout-heading">
          <span>
            FINALIZAR COMPRA
          </span>

          <h1>
            Checkout
          </h1>

          <p>
            Revisa tu pedido y selecciona
            la dirección de entrega.
          </p>
        </div>

        {checkoutError && (
          <p className="checkout-error">
            {checkoutError}
          </p>
        )}

        <div className="checkout-layout">
          <div className="checkout-main">
            <section className="checkout-section">
              <div className="checkout-section-title">
                <span>
                  01
                </span>

                <h2>
                  Dirección de entrega
                </h2>
              </div>

              {addressesLoading ? (
                <p>
                  Cargando direcciones...
                </p>
              ) : addresses.length === 0 ? (
                <div className="checkout-no-address">
                  <p>
                    No tienes una dirección
                    registrada.
                  </p>

                  <Link to="/cuenta">
                    Agregar dirección
                  </Link>
                </div>
              ) : (
                <div className="checkout-addresses">
                  {addresses.map(
                    (address) => (
                      <label
                        key={address.id}
                        className={
                          selectedAddressId ===
                          address.id
                            ? "checkout-address checkout-address-selected"
                            : "checkout-address"
                        }
                      >
                        <input
                          type="radio"
                          name="address"
                          checked={
                            selectedAddressId ===
                            address.id
                          }
                          onChange={() =>
                            setSelectedAddressId(
                              address.id
                            )
                          }
                        />

                        <div>
                          <div className="checkout-address-header">
                            <strong>
                              {address.label}
                            </strong>

                            {address.is_default && (
                              <span>
                                Principal
                              </span>
                            )}
                          </div>

                          <p>
                            {address.recipient_name}
                          </p>

                          <p>
                            {address.address_line}
                          </p>

                          <p>
                            {address.district},{" "}
                            {address.province},{" "}
                            {address.department}
                          </p>

                          <p>
                            Tel. {address.phone}
                          </p>
                        </div>
                      </label>
                    )
                  )}
                </div>
              )}
            </section>

            <section className="checkout-section">
              <div className="checkout-section-title">
                <span>
                  02
                </span>

                <h2>
                  Productos
                </h2>
              </div>

              {cartItems.length === 0 ? (
                <div className="checkout-empty">
                  <p>
                    Tu carrito está vacío.
                  </p>

                  <Link to="/catalogo">
                    Ir al catálogo
                  </Link>
                </div>
              ) : (
                <div className="checkout-products">
                  {cartItems.map(
                    (item) => (
                      <div
                        key={item.id}
                        className="checkout-product"
                      >
                        <div className="checkout-product-image">
                          {item.image ? (
                            <img
                              src={item.image}
                              alt={item.name}
                            />
                          ) : (
                            <span>
                              AURA
                            </span>
                          )}
                        </div>

                        <div className="checkout-product-info">
                          <span>
                            {item.brand}
                          </span>

                          <strong>
                            {item.name}
                          </strong>

                          <small>
                            {item.size}
                          </small>
                        </div>

                        <div className="checkout-product-quantity">
                          x {item.quantity}
                        </div>

                        <strong className="checkout-product-price">
                          S/{" "}
                          {(
                            item.price *
                            item.quantity
                          ).toFixed(2)}
                        </strong>
                      </div>
                    )
                  )}
                </div>
              )}
            </section>
          </div>

          <aside className="checkout-summary">
            <span className="checkout-summary-label">
              RESUMEN
            </span>

            <h2>
              Tu pedido
            </h2>

            <div className="checkout-summary-row">
              <span>
                Subtotal
              </span>

              <strong>
                S/ {subtotal.toFixed(2)}
              </strong>
            </div>

            <div className="checkout-summary-row">
              <span>
                Envío
              </span>

              <strong>
                {subtotal >= 299
                  ? "Gratis"
                  : "S/ 10.00"}
              </strong>
            </div>

            <div className="checkout-summary-total">
              <span>
                Total
              </span>

              <strong>
                S/{" "}
                {(
                  subtotal +
                  (
                    subtotal >= 299
                      ? 0
                      : 10
                  )
                ).toFixed(2)}
              </strong>
            </div>

            <p className="checkout-summary-note">
              El monto final será validado
              nuevamente por nuestro servidor
              antes de crear el pedido.
            </p>

            <button
              type="button"
              className="checkout-confirm-button"
              onClick={
                handleCreateOrder
              }
              disabled={
                creatingOrder ||
                cartItems.length === 0 ||
                !selectedAddressId
              }
            >
              {creatingOrder
                ? "Creando pedido..."
                : "Continuar al pago"}
            </button>

            <Link
              to="/carrito"
              className="checkout-back"
            >
              Volver al carrito
            </Link>
          </aside>
        </div>
      </section>
    </main>
  );
}

export default Checkout;