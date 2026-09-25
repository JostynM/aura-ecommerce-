import { Link } from "react-router-dom";

import {
  Heart,
  Search,
  ShieldCheck,
  ShoppingBag,
  UserRound,
} from "lucide-react";

import { useAuth } from "../context/useAuth";
import { useCart } from "../context/useCart";

import "./Header.css";


function Header() {
  const {
    totalItems,
  } = useCart();

  const {
    user,
    isAuthenticated,
    loading,
    logout,
  } = useAuth();


  // ==========================================
  // CERRAR SESIÓN
  // ==========================================

  const handleLogout = () => {
    logout();
  };


  return (
    <header className="header">


      {/* ===================================== */}
      {/* BARRA SUPERIOR */}
      {/* ===================================== */}

      <div className="top-bar">

        <span>
          Envíos a todo el Perú
        </span>

        <span>
          Compra segura
        </span>

        <span>
          Productos 100% originales
        </span>

      </div>


      {/* ===================================== */}
      {/* NAVEGACIÓN PRINCIPAL */}
      {/* ===================================== */}

      <div className="navbar">


        {/* LOGO */}

        <Link
          to="/"
          className="logo"
        >
          AURA
        </Link>


        {/* ===================================== */}
        {/* MENÚ DE LA TIENDA */}
        {/* ===================================== */}

        <nav className="nav-menu">

          <Link to="/perfumes">
            Perfumes
          </Link>

          <a href="#">
            Colecciones
          </a>

          <a href="#">
            Árabes
          </a>

          <a href="#">
            Diseñador
          </a>

          <a href="#">
            Marcas
          </a>

        </nav>


        {/* ===================================== */}
        {/* ACCIONES */}
        {/* ===================================== */}

        <div className="nav-actions">


          {/* BUSCAR */}

          <button
            type="button"
            aria-label="Buscar"
            title="Buscar"
          >
            <Search
              size={20}
              strokeWidth={1.5}
            />
          </button>


          {/* FAVORITOS */}

          <button
            type="button"
            aria-label="Favoritos"
            title="Favoritos"
          >
            <Heart
              size={20}
              strokeWidth={1.5}
            />
          </button>


          {/* CARRITO */}

          <Link
            to="/carrito"
            className="cart-button"
            aria-label="Carrito"
            title="Carrito"
          >

            <ShoppingBag
              size={20}
              strokeWidth={1.5}
            />


            {totalItems > 0 && (

              <span className="cart-count">
                {totalItems}
              </span>

            )}

          </Link>


          {/* ================================= */}
          {/* SESIÓN */}
          {/* ================================= */}

          {!loading && (
            <>

              {isAuthenticated && user ? (

                <div className="header-user">


                  {/* MI CUENTA */}

                  <Link
                    to="/cuenta"
                    className="header-user-info"
                    title="Mi cuenta"
                  >

                    <UserRound
                      size={20}
                      strokeWidth={1.5}
                    />

                    <span>
                      {user.first_name}
                    </span>

                  </Link>


                  {/* ========================== */}
                  {/* ACCESO ADMINISTRATIVO */}
                  {/* SOLO LO VE UN ADMIN */}
                  {/* ========================== */}

                  {user.role === "admin" && (

                    <Link
                      to="/admin"
                      className="header-admin-link"
                      title="Administración AURA"
                      aria-label="Administración AURA"
                    >

                      <ShieldCheck
                        size={17}
                        strokeWidth={1.5}
                      />

                      <span>
                        Administrar
                      </span>

                    </Link>

                  )}


                  {/* CERRAR SESIÓN */}

                  <button
                    type="button"
                    className="logout-button"
                    onClick={handleLogout}
                  >
                    Cerrar sesión
                  </button>

                </div>

              ) : (

                <Link
                  to="/login"
                  aria-label="Mi cuenta"
                  title="Iniciar sesión"
                  className="account-button"
                >

                  <UserRound
                    size={20}
                    strokeWidth={1.5}
                  />

                </Link>

              )}

            </>
          )}

        </div>

      </div>

    </header>
  );
}


export default Header;