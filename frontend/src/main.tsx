import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { initMercadoPago } from "@mercadopago/sdk-react";

import App from "./App";
import { AuthProvider } from "./context/AuthProvider";
import { CartProvider } from "./context/CartProvider";

import "./index.css";


const mercadoPagoPublicKey =
  import.meta.env.VITE_MERCADO_PAGO_PUBLIC_KEY;

if (mercadoPagoPublicKey) {
  initMercadoPago(mercadoPagoPublicKey);
}


ReactDOM.createRoot(
  document.getElementById("root")!
).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <App />
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);