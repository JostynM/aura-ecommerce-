import {
  useEffect,
  useState,
  type FormEvent,
} from "react";

import {
  Navigate,
  useNavigate,
} from "react-router-dom";

import {
  useAuth,
} from "../context/useAuth";

import {
  createAddress,
  deleteAddress,
  getAddresses,
  updateAddress,
  type AddressData,
  type AddressResponse,
} from "../services/addressService";

import "./Account.css";


// ==========================================
// ACCOUNT
// ==========================================

function Account() {

  const navigate =
    useNavigate();


  // ========================================
  // AUTENTICACIÓN
  // ========================================

  const {
    user,
    token,
    isAuthenticated,
    loading,
    logout,
  } = useAuth();


  // ========================================
  // SECCIÓN ACTIVA
  // ========================================

  const [
    activeSection,
    setActiveSection,
  ] = useState<
    "profile" |
    "addresses"
  >(
    "profile"
  );


  // ========================================
  // DIRECCIONES
  // ========================================

  const [
    addresses,
    setAddresses,
  ] =
    useState<AddressResponse[]>(
      []
    );


  const [
    addressLoading,
    setAddressLoading,
  ] =
    useState(false);


  const [
    addressError,
    setAddressError,
  ] =
    useState("");


  const [
    showAddressForm,
    setShowAddressForm,
  ] =
    useState(false);


  const [
    editingAddressId,
    setEditingAddressId,
  ] =
    useState<number | null>(
      null
    );


  const [
    savingAddress,
    setSavingAddress,
  ] =
    useState(false);


  const [
    addressForm,
    setAddressForm,
  ] =
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


  // ========================================
  // CARGAR DIRECCIONES
  // ========================================

  useEffect(() => {

    if (
      activeSection !==
      "addresses"
    ) {

      return;

    }


    if (
      !token
    ) {

      return;

    }


    const authToken =
      token;


    let active =
      true;


    async function loadAddresses() {

      try {

        setAddressLoading(
          true
        );

        setAddressError("");


        const data =
          await getAddresses(
            authToken
          );


        if (
          !active
        ) {

          return;

        }


        setAddresses(
          data
        );

      } catch (
        error
      ) {

        if (
          !active
        ) {

          return;

        }


        if (
          error instanceof Error
        ) {

          setAddressError(
            error.message
          );

        } else {

          setAddressError(
            "No se pudieron cargar las direcciones."
          );

        }

      } finally {

        if (
          active
        ) {

          setAddressLoading(
            false
          );

        }

      }

    }


    void loadAddresses();


    return () => {

      active =
        false;

    };

  }, [
    activeSection,
    token,
  ]);


  // ========================================
  // RESETEAR FORMULARIO
  // ========================================

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


    setEditingAddressId(
      null
    );


    setShowAddressForm(
      false
    );

  };


  // ========================================
  // CREAR / EDITAR DIRECCIÓN
  // ========================================

  const handleAddressSubmit =
    async (
      event:
        FormEvent<HTMLFormElement>
    ) => {

      event.preventDefault();


      if (
        !token
      ) {

        return;

      }


      try {

        setSavingAddress(
          true
        );

        setAddressError("");


        // ====================================
        // EDITAR
        // ====================================

        if (
          editingAddressId !==
          null
        ) {

          const updatedAddress =
            await updateAddress(
              token,
              editingAddressId,
              addressForm
            );


          setAddresses(
            (
              currentAddresses
            ) =>
              currentAddresses.map(
                (
                  address
                ) => {

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

                      is_default:
                        false,

                    };

                  }


                  return address;

                }
              )
          );

        }

        // ====================================
        // CREAR
        // ====================================

        else {

          const newAddress =
            await createAddress(
              token,
              addressForm
            );


          setAddresses(
            (
              currentAddresses
            ) => {

              const updatedAddresses =
                currentAddresses.map(
                  (
                    address
                  ) => ({

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

      } catch (
        error
      ) {

        if (
          error instanceof Error
        ) {

          setAddressError(
            error.message
          );

        } else {

          setAddressError(
            "No se pudo guardar la dirección."
          );

        }

      } finally {

        setSavingAddress(
          false
        );

      }

    };


  // ========================================
  // EDITAR DIRECCIÓN
  // ========================================

  const handleEditAddress = (
    address:
      AddressResponse
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


    setShowAddressForm(
      true
    );

  };


  // ========================================
  // ELIMINAR DIRECCIÓN
  // ========================================

  const handleDeleteAddress =
    async (
      addressId:
        number
    ) => {

      if (
        !token
      ) {

        return;

      }


      const confirmed =
        window.confirm(
          "¿Estás seguro de eliminar esta dirección?"
        );


      if (
        !confirmed
      ) {

        return;

      }


      try {

        setAddressError("");


        await deleteAddress(
          token,
          addressId
        );


        setAddresses(
          (
            currentAddresses
          ) =>
            currentAddresses.filter(
              (
                address
              ) =>
                address.id !==
                addressId
            )
        );


        if (
          editingAddressId ===
          addressId
        ) {

          resetAddressForm();

        }

      } catch (
        error
      ) {

        if (
          error instanceof Error
        ) {

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


  // ========================================
  // CARGANDO AUTENTICACIÓN
  // ========================================

  if (
    loading
  ) {

    return (

      <main className="account-page">

        <p>
          Cargando cuenta...
        </p>

      </main>

    );

  }


  // ========================================
  // PROTEGER RUTA
  // ========================================

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


  // ========================================
  // RENDER
  // ========================================

  return (

    <main className="account-page">

      <section className="account-container">


        {/* ===================================
            CABECERA
        =================================== */}

        <div className="account-header">

          <span>
            MI CUENTA
          </span>


          <h1>

            Hola,{" "}
            {user.first_name}

          </h1>


          <p>

            Gestiona tu información
            y consulta tu actividad
            en AURA.

          </p>

        </div>


        <div className="account-layout">


          {/* =================================
              SIDEBAR
          ================================= */}

          <aside className="account-sidebar">


            {/* MI PERFIL */}

            <button
              type="button"

              className={
                activeSection ===
                "profile"
                  ? "account-menu-active"
                  : ""
              }

              onClick={() =>
                setActiveSection(
                  "profile"
                )
              }
            >

              Mi perfil

            </button>


            {/* MIS PEDIDOS */}

            <button
              type="button"

              onClick={() =>
                navigate(
                  "/cuenta/pedidos"
                )
              }
            >

              Mis pedidos

            </button>


            {/* MIS DIRECCIONES */}

            <button
              type="button"

              className={
                activeSection ===
                "addresses"
                  ? "account-menu-active"
                  : ""
              }

              onClick={() =>
                setActiveSection(
                  "addresses"
                )
              }
            >

              Mis direcciones

            </button>


            {/* FAVORITOS */}

            <button
              type="button"

              onClick={() =>
                navigate(
                  "/favoritos"
                )
              }
            >

              Favoritos

            </button>


            {/* CERRAR SESIÓN */}

            <button
              type="button"

              onClick={
                logout
              }

              className="account-logout"
            >

              Cerrar sesión

            </button>

          </aside>


          {/* =================================
              PERFIL
          ================================= */}

          {activeSection ===
            "profile" && (

            <section className="account-content">

              <h2>

                Información personal

              </h2>


              <div className="account-info-grid">


                {/* NOMBRE */}

                <div className="account-info">

                  <span>
                    Nombre
                  </span>

                  <strong>

                    {user.first_name}

                  </strong>

                </div>


                {/* APELLIDO */}

                <div className="account-info">

                  <span>
                    Apellido
                  </span>

                  <strong>

                    {user.last_name}

                  </strong>

                </div>


                {/* EMAIL */}

                <div className="account-info">

                  <span>

                    Correo electrónico

                  </span>

                  <strong>

                    {user.email}

                  </strong>

                </div>


                {/* ESTADO */}

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


                {/* VERIFICACIÓN */}

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


                {/* TIPO DE CUENTA */}

                <div className="account-info">

                  <span>

                    Tipo de cuenta

                  </span>

                  <strong>

                    {user.role ===
                    "customer"
                      ? "Cliente"
                      : user.role}

                  </strong>

                </div>

              </div>

            </section>

          )}


          {/* =================================
              DIRECCIONES
          ================================= */}

          {activeSection ===
            "addresses" && (

            <section className="account-content">


              {/* ===============================
                  HEADER
              =============================== */}

              <div className="addresses-header">

                <h2>
                  Mis direcciones
                </h2>


                <button
                  type="button"

                  className="address-add-button"

                  onClick={() => {

                    if (
                      showAddressForm
                    ) {

                      resetAddressForm();

                    } else {

                      setShowAddressForm(
                        true
                      );

                    }

                  }}
                >

                  {showAddressForm
                    ? "Cancelar"
                    : "Agregar dirección"}

                </button>

              </div>


              {/* ===============================
                  ERROR
              =============================== */}

              {addressError && (

                <p className="auth-error">

                  {addressError}

                </p>

              )}


              {/* ===============================
                  FORMULARIO
              =============================== */}

              {showAddressForm && (

                <form
                  className="address-form"

                  onSubmit={
                    handleAddressSubmit
                  }
                >


                  {/* ETIQUETA */}

                  <input
                    type="text"

                    placeholder="Casa, Trabajo..."

                    value={
                      addressForm.label
                    }

                    onChange={(
                      event
                    ) =>
                      setAddressForm({

                        ...addressForm,

                        label:
                          event.target.value,

                      })
                    }

                    required
                  />


                  {/* DESTINATARIO */}

                  <input
                    type="text"

                    placeholder="Nombre del destinatario"

                    value={
                      addressForm
                        .recipient_name
                    }

                    onChange={(
                      event
                    ) =>
                      setAddressForm({

                        ...addressForm,

                        recipient_name:
                          event.target.value,

                      })
                    }

                    required
                  />


                  {/* TELÉFONO */}

                  <input
                    type="tel"

                    placeholder="Teléfono"

                    value={
                      addressForm.phone
                    }

                    onChange={(
                      event
                    ) =>
                      setAddressForm({

                        ...addressForm,

                        phone:
                          event.target.value,

                      })
                    }

                    required
                  />


                  {/* DEPARTAMENTO */}

                  <input
                    type="text"

                    placeholder="Departamento"

                    value={
                      addressForm.department
                    }

                    onChange={(
                      event
                    ) =>
                      setAddressForm({

                        ...addressForm,

                        department:
                          event.target.value,

                      })
                    }

                    required
                  />


                  {/* PROVINCIA */}

                  <input
                    type="text"

                    placeholder="Provincia"

                    value={
                      addressForm.province
                    }

                    onChange={(
                      event
                    ) =>
                      setAddressForm({

                        ...addressForm,

                        province:
                          event.target.value,

                      })
                    }

                    required
                  />


                  {/* DISTRITO */}

                  <input
                    type="text"

                    placeholder="Distrito"

                    value={
                      addressForm.district
                    }

                    onChange={(
                      event
                    ) =>
                      setAddressForm({

                        ...addressForm,

                        district:
                          event.target.value,

                      })
                    }

                    required
                  />


                  {/* DIRECCIÓN */}

                  <input
                    type="text"

                    placeholder="Dirección"

                    value={
                      addressForm.address_line
                    }

                    onChange={(
                      event
                    ) =>
                      setAddressForm({

                        ...addressForm,

                        address_line:
                          event.target.value,

                      })
                    }

                    required
                  />


                  {/* REFERENCIA */}

                  <input
                    type="text"

                    placeholder="Referencia"

                    value={
                      addressForm.reference ??
                      ""
                    }

                    onChange={(
                      event
                    ) =>
                      setAddressForm({

                        ...addressForm,

                        reference:
                          event.target.value,

                      })
                    }
                  />


                  {/* PRINCIPAL */}

                  <label className="auth-checkbox">

                    <input
                      type="checkbox"

                      checked={
                        addressForm.is_default
                      }

                      onChange={(
                        event
                      ) =>
                        setAddressForm({

                          ...addressForm,

                          is_default:
                            event.target.checked,

                        })
                      }
                    />


                    <span>

                      Usar como dirección
                      principal

                    </span>

                  </label>


                  {/* GUARDAR */}

                  <button
                    type="submit"

                    className="auth-submit"

                    disabled={
                      savingAddress
                    }
                  >

                    {savingAddress
                      ? "Guardando..."
                      : editingAddressId !==
                          null
                        ? "Actualizar dirección"
                        : "Guardar dirección"}

                  </button>

                </form>

              )}


              {/* ===============================
                  CARGANDO DIRECCIONES
              =============================== */}

              {addressLoading ? (

                <p>

                  Cargando direcciones...

                </p>

              ) : addresses.length ===
                0 ? (

                <p>

                  Todavía no tienes
                  direcciones registradas.

                </p>

              ) : (

                <div className="addresses-list">

                  {addresses.map(
                    (
                      address
                    ) => (

                      <article
                        key={
                          address.id
                        }

                        className="address-card"
                      >


                        {/* NOMBRE */}

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


                        {/* DESTINATARIO */}

                        <p>

                          {address.recipient_name}

                        </p>


                        {/* DIRECCIÓN */}

                        <p>

                          {address.address_line}

                        </p>


                        {/* UBICACIÓN */}

                        <p>

                          {address.district},
                          {" "}
                          {address.province},
                          {" "}
                          {address.department}

                        </p>


                        {/* TELÉFONO */}

                        <p>

                          Tel:{" "}
                          {address.phone}

                        </p>


                        {/* REFERENCIA */}

                        {address.reference && (

                          <p>

                            Ref:{" "}
                            {address.reference}

                          </p>

                        )}


                        {/* ACCIONES */}

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