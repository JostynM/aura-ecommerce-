import {
  Routes,
  Route,
} from "react-router-dom";

import Header from "./components/Header";
import Footer from "./components/Footer";

import Home from "./pages/Home";
import Catalog from "./pages/Catalog";
import ProductDetail from "./pages/ProductDetail";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Account from "./pages/Account";
import VerifyEmail from "./pages/VerifyEmail";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";

import Admin from "./pages/Admin";
import AdminOrders from "./pages/AdminOrders";
import AdminOrderDetail from "./pages/AdminOrderDetail";
import AdminCustomers from "./pages/AdminCustomers";
import AdminCustomerDetail
  from "./pages/AdminCustomerDetail";
import AdminProductForm
  from "./pages/AdminProductForm";
import AdminInventory
  from "./pages/AdminInventory";


function App() {

  return (
    <>

      <Header />


      <Routes>


        {/* ========================= */}
        {/* TIENDA */}
        {/* ========================= */}

        <Route
          path="/"
          element={<Home />}
        />

        <Route
          path="/perfumes"
          element={<Catalog />}
        />

        <Route
          path="/producto/:slug"
          element={<ProductDetail />}
        />

        <Route
          path="/carrito"
          element={<Cart />}
        />

        <Route
          path="/checkout"
          element={<Checkout />}
        />


        {/* ========================= */}
        {/* AUTENTICACIÓN */}
        {/* ========================= */}

        <Route
          path="/login"
          element={<Login />}
        />

        <Route
          path="/registro"
          element={<Register />}
        />

        <Route
          path="/verificar-email"
          element={<VerifyEmail />}
        />

        <Route
          path="/recuperar-password"
          element={<ForgotPassword />}
        />

        <Route
          path="/restablecer-password"
          element={<ResetPassword />}
        />

        <Route
          path="/cuenta"
          element={<Account />}
        />


        {/* ========================= */}
        {/* ADMIN */}
        {/* ========================= */}

        <Route
          path="/admin"
          element={<Admin />}
        />

        <Route
          path="/admin/pedidos"
          element={<AdminOrders />}
        />

        <Route
          path="/admin/pedidos/:orderId"
          element={<AdminOrderDetail />}
        />

        <Route
          path="/admin/inventario"
          element={<AdminInventory />}
        />

        <Route
          path="/admin/clientes"
          element={<AdminCustomers />}
        />

        <Route
          path="/admin/clientes/:userId"
          element={<AdminCustomerDetail />}
        />

        <Route
          path="/admin/productos/nuevo"
          element={<AdminProductForm />}
        />

        <Route
          path="/admin/productos/:productId"
          element={<AdminProductForm />}
        />

      </Routes>


      <Footer />

    </>
  );
}


export default App;