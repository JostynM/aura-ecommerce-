import {
  useEffect,
  useState,
} from "react";

import {
  Link,
  Navigate,
  useParams,
} from "react-router-dom";

import {
  ArrowLeft,
  CheckCircle2,
  Mail,
  ShoppingBag,
  UserRound,
  WalletCards,
} from "lucide-react";

import { useAuth } from "../context/useAuth";

import {
  getAdminUserById,
  type AdminUserDetailResponse,
} from "../services/userService";

import "./AdminCustomerDetail.css";


// ==========================================
// ETIQUETA ESTADO PEDIDO
// ==========================================

function getOrderStatusLabel(
  status: string
) {

  switch (status) {

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
// ETIQUETA PAGO
// ==========================================

function getPaymentStatusLabel(
  status: string
) {

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


function AdminCustomerDetail() {

  const {
    userId,
  } = useParams();


  const {
    user,
    token,
    isAuthenticated,
    loading: authLoading,
  } = useAuth();


  const [
    customer,
    setCustomer,
  ] = useState<
    AdminUserDetailResponse | null
  >(null);


  const [
    customerLoading,
    setCustomerLoading,
  ] = useState(true);


  const [
    error,
    setError,
  ] = useState("");


  // ==========================================
  // CONVERTIR ID
  // ==========================================

  const numericUserId =
    Number(userId);


  // ==========================================
  // CARGAR CLIENTE
  // ==========================================

  useEffect(() => {

    async function loadCustomer() {

      if (
        !token ||
        !Number.isInteger(
          numericUserId
        )
      ) {
        return;
      }


      try {

        setCustomerLoading(
          true
        );

        setError("");


        const data =
          await getAdminUserById(
            token,
            numericUserId
          );


        setCustomer(
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
            "No se pudo cargar el cliente."
          );

        }

      } finally {

        setCustomerLoading(
          false
        );

      }
    }


    if (
      token &&
      user?.role === "admin"
    ) {

      loadCustomer();

    }

  }, [
    token,
    user?.role,
    numericUserId,
  ]);


  // ==========================================
  // AUTH CARGANDO
  // ==========================================

  if (authLoading) {

    return (
      <main className="admin-customer-detail-page">

        <p>
          Cargando...
        </p>

      </main>
    );
  }


  // ==========================================
  // SIN SESIÓN
  // ==========================================

  if (
    !isAuthenticated ||
    !user
  ) {

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
    user.role !== "admin"
  ) {

    return (
      <Navigate
        to="/"
        replace
      />
    );
  }


  // ==========================================
  // ID INVÁLIDO
  // ==========================================

  if (
    !Number.isInteger(
      numericUserId
    )
  ) {

    return (
      <main className="admin-customer-detail-page">

        <section className="admin-customer-detail-container">

          <p className="admin-customer-detail-error">
            El ID del cliente no es válido.
          </p>

          <Link
            to="/admin/clientes"
          >
            Volver a clientes
          </Link>

        </section>

      </main>
    );
  }


  // ==========================================
  // LOADING
  // ==========================================

  if (customerLoading) {

    return (
      <main className="admin-customer-detail-page">

        <section className="admin-customer-detail-container">

          <p>
            Cargando cliente...
          </p>

        </section>

      </main>
    );
  }


  // ==========================================
  // ERROR
  // ==========================================

  if (
    error &&
    !customer
  ) {

    return (
      <main className="admin-customer-detail-page">

        <section className="admin-customer-detail-container">

          <p className="admin-customer-detail-error">
            {error}
          </p>

          <Link
            to="/admin/clientes"
          >
            Volver a clientes
          </Link>

        </section>

      </main>
    );
  }


  if (!customer) {
    return null;
  }


  // ==========================================
  // VISTA
  // ==========================================

  return (

    <main className="admin-customer-detail-page">

      <section className="admin-customer-detail-container">


        {/* VOLVER */}

        <div className="admin-customer-detail-back">

          <Link
            to="/admin/clientes"
          >

            <ArrowLeft
              size={17}
            />

            Volver a clientes

          </Link>

        </div>


        {/* HEADER */}

        <header className="admin-customer-detail-header">

          <div>

            <span>
              CLIENTE
            </span>

            <h1>

              {customer.first_name}
              {" "}
              {customer.last_name}

            </h1>

            <p>
              Cliente registrado desde{" "}
              {new Date(
                customer.created_at
              ).toLocaleDateString(
                "es-PE"
              )}
            </p>

          </div>


          <div className="admin-customer-detail-id">

            ID #{customer.id}

          </div>

        </header>


        {/* KPIs */}

        <section className="admin-customer-detail-stats">


          <article>

            <ShoppingBag
              size={21}
            />

            <div>

              <span>
                Pedidos
              </span>

              <strong>
                {customer.order_count}
              </strong>

            </div>

          </article>


          <article>

            <CheckCircle2
              size={21}
            />

            <div>

              <span>
                Pedidos pagados
              </span>

              <strong>
                {customer.paid_order_count}
              </strong>

            </div>

          </article>


          <article>

            <WalletCards
              size={21}
            />

            <div>

              <span>
                Total gastado
              </span>

              <strong>

                S/{" "}

                {Number(
                  customer.total_spent
                ).toFixed(2)}

              </strong>

            </div>

          </article>

        </section>


        {/* INFORMACIÓN */}

        <section className="admin-customer-info-grid">


          <article className="admin-customer-detail-card">

            <div className="admin-customer-card-heading">

              <UserRound
                size={19}
              />

              <h2>
                Información personal
              </h2>

            </div>


            <div className="admin-customer-info-row">

              <span>
                Nombre
              </span>

              <strong>

                {customer.first_name}
                {" "}
                {customer.last_name}

              </strong>

            </div>


            <div className="admin-customer-info-row">

              <span>
                Estado
              </span>

              <strong>

                {customer.is_active
                  ? "Activo"
                  : "Inactivo"}

              </strong>

            </div>

          </article>


          <article className="admin-customer-detail-card">

            <div className="admin-customer-card-heading">

              <Mail
                size={19}
              />

              <h2>
                Cuenta
              </h2>

            </div>


            <div className="admin-customer-info-row">

              <span>
                Correo
              </span>

              <strong>
                {customer.email}
              </strong>

            </div>


            <div className="admin-customer-info-row">

              <span>
                Verificación
              </span>

              <strong>

                {customer.email_verified
                  ? "Verificado"
                  : "Pendiente"}

              </strong>

            </div>

          </article>

        </section>


        {/* HISTORIAL */}

        <section className="admin-customer-orders-card">

          <div className="admin-customer-orders-heading">

            <div>

              <span>
                HISTORIAL
              </span>

              <h2>
                Pedidos del cliente
              </h2>

            </div>


            <strong>
              {customer.orders.length}
            </strong>

          </div>


          {customer.orders.length === 0 ? (

            <div className="admin-customer-no-orders">

              <ShoppingBag
                size={28}
              />

              <h3>
                Este cliente todavía no ha realizado compras
              </h3>

              <p>
                Cuando realice un pedido,
                aparecerá aquí.
              </p>

            </div>

          ) : (

            <div className="admin-customer-orders-table-wrapper">

              <table className="admin-customer-orders-table">

                <thead>

                  <tr>

                    <th>
                      Pedido
                    </th>

                    <th>
                      Fecha
                    </th>

                    <th>
                      Estado
                    </th>

                    <th>
                      Pago
                    </th>

                    <th>
                      Total
                    </th>

                    <th>
                      Acción
                    </th>

                  </tr>

                </thead>


                <tbody>

                  {customer.orders.map(
                    (order) => (

                      <tr
                        key={
                          order.id
                        }
                      >

                        <td>

                          <strong>
                            {order.order_number}
                          </strong>

                        </td>


                        <td>

                          {new Date(
                            order.created_at
                          ).toLocaleDateString(
                            "es-PE"
                          )}

                        </td>


                        <td>

                          <span
                            className={
                              `admin-customer-order-status ${order.status}`
                            }
                          >

                            {getOrderStatusLabel(
                              order.status
                            )}

                          </span>

                        </td>


                        <td>

                          <span
                            className={
                              `admin-customer-payment-status ${order.payment_status}`
                            }
                          >

                            {getPaymentStatusLabel(
                              order.payment_status
                            )}

                          </span>

                        </td>


                        <td>

                          <strong>

                            S/{" "}

                            {Number(
                              order.total
                            ).toFixed(2)}

                          </strong>

                        </td>


                        <td>

                          <Link
                            to={
                              `/admin/pedidos/${order.id}`
                            }
                            className="admin-customer-order-link"
                          >
                            Ver pedido
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

      </section>

    </main>
  );
}


export default AdminCustomerDetail;