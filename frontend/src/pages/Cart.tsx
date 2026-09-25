import {
  Minus,
  Plus,
  Trash2,
  ShoppingBag,
} from "lucide-react";

import { Link } from "react-router-dom";

import { useCart } from "../context/useCart";

import "./Cart.css";

function Cart() {
  const {
    cartItems,
    removeFromCart,
    increaseQuantity,
    decreaseQuantity,
    subtotal,
  } = useCart();

  const shipping = subtotal >= 299 ? 0 : 10;

  const total = subtotal + shipping;

  if (cartItems.length === 0) {
    return (
      <main className="empty-cart">
        <ShoppingBag
          size={35}
          strokeWidth={1.2}
        />

        <span>AURA</span>

        <h1>
          Tu carrito está vacío
        </h1>

        <p>
          Descubre una fragancia que represente
          tu esencia.
        </p>

        <Link to="/perfumes">
          Explorar perfumes
        </Link>
      </main>
    );
  }

  return (
    <main className="cart-page">

      <div className="cart-header">
        <span>TU SELECCIÓN</span>

        <h1>
          Mi carrito
        </h1>
      </div>

      <div className="cart-layout">

        <section className="cart-items">

          {cartItems.map((item) => (
            <article
              className="cart-item"
              key={item.id}
            >

              <Link
                to={`/producto/${item.slug}`}
                className="cart-item-image"
              >
                <img
                  src={item.image}
                  alt={`${item.brand} ${item.name}`}
                />
              </Link>

              <div className="cart-item-info">

                <span className="cart-item-brand">
                  {item.brand}
                </span>

                <Link
                  to={`/producto/${item.slug}`}
                >
                  <h2>
                    {item.name}
                  </h2>
                </Link>

                <p>
                  {item.size}
                </p>

                <p className="cart-unit-price">
                  S/ {item.price.toFixed(2)} c/u
                </p>

                <div className="cart-quantity">

                  <button
                    onClick={() =>
                      decreaseQuantity(item.id)
                    }
                    aria-label="Disminuir cantidad"
                  >
                    <Minus size={15} />
                  </button>

                  <span>
                    {item.quantity}
                  </span>

                  <button
                    onClick={() =>
                      increaseQuantity(item.id)
                    }
                    aria-label="Aumentar cantidad"
                  >
                    <Plus size={15} />
                  </button>

                </div>

              </div>

              <div className="cart-item-side">

                <strong>
                  S/{" "}
                  {(
                    item.price *
                    item.quantity
                  ).toFixed(2)}
                </strong>

                <button
                  className="remove-item"
                  onClick={() =>
                    removeFromCart(item.id)
                  }
                  aria-label="Eliminar producto"
                >
                  <Trash2 size={18} />
                </button>

              </div>

            </article>
          ))}

        </section>

        <aside className="cart-summary">

          <h2>
            Resumen del pedido
          </h2>

          <div className="summary-row">
            <span>Subtotal</span>

            <strong>
              S/ {subtotal.toFixed(2)}
            </strong>
          </div>

          <div className="summary-row">
            <span>Envío</span>

            <strong>
              {shipping === 0
                ? "Gratis"
                : `S/ ${shipping.toFixed(2)}`}
            </strong>
          </div>

          {shipping > 0 && (
            <p className="shipping-message">
              Agrega S/{" "}
              {(299 - subtotal).toFixed(2)} más
              para obtener envío gratis.
            </p>
          )}

          <div className="cart-total">
            <span>Total</span>

            <strong>
              S/ {total.toFixed(2)}
            </strong>
          </div>

  <Link
  to="/checkout"
  className="cart-checkout-button"
>
  Continuar con la compra
</Link>
          <Link
            to="/perfumes"
            className="continue-shopping"
          >
            Seguir comprando
          </Link>

        </aside>

      </div>

    </main>
  );
}

export default Cart;