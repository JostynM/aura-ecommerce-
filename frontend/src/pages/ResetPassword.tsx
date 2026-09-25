import {
  useState,
  type FormEvent,
} from "react";

import {
  Link,
  useSearchParams,
} from "react-router-dom";

import {
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
} from "lucide-react";

import {
  resetPassword,
} from "../services/authService";

import "./Auth.css";


function ResetPassword() {

  const [
    searchParams,
  ] = useSearchParams();


  const token =
    searchParams.get(
      "token"
    );


  const [
    password,
    setPassword,
  ] = useState("");


  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState("");


  const [
    showPassword,
    setShowPassword,
  ] = useState(false);


  const [
    showConfirmPassword,
    setShowConfirmPassword,
  ] = useState(false);


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
  // CAMBIAR CONTRASEÑA
  // ==========================================

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {

    event.preventDefault();

    setError("");
    setSuccess("");


    if (!token) {

      setError(
        "El enlace para restablecer la contraseña no es válido."
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
      password !==
      confirmPassword
    ) {

      setError(
        "Las contraseñas no coinciden."
      );

      return;
    }


    try {

      setLoading(
        true
      );


      const response =
        await resetPassword(
          token,
          password
        );


      setSuccess(
        response.message
      );


      setPassword("");
      setConfirmPassword("");


    } catch (error) {

      if (
        error instanceof Error
      ) {

        setError(
          error.message
        );

      } else {

        setError(
          "No se pudo cambiar la contraseña."
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
            Protege tu
            <br />
            cuenta.
          </h1>


          <p>
            Crea una nueva contraseña
            segura para continuar usando AURA.
          </p>

        </aside>


        <section className="auth-form">


          {!success ? (

            <>

              <div className="auth-form-title">

                <span>
                  SEGURIDAD
                </span>


                <h2>
                  Nueva contraseña
                </h2>


                <p>
                  Ingresa una contraseña
                  diferente a la anterior.
                </p>

              </div>


              <form
                onSubmit={handleSubmit}
              >


                {/* NUEVA CONTRASEÑA */}

                <div className="auth-field">

                  <label htmlFor="password">
                    Nueva contraseña
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
                      onClick={() =>
                        setShowPassword(
                          (current) =>
                            !current
                        )
                      }
                    >

                      {showPassword
                        ? <EyeOff size={18} />
                        : <Eye size={18} />
                      }

                    </button>

                  </div>

                </div>


                {/* CONFIRMAR */}

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
                      onClick={() =>
                        setShowConfirmPassword(
                          (current) =>
                            !current
                        )
                      }
                    >

                      {showConfirmPassword
                        ? <EyeOff size={18} />
                        : <Eye size={18} />
                      }

                    </button>

                  </div>

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
                    ? "Actualizando..."
                    : "Cambiar contraseña"}

                </button>

              </form>

            </>

          ) : (

            <div className="auth-verification-panel">

              <div className="auth-verification-icon">

                <CheckCircle2
                  size={40}
                  strokeWidth={1.4}
                />

              </div>


              <span className="auth-verification-label">
                CONTRASEÑA ACTUALIZADA
              </span>


              <h2>
                Todo listo
              </h2>


              <p>
                {success}
              </p>


              <Link
                to="/login"
                className="auth-submit"
              >
                INICIAR SESIÓN
              </Link>

            </div>

          )}


          {!success && (

            <div className="auth-switch">

              <KeyRound
                size={15}
                strokeWidth={1.5}
              />

              <Link to="/login">
                Volver a iniciar sesión
              </Link>

            </div>

          )}

        </section>

      </section>

    </main>
  );
}


export default ResetPassword;