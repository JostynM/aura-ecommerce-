import {
  useState,
  type FormEvent,
} from "react";

import {
  Link,
} from "react-router-dom";

import {
  Mail,
  MailCheck,
} from "lucide-react";

import {
  forgotPassword,
} from "../services/authService";

import "./Auth.css";


function ForgotPassword() {

  const [
    email,
    setEmail,
  ] = useState("");


  const [
    error,
    setError,
  ] = useState("");


  const [
    success,
    setSuccess,
  ] = useState("");


  const [
    loading,
    setLoading,
  ] = useState(false);


  // ==========================================
  // ENVIAR SOLICITUD
  // ==========================================

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {

    event.preventDefault();

    setError("");
    setSuccess("");


    if (!email.trim()) {

      setError(
        "Ingresa tu correo electrónico."
      );

      return;
    }


    try {

      setLoading(
        true
      );


      const response =
        await forgotPassword(
          email.trim()
        );


      setSuccess(
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
          "No se pudo procesar la solicitud."
        );

      }

    } finally {

      setLoading(
        false
      );

    }
  };


  return (

    <main className="auth-page">

      <section className="auth-panel">


        <aside className="auth-brand">

          <span>
            AURA
          </span>


          <h1>
            Recupera tu
            <br />
            cuenta.
          </h1>


          <p>
            Te enviaremos un enlace seguro
            para crear una nueva contraseña.
          </p>

        </aside>


        <section className="auth-form">


          <div className="auth-form-title">

            <span>
              SEGURIDAD
            </span>


            <h2>
              Recuperar contraseña
            </h2>


            <p>
              Ingresa el correo asociado
              a tu cuenta de AURA.
            </p>

          </div>


          {!success ? (

            <form
              onSubmit={handleSubmit}
            >

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
                  placeholder="correo@ejemplo.com"
                  required
                />

              </div>


              {error && (

                <p className="auth-error">
                  {error}
                </p>

              )}


              <button
                type="submit"
                className="auth-submit"
                disabled={loading}
              >

                {loading
                  ? "Enviando..."
                  : "Enviar enlace"}

              </button>

            </form>

          ) : (

            <div className="auth-verification-panel">

              <div className="auth-verification-icon">

                <MailCheck
                  size={38}
                  strokeWidth={1.4}
                />

              </div>


              <h2>
                Revisa tu correo
              </h2>


              <p>
                {success}
              </p>


              <p className="auth-verification-help">
                Revisa también tu carpeta
                de spam.
              </p>

            </div>

          )}


          <div className="auth-switch">

            <Mail
              size={15}
              strokeWidth={1.5}
            />

            <Link to="/login">
              Volver a iniciar sesión
            </Link>

          </div>

        </section>

      </section>

    </main>
  );
}


export default ForgotPassword;