import {
  useEffect,
  useState,
  type FormEvent,
} from "react";

import { Navigate } from "react-router-dom";

import { useAuth } from "../context/useAuth";

import {
  getOrders,
  type OrderResponse,
} from "../services/orderService";

import {
  createAddress,
  deleteAddress,
  getAddresses,
  updateAddress,
  type AddressData,
  type AddressResponse,
} from "../services/addressService";

import "./Account.css";


function getOrderStatusLabel(
  status: string
) {
  switch (status) {
    case "pending":
      return "Pendiente";

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

    default:
      return status;
  }
}


function getPaymentStatusLabel(
  status: string
) {
  switch (status) {
    case "pending":
      return "Pendiente";

    case "paid":
      return "Pagado";

    case "failed":
      return "Fallido";

    case "refunded":
      return "Reembolsado";

    default:
      return status;
  }
}



// =========================
// FECHA DE PROCESAMIENTO
// =========================

function formatProcessingDate(
  value: string
) {
  return new Date(
    value
  ).toLocaleString(
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


function Account() {
  const {
    user,
    token,
    isAuthenticated,
    loading,
    logout,
  } = useAuth();


  const [activeSection, setActiveSection] =
    useState<
      "profile" |
      "orders" |
      "addresses"
    >("profile");


  // =========================
  // PEDIDOS
  // =========================

  const [orders, setOrders] =
    useState<OrderResponse[]>([]);

  const [ordersLoading, setOrdersLoading] =
    useState(false);

  const [ordersError, setOrdersError] =
    useState("");

  const [
    currentTime,
    setCurrentTime,
  ] = useState<number | null>(
    null
  );


  // =========================
  // DIRECCIONES
  // =========================

  const [addresses, setAddresses] =
    useState<AddressResponse[]>([]);

  const [addressLoading, setAddressLoading] =
    useState(false);

  const [addressError, setAddressError] =
    useState("");

  const [showAddressForm, setShowAddressForm] =
    useState(false);

  const [editingAddressId, setEditingAddressId] =
    useState<number | null>(null);

  const [savingAddress, setSavingAddress] =
    useState(false);

  const [addressForm, setAddressForm] =
    useState<AddressData>({
      label: "",
      recipient_name: "",
      phone: "",
      department: "",
      province: "",
      district: "",
      address_line: "",
      reference: "",
      is_default: false,
    });


  // =========================
  // ACTUALIZAR HORA ACTUAL
  // =========================

  useEffect(() => {

    const updateCurrentTime = () => {
      setCurrentTime(
        Date.now()
      );
    };

    updateCurrentTime();

    const intervalId =
      window.setInterval(
        updateCurrentTime,
        30000
      );

    return () => {
      window.clearInterval(
        intervalId
      );
    };

  }, []);


  // =========================
  // CARGAR DIRECCIONES
  // =========================

  useEffect(() => {
    async function loadAddresses() {
      if (!token) {
        return;
      }

      try {
        setAddressLoading(true);
        setAddressError("");

        const data =
          await getAddresses(token);

        setAddresses(data);

      } catch (error) {
        if (error instanceof Error) {
          setAddressError(
            error.message
          );
        } else {
          setAddressError(
            "No se pudieron cargar las direcciones."
          );
        }

      } finally {
        setAddressLoading(false);
      }
    }


    if (activeSection === "addresses") {
      loadAddresses();
    }

  }, [activeSection, token]);


  // =========================
  // CARGAR PEDIDOS
  // =========================

  useEffect(() => {
    async function loadOrders() {
      if (!token) {
        return;
      }

      try {
        setOrdersLoading(true);
        setOrdersError("");

        const data =
          await getOrders(token);

        setOrders(data);

      } catch (error) {
        if (error instanceof Error) {
          setOrdersError(
            error.message
          );
        } else {
          setOrdersError(
            "No se pudieron cargar los pedidos."
          );
        }

      } finally {
        setOrdersLoading(false);
      }
    }


    if (activeSection === "orders") {
      loadOrders();
    }

  }, [activeSection, token]);


  // =========================
  // RESETEAR FORM DIRECCIÓN
  // =========================

  const resetAddressForm = () => {
    setAddressForm({
      label: "",
      recipient_name: "",
      phone: "",
      department: "",
      province: "",
      district: "",
      address_line: "",
      reference: "",
      is_default: false,
    });

    setEditingAddressId(null);

    setShowAddressForm(false);
  };


  // =========================
  // CREAR / EDITAR DIRECCIÓN
  // =========================

  const handleAddressSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!token) {
      return;
    }


    try {
      setSavingAddress(true);
      setAddressError("");


      if (editingAddressId !== null) {

        const updatedAddress =
          await updateAddress(
            token,
            editingAddressId,
            addressForm
          );


        setAddresses(
          (currentAddresses) =>
            currentAddresses.map(
              (address) => {

                if (
                  address.id ===
                  editingAddressId
                ) {
                  return updatedAddress;
                }


                if (
                  updatedAddress.is_default
                ) {
                  return {
                    ...address,
                    is_default: false,
                  };
                }


                return address;
              }
            )
        );

      } else {

        const newAddress =
          await createAddress(
            token,
            addressForm
          );


        setAddresses(
          (currentAddresses) => {

            const updatedAddresses =
              currentAddresses.map(
                (address) => ({
                  ...address,

                  is_default:
                    newAddress.is_default
                      ? false
                      : address.is_default,
                })
              );


            return [
              newAddress,
              ...updatedAddresses,
            ];
          }
        );
      }


      resetAddressForm();

    } catch (error) {
      if (error instanceof Error) {
        setAddressError(
          error.message
        );
      } else {
        setAddressError(
          "No se pudo guardar la dirección."
        );
      }

    } finally {
      setSavingAddress(false);
    }
  };


  // =========================
  // EDITAR DIRECCIÓN
  // =========================

  const handleEditAddress = (
    address: AddressResponse
  ) => {
    setAddressForm({
      label:
        address.label,

      recipient_name:
        address.recipient_name,

      phone:
        address.phone,

      department:
        address.department,

      province:
        address.province,

      district:
        address.district,

      address_line:
        address.address_line,

      reference:
        address.reference,

      is_default:
        address.is_default,
    });


    setEditingAddressId(
      address.id
    );

    setShowAddressForm(true);
  };


  // =========================
  // ELIMINAR DIRECCIÓN
  // =========================

  const handleDeleteAddress = async (
    addressId: number
  ) => {
    if (!token) {
      return;
    }


    const confirmed =
      window.confirm(
        "¿Estás seguro de eliminar esta dirección?"
      );


    if (!confirmed) {
      return;
    }


    try {
      setAddressError("");


      await deleteAddress(
        token,
        addressId
      );


      setAddresses(
        (currentAddresses) =>
          currentAddresses.filter(
            (address) =>
              address.id !== addressId
          )
      );


      if (
        editingAddressId === addressId
      ) {
        resetAddressForm();
      }

    } catch (error) {
      if (error instanceof Error) {
        setAddressError(
          error.message
        );
      } else {
        setAddressError(
          "No se pudo eliminar la dirección."
        );
      }
    }
  };


  // =========================
  // LOADING AUTH
  // =========================

  if (loading) {
    return (
      <main className="account-page">

        <p>
          Cargando cuenta...
        </p>

      </main>
    );
  }


  // =========================
  // PROTEGER RUTA
  // =========================

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


  return (
    <main className="account-page">

      <section className="account-container">

        <div className="account-header">

          <span>
            MI CUENTA
          </span>


          <h1>
            Hola, {user.first_name}
          </h1>


          <p>
            Gestiona tu información y consulta
            tu actividad en AURA.
          </p>

        </div>


        <div className="account-layout">

          {/* ========================= */}
          {/* SIDEBAR */}
          {/* ========================= */}

          <aside className="account-sidebar">

            <button
              className={
                activeSection === "profile"
                  ? "account-menu-active"
                  : ""
              }
              onClick={() =>
                setActiveSection("profile")
              }
            >
              Mi perfil
            </button>


            <button
              className={
                activeSection === "orders"
                  ? "account-menu-active"
                  : ""
              }
              onClick={() =>
                setActiveSection("orders")
              }
            >
              Mis pedidos
            </button>


            <button
              className={
                activeSection === "addresses"
                  ? "account-menu-active"
                  : ""
              }
              onClick={() =>
                setActiveSection("addresses")
              }
            >
              Mis direcciones
            </button>


            <button>
              Favoritos
            </button>


            <button
              onClick={logout}
              className="account-logout"
            >
              Cerrar sesión
            </button>

          </aside>


          {/* ========================= */}
          {/* PERFIL */}
          {/* ========================= */}

          {activeSection === "profile" && (

            <section className="account-content">

              <h2>
                Información personal
              </h2>


              <div className="account-info-grid">

                <div className="account-info">

                  <span>
                    Nombre
                  </span>

                  <strong>
                    {user.first_name}
                  </strong>

                </div>


                <div className="account-info">

                  <span>
                    Apellido
                  </span>

                  <strong>
                    {user.last_name}
                  </strong>

                </div>


                <div className="account-info">

                  <span>
                    Correo electrónico
                  </span>

                  <strong>
                    {user.email}
                  </strong>

                </div>


                <div className="account-info">

                  <span>
                    Estado de cuenta
                  </span>

                  <strong>
                    {user.is_active
                      ? "Activa"
                      : "Desactivada"}
                  </strong>

                </div>


                <div className="account-info">

                  <span>
                    Correo verificado
                  </span>

                  <strong>
                    {user.email_verified
                      ? "Verificado"
                      : "Pendiente"}
                  </strong>

                </div>


                <div className="account-info">

                  <span>
                    Tipo de cuenta
                  </span>

                  <strong>
                    {user.role === "customer"
                      ? "Cliente"
                      : user.role}
                  </strong>

                </div>

              </div>

            </section>

          )}


          {/* ========================= */}
          {/* PEDIDOS */}
          {/* ========================= */}

          {activeSection === "orders" && (

            <section className="account-content">

              <div className="orders-heading">

                <span>
                  COMPRAS
                </span>

                <h2>
                  Mis pedidos
                </h2>

              </div>


              {ordersError && (

                <p className="auth-error">
                  {ordersError}
                </p>

              )}


              {ordersLoading ? (

                <p>
                  Cargando pedidos...
                </p>

              ) : orders.length === 0 ? (

                <div className="orders-empty">

                  <h3>
                    Aún no tienes pedidos
                  </h3>

                  <p>
                    Cuando realices una compra,
                    aparecerá aquí.
                  </p>

                </div>

              ) : (

                <div className="orders-list">

                  {orders.map(
                    (order) => (

                      <article
                        key={order.id}
                        className="order-card"
                      >

                        <div className="order-card-header">

                          <div>

                            <span>
                              Pedido
                            </span>

                            <strong>
                              {order.order_number}
                            </strong>

                          </div>


                          <div>

                            <span>
                              Fecha
                            </span>

                            <strong>
                              {new Date(
                                order.created_at
                              ).toLocaleDateString(
                                "es-PE"
                              )}
                            </strong>

                          </div>


                          <div>

                            <span>
                              Total
                            </span>

                            <strong>
                              S/{" "}
                              {Number(
                                order.total
                              ).toFixed(2)}
                            </strong>

                          </div>


                          <div>

                            <span>
                              Estado
                            </span>

                            <strong className="order-status">
                              {getOrderStatusLabel(
                                order.status
                              )}
                            </strong>

                          </div>

                        </div>


                        <div className="order-items">

                          {order.items.map(
                            (item) => (

                              <div
                                key={item.id}
                                className="order-item"
                              >

                                <div>

                                  <strong>
                                    {item.product_name}
                                  </strong>

                                  <span>
                                    {item.brand}
                                    {" · "}
                                    {item.size_ml} ml
                                  </span>

                                </div>


                                <div className="order-item-price">

                                  <span>
                                    {item.quantity}
                                    {" x "}
                                    S/{" "}
                                    {Number(
                                      item.unit_price
                                    ).toFixed(2)}
                                  </span>


                                  <strong>
                                    S/{" "}
                                    {Number(
                                      item.line_total
                                    ).toFixed(2)}
                                  </strong>

                                </div>

                              </div>

                            )
                          )}

                        </div>


                        <div className="order-summary">

                          <span>
                            Subtotal:{" "}
                            S/{" "}
                            {Number(
                              order.subtotal
                            ).toFixed(2)}
                          </span>


                          <span>
                            Envío:{" "}

                            {Number(
                              order.shipping_cost
                            ) === 0
                              ? "Gratis"
                              : `S/ ${Number(
                                  order.shipping_cost
                                ).toFixed(2)}`}
                          </span>


                          <span>
                            Pago:{" "}
                            {getPaymentStatusLabel(
                              order.payment_status
                            )}
                          </span>


                          {order.payment_status === "paid" && (

                            <span>

                              {order.status === "confirmed"
                                ? order.scheduled_processing_at
                                  ? (
                                    currentTime !== null &&
                                    currentTime >= new Date(
                                      order.scheduled_processing_at
                                    ).getTime()
                                  )
                                    ? "Procesamiento: disponible para preparación"
                                    : `Procesamiento programado: ${formatProcessingDate(
                                        order.scheduled_processing_at
                                      )}`
                                  : "Procesamiento: pendiente de programación"

                                : order.status === "processing"
                                  ? "Procesamiento: en preparación"

                                : order.status === "shipped"
                                  ? "Procesamiento: despachado"

                                : order.status === "delivered"
                                  ? "Procesamiento: pedido entregado"

                                : ""}

                            </span>

                          )}

                        </div>


                        <div className="order-address">

                          <strong>
                            Dirección de entrega
                          </strong>

                          <p>
                            {order.address_line}
                          </p>

                          <p>
                            {order.district},{" "}
                            {order.province},{" "}
                            {order.department}
                          </p>

                        </div>

                      </article>

                    )
                  )}

                </div>

              )}

            </section>

          )}


          {/* ========================= */}
          {/* DIRECCIONES */}
          {/* ========================= */}

          {activeSection === "addresses" && (

            <section className="account-content">

              <div className="addresses-header">

                <h2>
                  Mis direcciones
                </h2>


                <button
                  type="button"
                  className="address-add-button"
                  onClick={() => {

                    if (showAddressForm) {
                      resetAddressForm();
                    } else {
                      setShowAddressForm(true);
                    }

                  }}
                >
                  {showAddressForm
                    ? "Cancelar"
                    : "Agregar dirección"}
                </button>

              </div>


              {addressError && (

                <p className="auth-error">
                  {addressError}
                </p>

              )}


              {showAddressForm && (

                <form
                  className="address-form"
                  onSubmit={handleAddressSubmit}
                >

                  <input
                    type="text"
                    placeholder="Casa, Trabajo..."
                    value={addressForm.label}
                    onChange={(event) =>
                      setAddressForm({
                        ...addressForm,

                        label:
                          event.target.value,
                      })
                    }
                    required
                  />


                  <input
                    type="text"
                    placeholder="Nombre del destinatario"
                    value={
                      addressForm.recipient_name
                    }
                    onChange={(event) =>
                      setAddressForm({
                        ...addressForm,

                        recipient_name:
                          event.target.value,
                      })
                    }
                    required
                  />


                  <input
                    type="tel"
                    placeholder="Teléfono"
                    value={addressForm.phone}
                    onChange={(event) =>
                      setAddressForm({
                        ...addressForm,

                        phone:
                          event.target.value,
                      })
                    }
                    required
                  />


                  <input
                    type="text"
                    placeholder="Departamento"
                    value={
                      addressForm.department
                    }
                    onChange={(event) =>
                      setAddressForm({
                        ...addressForm,

                        department:
                          event.target.value,
                      })
                    }
                    required
                  />


                  <input
                    type="text"
                    placeholder="Provincia"
                    value={
                      addressForm.province
                    }
                    onChange={(event) =>
                      setAddressForm({
                        ...addressForm,

                        province:
                          event.target.value,
                      })
                    }
                    required
                  />


                  <input
                    type="text"
                    placeholder="Distrito"
                    value={
                      addressForm.district
                    }
                    onChange={(event) =>
                      setAddressForm({
                        ...addressForm,

                        district:
                          event.target.value,
                      })
                    }
                    required
                  />


                  <input
                    type="text"
                    placeholder="Dirección"
                    value={
                      addressForm.address_line
                    }
                    onChange={(event) =>
                      setAddressForm({
                        ...addressForm,

                        address_line:
                          event.target.value,
                      })
                    }
                    required
                  />


                  <input
                    type="text"
                    placeholder="Referencia"
                    value={
                      addressForm.reference ?? ""
                    }
                    onChange={(event) =>
                      setAddressForm({
                        ...addressForm,

                        reference:
                          event.target.value,
                      })
                    }
                  />


                  <label className="auth-checkbox">

                    <input
                      type="checkbox"
                      checked={
                        addressForm.is_default
                      }
                      onChange={(event) =>
                        setAddressForm({
                          ...addressForm,

                          is_default:
                            event.target.checked,
                        })
                      }
                    />

                    <span>
                      Usar como dirección principal
                    </span>

                  </label>


                  <button
                    type="submit"
                    className="auth-submit"
                    disabled={savingAddress}
                  >
                    {savingAddress
                      ? "Guardando..."
                      : editingAddressId !== null
                        ? "Actualizar dirección"
                        : "Guardar dirección"}
                  </button>

                </form>

              )}


              {addressLoading ? (

                <p>
                  Cargando direcciones...
                </p>

              ) : addresses.length === 0 ? (

                <p>
                  Todavía no tienes direcciones
                  registradas.
                </p>

              ) : (

                <div className="addresses-list">

                  {addresses.map(
                    (address) => (

                      <article
                        key={address.id}
                        className="address-card"
                      >

                        <div>

                          <strong>
                            {address.label}
                          </strong>


                          {address.is_default && (

                            <span className="address-default">
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
                          Tel: {address.phone}
                        </p>


                        {address.reference && (

                          <p>
                            Ref:{" "}
                            {address.reference}
                          </p>

                        )}


                        <div className="address-actions">

                          <button
                            type="button"
                            onClick={() =>
                              handleEditAddress(
                                address
                              )
                            }
                          >
                            Editar
                          </button>


                          <button
                            type="button"
                            className="address-delete-button"
                            onClick={() =>
                              handleDeleteAddress(
                                address.id
                              )
                            }
                          >
                            Eliminar
                          </button>

                        </div>

                      </article>

                    )
                  )}

                </div>

              )}

            </section>

          )}

        </div>

      </section>

    </main>
  );
}


export default Account;