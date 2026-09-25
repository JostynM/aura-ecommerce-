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
  Mail,
  RotateCcw,
  Search,
  ShoppingBag,
  UserCheck,
  UserRound,
} from "lucide-react";

import { useAuth } from "../context/useAuth";

import {
  getAdminUsers,
  type AdminUserResponse,
} from "../services/userService";

import "./AdminCustomers.css";


// ==========================================
// TIPOS DE FILTRO
// ==========================================

type AccountFilter =
  | "all"
  | "active"
  | "inactive";

type VerificationFilter =
  | "all"
  | "verified"
  | "pending";

type ActivityFilter =
  | "all"
  | "without-orders"
  | "with-orders"
  | "recurrent";


// ==========================================
// COMPONENTE
// ==========================================

function AdminCustomers() {

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
    customers,
    setCustomers,
  ] = useState<AdminUserResponse[]>([]);

  const [
    customersLoading,
    setCustomersLoading,
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
    accountFilter,
    setAccountFilter,
  ] = useState<AccountFilter>(
    "all"
  );

  const [
    verificationFilter,
    setVerificationFilter,
  ] = useState<VerificationFilter>(
    "all"
  );

  const [
    activityFilter,
    setActivityFilter,
  ] = useState<ActivityFilter>(
    "all"
  );


  // ==========================================
  // CARGAR CLIENTES
  // ==========================================

  useEffect(() => {

    async function loadCustomers() {

      if (!token) {
        return;
      }


      try {

        setCustomersLoading(
          true
        );

        setError("");


        const data =
          await getAdminUsers(
            token
          );


        setCustomers(
          data
        );

      } catch (error) {

        if (
          error instanceof Error
        ) {

          setError(
            error.message
          );

        } else {

          setError(
            "No se pudieron cargar los clientes."
          );

        }

      } finally {

        setCustomersLoading(
          false
        );

      }
    }


    if (
      isAuthenticated &&
      user?.role === "admin"
    ) {

      loadCustomers();

    }

  }, [
    token,
    isAuthenticated,
    user?.role,
  ]);


  // ==========================================
  // KPIs
  // ==========================================

  const metrics =
    useMemo(() => {

      const total =
        customers.length;


      const active =
        customers.filter(
          (customer) =>
            customer.is_active
        ).length;


      const verified =
        customers.filter(
          (customer) =>
            customer.email_verified
        ).length;


      const totalOrders =
        customers.reduce(
          (
            totalOrders,
            customer
          ) =>
            totalOrders +
            customer.order_count,
          0
        );


      const recurrent =
        customers.filter(
          (customer) =>
            customer.order_count >= 2
        ).length;


      return {
        total,
        active,
        verified,
        totalOrders,
        recurrent,
      };

    }, [
      customers,
    ]);


  // ==========================================
  // CLIENTES FILTRADOS
  // ==========================================

  const filteredCustomers =
    useMemo(() => {

      const normalizedSearch =
        searchTerm
          .trim()
          .toLowerCase();


      return customers.filter(
        (customer) => {

          // ==============================
          // BUSCADOR
          // ==============================

          const fullName =
            `${customer.first_name} ${customer.last_name}`
              .toLowerCase();


          const matchesSearch =
            normalizedSearch === "" ||

            fullName.includes(
              normalizedSearch
            ) ||

            customer.email
              .toLowerCase()
              .includes(
                normalizedSearch
              ) ||

            customer.id
              .toString()
              .includes(
                normalizedSearch
              );


          // ==============================
          // ESTADO CUENTA
          // ==============================

          const matchesAccount =
            accountFilter === "all" ||

            (
              accountFilter === "active" &&
              customer.is_active
            ) ||

            (
              accountFilter === "inactive" &&
              !customer.is_active
            );


          // ==============================
          // VERIFICACIÓN
          // ==============================

          const matchesVerification =
            verificationFilter === "all" ||

            (
              verificationFilter ===
              "verified" &&
              customer.email_verified
            ) ||

            (
              verificationFilter ===
              "pending" &&
              !customer.email_verified
            );


          // ==============================
          // ACTIVIDAD
          // ==============================

          const matchesActivity =
            activityFilter === "all" ||

            (
              activityFilter ===
              "without-orders" &&
              customer.order_count === 0
            ) ||

            (
              activityFilter ===
              "with-orders" &&
              customer.order_count > 0
            ) ||

            (
              activityFilter ===
              "recurrent" &&
              customer.order_count >= 2
            );


          return (
            matchesSearch &&
            matchesAccount &&
            matchesVerification &&
            matchesActivity
          );
        }
      );

    }, [
      customers,
      searchTerm,
      accountFilter,
      verificationFilter,
      activityFilter,
    ]);


  // ==========================================
  // LIMPIAR FILTROS
  // ==========================================

  const clearFilters = () => {

    setSearchTerm("");

    setAccountFilter(
      "all"
    );

    setVerificationFilter(
      "all"
    );

    setActivityFilter(
      "all"
    );
  };


  // ==========================================
  // CARGANDO AUTH
  // ==========================================

  if (loading) {

    return (
      <main className="admin-customers-page">

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
  // NO ADMIN
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

    <main className="admin-customers-page">

      <section className="admin-customers-container">


        {/* ================================= */}
        {/* HEADER */}
        {/* ================================= */}

        <div className="admin-customers-header">

          <div>

            <span>
              ADMINISTRACIÓN
            </span>

            <h1>
              Clientes
            </h1>

            <p>
              Consulta los clientes registrados
              en AURA y su actividad.
            </p>

          </div>


          <Link
            to="/admin"
            className="admin-customers-back"
          >
            Volver al panel
          </Link>

        </div>


        {/* ================================= */}
        {/* ERROR */}
        {/* ================================= */}

        {error && (

          <p className="admin-customers-error">
            {error}
          </p>

        )}


        {/* ================================= */}
        {/* KPIs */}
        {/* ================================= */}

        {!customersLoading && (

          <div className="admin-customers-stats">


            <article>

              <UserRound
                size={21}
              />

              <div>

                <span>
                  Clientes
                </span>

                <strong>
                  {metrics.total}
                </strong>

              </div>

            </article>


            <article>

              <UserCheck
                size={21}
              />

              <div>

                <span>
                  Cuentas activas
                </span>

                <strong>
                  {metrics.active}
                </strong>

              </div>

            </article>


            <article>

              <Mail
                size={21}
              />

              <div>

                <span>
                  Correos verificados
                </span>

                <strong>
                  {metrics.verified}
                </strong>

              </div>

            </article>


            <article>

              <ShoppingBag
                size={21}
              />

              <div>

                <span>
                  Pedidos realizados
                </span>

                <strong>
                  {metrics.totalOrders}
                </strong>

              </div>

            </article>


            <article>

              <ShoppingBag
                size={21}
              />

              <div>

                <span>
                  Clientes recurrentes
                </span>

                <strong>
                  {metrics.recurrent}
                </strong>

              </div>

            </article>

          </div>

        )}


        {/* ================================= */}
        {/* FILTROS */}
        {/* ================================= */}

        {!customersLoading &&
          customers.length > 0 && (

            <section className="admin-customers-filters">

              <div className="admin-customers-search">

                <Search
                  size={18}
                />

                <input
                  type="text"
                  placeholder="Buscar por nombre, correo o ID..."
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


              <div className="admin-customers-filter-controls">


                {/* CUENTA */}

                <select
                  value={
                    accountFilter
                  }
                  onChange={(event) => {

                    const value =
                      event.target.value;


                    if (
                      value === "active" ||
                      value === "inactive"
                    ) {

                      setAccountFilter(
                        value
                      );

                    } else {

                      setAccountFilter(
                        "all"
                      );
                    }

                  }}
                >

                  <option value="all">
                    Todas las cuentas
                  </option>

                  <option value="active">
                    Activas
                  </option>

                  <option value="inactive">
                    Inactivas
                  </option>

                </select>


                {/* VERIFICACIÓN */}

                <select
                  value={
                    verificationFilter
                  }
                  onChange={(event) => {

                    const value =
                      event.target.value;


                    if (
                      value === "verified" ||
                      value === "pending"
                    ) {

                      setVerificationFilter(
                        value
                      );

                    } else {

                      setVerificationFilter(
                        "all"
                      );
                    }

                  }}
                >

                  <option value="all">
                    Todos los correos
                  </option>

                  <option value="verified">
                    Verificados
                  </option>

                  <option value="pending">
                    Sin verificar
                  </option>

                </select>


                {/* ACTIVIDAD */}

                <select
                  value={
                    activityFilter
                  }
                  onChange={(event) => {

                    const value =
                      event.target.value;


                    if (
                      value ===
                      "without-orders" ||
                      value ===
                      "with-orders" ||
                      value ===
                      "recurrent"
                    ) {

                      setActivityFilter(
                        value
                      );

                    } else {

                      setActivityFilter(
                        "all"
                      );
                    }

                  }}
                >

                  <option value="all">
                    Toda la actividad
                  </option>

                  <option value="without-orders">
                    Sin pedidos
                  </option>

                  <option value="with-orders">
                    Con pedidos
                  </option>

                  <option value="recurrent">
                    Recurrentes
                  </option>

                </select>


                <button
                  type="button"
                  onClick={
                    clearFilters
                  }
                  className="admin-customers-clear"
                >

                  <RotateCcw
                    size={16}
                  />

                  Limpiar

                </button>

              </div>

            </section>

          )}


        {/* ================================= */}
        {/* CONTADOR */}
        {/* ================================= */}

        {!customersLoading &&
          customers.length > 0 && (

            <div className="admin-customers-results">

              <strong>
                {filteredCustomers.length}
              </strong>

              {" "}

              {filteredCustomers.length === 1
                ? "cliente"
                : "clientes"}

              {filteredCustomers.length !==
                customers.length && (

                  <span>

                    {" "}
                    de {customers.length}

                  </span>

                )}

            </div>

          )}


        {/* ================================= */}
        {/* CONTENIDO */}
        {/* ================================= */}

        {customersLoading ? (

          <p>
            Cargando clientes...
          </p>

        ) : customers.length === 0 ? (

          <div className="admin-customers-empty">

            <h2>
              No hay clientes registrados
            </h2>

            <p>
              Los nuevos usuarios aparecerán
              aquí cuando creen una cuenta.
            </p>

          </div>

        ) : filteredCustomers.length === 0 ? (

          <div className="admin-customers-empty">

            <h2>
              No encontramos clientes
            </h2>

            <p>
              Prueba cambiando los filtros.
            </p>

            <button
              type="button"
              onClick={
                clearFilters
              }
            >
              Limpiar filtros
            </button>

          </div>

        ) : (

          <div className="admin-customers-table-wrapper">

            <table className="admin-customers-table">

              <thead>

                <tr>

                  <th>
                    Cliente
                  </th>

                  <th>
                    Correo
                  </th>

                  <th>
                    Registro
                  </th>

                  <th>
                    Pedidos
                  </th>

                  <th>
                    Actividad
                  </th>

                  <th>
                    Correo
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

                {filteredCustomers.map(
                  (customer) => (

                    <tr
                      key={
                        customer.id
                      }
                    >


                      {/* CLIENTE */}

                      <td>

                        <div className="admin-customer-name">

                          <div className="admin-customer-avatar">

                            {customer.first_name
                              .charAt(0)
                              .toUpperCase()}

                          </div>


                          <div>

                            <strong>

                              {customer.first_name}
                              {" "}
                              {customer.last_name}

                            </strong>

                            <span>
                              ID #{customer.id}
                            </span>

                          </div>

                        </div>

                      </td>


                      {/* EMAIL */}

                      <td>
                        {customer.email}
                      </td>


                      {/* REGISTRO */}

                      <td>

                        {new Date(
                          customer.created_at
                        ).toLocaleDateString(
                          "es-PE"
                        )}

                      </td>


                      {/* PEDIDOS */}

                      <td>

                        <strong>
                          {customer.order_count}
                        </strong>

                      </td>


                      {/* ACTIVIDAD */}

                      <td>

                        {customer.order_count === 0 ? (

                          <span className="admin-customer-activity new">
                            Sin compras
                          </span>

                        ) : customer.order_count === 1 ? (

                          <span className="admin-customer-activity buyer">
                            1 compra
                          </span>

                        ) : (

                          <span className="admin-customer-activity recurrent">
                            Recurrente
                          </span>

                        )}

                      </td>


                      {/* EMAIL VERIFICADO */}

                      <td>

                        <span
                          className={
                            customer.email_verified
                              ? "admin-customer-verified"
                              : "admin-customer-unverified"
                          }
                        >

                          {customer.email_verified
                            ? "Verificado"
                            : "Pendiente"}

                        </span>

                      </td>


                      {/* ESTADO */}

                      <td>

                        <span
                          className={
                            customer.is_active
                              ? "admin-customer-active"
                              : "admin-customer-inactive"
                          }
                        >

                          {customer.is_active
                            ? "Activo"
                            : "Inactivo"}

                        </span>

                      </td>
                      {/* DETALLE */}

                      <td>

                        <Link
                          to={`/admin/clientes/${customer.id}`}
                          className="admin-customer-detail-link"
                        >
                          Ver detalle
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


export default AdminCustomers;