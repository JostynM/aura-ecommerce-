import {
  useState,
} from "react";

import {
  Eye,
  EyeOff,
  MailWarning,
} from "lucide-react";

import {
  Link,
  useNavigate,
} from "react-router-dom";

import {
  useAuth,
} from "../context/useAuth";

import {
  getCurrentUser,
  loginUser,
  resendVerificationEmail,
} from "../services/authService";

import "./Auth.css";


function Login() {

  const navigate =
    useNavigate();

  const {
    login,
  } = useAuth();


  // ==========================================
  // FORMULARIO
  // ==========================================

  const [
    email,
    setEmail,
  ] = useState("");

  const [
    password,
    setPassword,
  ] = useState("");


  const [
    showPassword,
    setShowPassword,
  ] = useState(false);


  // ==========================================
  // ESTADOS
  // ==========================================

  const [
    error,
    setError,
  ] = useState("");

  const [
    loading,
    setLoading,
  ] = useState(false);


  // ==========================================
  // EMAIL SIN VERIFICAR
  // ==========================================

  const [
    needsVerification,
    setNeedsVerification,
  ] = useState(false);


  const [
    resendLoading,
    setResendLoading,
  ] = useState(false);

  const [
    resendMessage,
    setResendMessage,
  ] = useState("");


  // ==========================================
  // LOGIN
  // ==========================================

  const handleSubmit = async (
    event:
      React.FormEvent<HTMLFormElement>
  ) => {

    event.preventDefault();


    setError("");
    setResendMessage("");
    setNeedsVerification(false);


    if (
      !email ||
      !password
    ) {

      setError(
        "Completa todos los campos."
      );

      return;
    }


    try {

      setLoading(
        true
      );


      const response =
        await loginUser({

          email:
            email.trim(),

          password,
        });


      login(
        response.access_token
      );


      const currentUser =
        await getCurrentUser(
          response.access_token
        );


      if (
        currentUser.role ===
        "admin"
      ) {

        navigate(
          "/admin"
        );

      } else {

        navigate(
          "/"
        );

      }


    } catch (error) {

      if (
        error instanceof Error
      ) {

        setError(
          error.message
        );


        // ====================================
        // DETECTAR CUENTA SIN VERIFICAR
        // ====================================

        if (
          error.message
            .toLowerCase()
            .includes(
              "verificar tu correo"
            )
        ) {

          setNeedsVerification(
            true
          );

        }

      } else {

        setError(
          "Ocurrió un error al iniciar sesión."
        );

      }

    } finally {

      setLoading(
        false
      );

    }
  };


  // ==========================================
  // REENVIAR VERIFICACIÓN
  // ==========================================

  const handleResendVerification =
    async () => {

      if (!email.trim()) {
        return;
      }


      setResendMessage("");


      try {

        setResendLoading(
          true
        );


        const response =
          await resendVerificationEmail(
            email.trim()
          );


        setResendMessage(
          response.message
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
            "No se pudo reenviar el correo."
          );

        }

      } finally {

        setResendLoading(
          false
        );

      }
    };


  return (

    <main className="auth-page">

      <section className="auth-panel">


        {/* ================================= */}
        {/* MARCA */}
        {/* ================================= */}

        <div className="auth-brand">

          <span>
            AURA
          </span>


          <h1>
            Bienvenido de nuevo
          </h1>


          <p>
            Inicia sesión para acceder a tus
            pedidos, favoritos y recomendaciones.
          </p>

        </div>


        {/* ================================= */}
        {/* FORMULARIO */}
        {/* ================================= */}

        <form
          className="auth-form"
          onSubmit={handleSubmit}
        >


          {/* CORREO */}

          <div className="auth-field">

            <label htmlFor="email">
              Correo electrónico
            </label>


            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => {

                setEmail(
                  event.target.value
                );

                setNeedsVerification(
                  false
                );

                setResendMessage("");
              }}
              placeholder="correo@ejemplo.com"
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
                placeholder="Tu contraseña"
              />


              <button
                type="button"
                onClick={() =>
                  setShowPassword(
                    !showPassword
                  )
                }
                aria-label={
                  showPassword
                    ? "Ocultar contraseña"
                    : "Mostrar contraseña"
                }
              >

                {showPassword ? (
                  <EyeOff
                    size={18}
                  />
                ) : (
                  <Eye
                    size={18}
                  />
                )}

              </button>

            </div>

          </div>


          {/* RECUPERAR CONTRASEÑA */}

          <div className="auth-options">

            <Link to="/recuperar-password">
              ¿Olvidaste tu contraseña?
            </Link>

          </div>


          {/* ERROR */}

          {error && (

            <p className="auth-error">
              {error}
            </p>

          )}


          {/* ================================= */}
          {/* CORREO NO VERIFICADO */}
          {/* ================================= */}

          {needsVerification && (

            <div className="auth-verification-warning">

              <div className="auth-verification-warning-title">

                <MailWarning
                  size={19}
                  strokeWidth={1.5}
                />

                <strong>
                  Verifica tu correo
                </strong>

              </div>


              <p>
                Tu cuenta existe, pero todavía
                necesitas confirmar tu correo
                electrónico.
              </p>


              <button
                type="button"
                onClick={
                  handleResendVerification
                }
                disabled={
                  resendLoading
                }
              >

                {resendLoading
                  ? "Enviando..."
                  : "Reenviar correo de verificación"}

              </button>


              {resendMessage && (

                <small>
                  {resendMessage}
                </small>

              )}

            </div>

          )}


          {/* LOGIN */}

          <button
            className="auth-submit"
            type="submit"
            disabled={loading}
          >

            {loading
              ? "Ingresando..."
              : "Iniciar sesión"}

          </button>


          <p className="auth-switch">

            ¿No tienes cuenta?

            <Link to="/registro">
              Crear cuenta
            </Link>

          </p>

        </form>

      </section>

    </main>
  );
}


export default Login;