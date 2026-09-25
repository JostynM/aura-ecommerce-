import {
  useState,
  type FormEvent,
} from "react";

import {
  Link,
} from "react-router-dom";

import {
  CheckCircle2,
  Eye,
  EyeOff,
  MailCheck,
} from "lucide-react";

import {
  registerUser,
  resendVerificationEmail,
} from "../services/authService";

import "./Auth.css";


function Register() {

  // ==========================================
  // DATOS DEL FORMULARIO
  // ==========================================

  const [
    firstName,
    setFirstName,
  ] = useState("");

  const [
    lastName,
    setLastName,
  ] = useState("");

  const [
    email,
    setEmail,
  ] = useState("");

  const [
    password,
    setPassword,
  ] = useState("");

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState("");

  const [
    acceptedTerms,
    setAcceptedTerms,
  ] = useState(false);


  // ==========================================
  // MOSTRAR CONTRASEÑAS
  // ==========================================

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [
    showConfirmPassword,
    setShowConfirmPassword,
  ] = useState(false);


  // ==========================================
  // ESTADOS
  // ==========================================

  const [
    error,
    setError,
  ] = useState("");

  const [
    submitting,
    setSubmitting,
  ] = useState(false);


  // ==========================================
  // REGISTRO COMPLETADO
  // ==========================================

  const [
    registrationCompleted,
    setRegistrationCompleted,
  ] = useState(false);

  const [
    registeredEmail,
    setRegisteredEmail,
  ] = useState("");


  // ==========================================
  // REENVÍO DE CORREO
  // ==========================================

  const [
    resendLoading,
    setResendLoading,
  ] = useState(false);

  const [
    resendMessage,
    setResendMessage,
  ] = useState("");

  const [
    resendError,
    setResendError,
  ] = useState("");


  // ==========================================
  // REGISTRAR USUARIO
  // ==========================================

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {

    event.preventDefault();

    setError("");


    // ========================================
    // VALIDACIONES FRONTEND
    // ========================================

    if (
      firstName.trim().length < 2
    ) {

      setError(
        "El nombre debe tener al menos 2 caracteres."
      );

      return;
    }


    if (
      lastName.trim().length < 2
    ) {

      setError(
        "El apellido debe tener al menos 2 caracteres."
      );

      return;
    }


    if (!email.trim()) {

      setError(
        "Ingresa tu correo electrónico."
      );

      return;
    }


    if (
      password.length < 8
    ) {

      setError(
        "La contraseña debe tener al menos 8 caracteres."
      );

      return;
    }


    if (
      password !== confirmPassword
    ) {

      setError(
        "Las contraseñas no coinciden."
      );

      return;
    }


    if (!acceptedTerms) {

      setError(
        "Debes aceptar los términos y la política de privacidad."
      );

      return;
    }


    // ========================================
    // REGISTRO EN FASTAPI
    // ========================================

    try {

      setSubmitting(
        true
      );


      await registerUser({

        first_name:
          firstName.trim(),

        last_name:
          lastName.trim(),

        email:
          email.trim(),

        password,
      });


      // ======================================
      // GUARDAMOS EMAIL PARA PODER REENVIAR
      // ======================================

      setRegisteredEmail(
        email.trim()
      );


      // ======================================
      // MOSTRAMOS PANTALLA DE CONFIRMACIÓN
      // ======================================

      setRegistrationCompleted(
        true
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
          "No se pudo crear la cuenta."
        );

      }

    } finally {

      setSubmitting(
        false
      );

    }
  };


  // ==========================================
  // REENVIAR CORREO
  // ==========================================

  const handleResendVerification =
    async () => {

      if (!registeredEmail) {
        return;
      }


      setResendMessage("");
      setResendError("");


      try {

        setResendLoading(
          true
        );


        const response =
          await resendVerificationEmail(
            registeredEmail
          );


        setResendMessage(
          response.message
        );


      } catch (error) {

        if (
          error instanceof Error
        ) {

          setResendError(
            error.message
          );

        } else {

          setResendError(
            "No se pudo reenviar el correo."
          );

        }

      } finally {

        setResendLoading(
          false
        );

      }
    };


  // ==========================================
  // REGISTRO COMPLETADO
  // ==========================================

  if (registrationCompleted) {

    return (

      <main className="auth-page">

        <section className="auth-panel">


          {/* MARCA */}

          <aside className="auth-brand">

            <span>
              AURA
            </span>

            <h1>
              Tu cuenta
              <br />
              está casi lista.
            </h1>

            <p>
              Solo falta confirmar tu correo
              electrónico para comenzar a
              disfrutar de AURA.
            </p>

          </aside>


          {/* CONFIRMACIÓN */}

          <section className="auth-verification-panel">

            <div className="auth-verification-icon">

              <MailCheck
                size={38}
                strokeWidth={1.4}
              />

            </div>


            <span className="auth-verification-label">
              VERIFICACIÓN DE CUENTA
            </span>


            <h2>
              Revisa tu correo
            </h2>


            <p>
              Hemos enviado un enlace de
              verificación a:
            </p>


            <strong className="auth-verification-email">
              {registeredEmail}
            </strong>


            <div className="auth-verification-note">

              <CheckCircle2
                size={18}
                strokeWidth={1.5}
              />

              <span>
                Abre el correo y selecciona
                “Verificar mi correo”.
              </span>

            </div>


            {resendMessage && (

              <p className="auth-success">
                {resendMessage}
              </p>

            )}


            {resendError && (

              <p className="auth-error">
                {resendError}
              </p>

            )}


            <button
              type="button"
              className="auth-submit"
              onClick={
                handleResendVerification
              }
              disabled={
                resendLoading
              }
            >

              {resendLoading
                ? "Enviando..."
                : "Reenviar correo"}

            </button>


            <Link
              to="/login"
              className="auth-verification-login"
            >
              Ir a iniciar sesión
            </Link>


            <p className="auth-verification-help">
              Si no encuentras el mensaje,
              revisa también la carpeta de
              spam.
            </p>

          </section>

        </section>

      </main>
    );
  }


  // ==========================================
  // FORMULARIO
  // ==========================================

  return (

    <main className="auth-page">

      <section className="auth-panel">


        {/* ================================= */}
        {/* PANEL DE MARCA */}
        {/* ================================= */}

        <aside className="auth-brand">

          <span>
            AURA
          </span>


          <h1>
            Descubre tu
            <br />
            próxima esencia.
          </h1>


          <p>
            Guarda tus perfumes favoritos,
            consulta tus pedidos y disfruta
            de una experiencia personalizada.
          </p>

        </aside>


        {/* ================================= */}
        {/* FORMULARIO */}
        {/* ================================= */}

        <form
          className="auth-form"
          onSubmit={handleSubmit}
        >

          <div className="auth-form-title">

            <span>
              CREAR CUENTA
            </span>


            <h2>
              Únete a AURA
            </h2>


            <p>
              Crea tu cuenta para disfrutar
              de una experiencia personalizada.
            </p>

          </div>


          {/* NOMBRE / APELLIDO */}

          <div className="auth-row">

            <div className="auth-field">

              <label htmlFor="firstName">
                Nombre
              </label>

              <input
                id="firstName"
                type="text"
                value={firstName}
                onChange={(event) =>
                  setFirstName(
                    event.target.value
                  )
                }
                required
              />

            </div>


            <div className="auth-field">

              <label htmlFor="lastName">
                Apellido
              </label>

              <input
                id="lastName"
                type="text"
                value={lastName}
                onChange={(event) =>
                  setLastName(
                    event.target.value
                  )
                }
                required
              />

            </div>

          </div>


          {/* CORREO */}

          <div className="auth-field">

            <label htmlFor="email">
              Correo electrónico
            </label>

            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(
                  event.target.value
                )
              }
              required
            />

          </div>


          {/* CONTRASEÑA */}

          <div className="auth-field">

            <label htmlFor="password">
              Contraseña
            </label>


            <div className="password-input">

              <input
                id="password"
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
                value={password}
                onChange={(event) =>
                  setPassword(
                    event.target.value
                  )
                }
                required
              />


              <button
                type="button"
                aria-label={
                  showPassword
                    ? "Ocultar contraseña"
                    : "Mostrar contraseña"
                }
                onClick={() =>
                  setShowPassword(
                    (current) =>
                      !current
                  )
                }
              >

                {showPassword
                  ? <EyeOff size={17} />
                  : <Eye size={17} />
                }

              </button>

            </div>

          </div>


          {/* CONFIRMAR CONTRASEÑA */}

          <div className="auth-field">

            <label htmlFor="confirmPassword">
              Confirmar contraseña
            </label>


            <div className="password-input">

              <input
                id="confirmPassword"
                type={
                  showConfirmPassword
                    ? "text"
                    : "password"
                }
                value={
                  confirmPassword
                }
                onChange={(event) =>
                  setConfirmPassword(
                    event.target.value
                  )
                }
                required
              />


              <button
                type="button"
                aria-label={
                  showConfirmPassword
                    ? "Ocultar contraseña"
                    : "Mostrar contraseña"
                }
                onClick={() =>
                  setShowConfirmPassword(
                    (current) =>
                      !current
                  )
                }
              >

                {showConfirmPassword
                  ? <EyeOff size={17} />
                  : <Eye size={17} />
                }

              </button>

            </div>

          </div>


          {/* TÉRMINOS */}

          <label className="auth-checkbox">

            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={(event) =>
                setAcceptedTerms(
                  event.target.checked
                )
              }
            />


            <span>
              Acepto los términos y la política
              de privacidad de AURA.
            </span>

          </label>


          {/* ERROR */}

          {error && (

            <p className="auth-error">
              {error}
            </p>

          )}


          {/* BOTÓN */}

          <button
            type="submit"
            className="auth-submit"
            disabled={submitting}
          >

            {submitting
              ? "Creando cuenta..."
              : "Crear cuenta"}

          </button>


          <div className="auth-switch">

            <span>
              ¿Ya tienes cuenta?
            </span>


            <Link to="/login">
              Iniciar sesión
            </Link>

          </div>

        </form>

      </section>

    </main>
  );
}


export default Register;