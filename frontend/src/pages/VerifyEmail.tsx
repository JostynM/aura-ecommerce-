import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Link,
  useSearchParams,
} from "react-router-dom";

import {
  CheckCircle2,
  LoaderCircle,
  MailCheck,
  XCircle,
} from "lucide-react";

import {
  verifyEmail,
} from "../services/authService";

import "./VerifyEmail.css";


type VerificationStatus =
  | "loading"
  | "success"
  | "error";


function VerifyEmail() {

  // ==========================================
  // TOKEN DE LA URL
  // ==========================================

  const [
    searchParams,
  ] = useSearchParams();


  const token =
    searchParams.get(
      "token"
    );


  // ==========================================
  // ESTADO DE LA PÁGINA
  // ==========================================

  const [
    status,
    setStatus,
  ] = useState<VerificationStatus>(
    "loading"
  );


  const [
    message,
    setMessage,
  ] = useState(
    "Estamos verificando tu correo electrónico."
  );


  // ==========================================
  // EVITAR PETICIONES DUPLICADAS
  // ==========================================

  const verificationStarted =
    useRef(false);


  // ==========================================
  // VERIFICAR CORREO
  // ==========================================

  useEffect(() => {

    if (
      verificationStarted.current
    ) {
      return;
    }


    verificationStarted.current =
      true;


    async function handleVerification() {

      // ======================================
      // NO HAY TOKEN
      // ======================================

      if (!token) {

        setStatus(
          "error"
        );

        setMessage(
          "El enlace de verificación no contiene un token válido."
        );

        return;
      }


      // ======================================
      // LLAMAR AL BACKEND
      // ======================================

      try {

        const response =
          await verifyEmail(
            token
          );


        setStatus(
          "success"
        );


        setMessage(
          response.message
        );

      } catch (error) {

        setStatus(
          "error"
        );


        if (
          error instanceof Error
        ) {

          setMessage(
            error.message
          );

        } else {

          setMessage(
            "No se pudo verificar tu correo electrónico."
          );
        }
      }
    }


    handleVerification();

  }, [
    token,
  ]);


  // ==========================================
  // VISTA
  // ==========================================

  return (

    <main className="verify-email-page">

      <section className="verify-email-card">


        {/* ================================= */}
        {/* MARCA */}
        {/* ================================= */}

        <div className="verify-email-brand">

          <span>
            AURA
          </span>

          <small>
            PERFUMERÍA
          </small>

        </div>


        {/* ================================= */}
        {/* CARGANDO */}
        {/* ================================= */}

        {status === "loading" && (

          <>

            <div className="verify-email-icon loading">

              <LoaderCircle
                size={38}
                strokeWidth={1.4}
              />

            </div>


            <h1>
              Verificando tu correo
            </h1>


            <p>
              {message}
            </p>


            <span className="verify-email-help">
              Esto tomará solo unos segundos.
            </span>

          </>

        )}


        {/* ================================= */}
        {/* ÉXITO */}
        {/* ================================= */}

        {status === "success" && (

          <>

            <div className="verify-email-icon success">

              <CheckCircle2
                size={42}
                strokeWidth={1.4}
              />

            </div>


            <h1>
              Correo verificado
            </h1>


            <p>
              {message}
            </p>


            <div className="verify-email-notice">

              <MailCheck
                size={18}
                strokeWidth={1.5}
              />

              <span>
                Tu cuenta de AURA ya está
                preparada para iniciar sesión.
              </span>

            </div>


            <Link
              to="/login"
              className="verify-email-primary"
            >
              INICIAR SESIÓN
            </Link>

          </>

        )}


        {/* ================================= */}
        {/* ERROR */}
        {/* ================================= */}

        {status === "error" && (

          <>

            <div className="verify-email-icon error">

              <XCircle
                size={42}
                strokeWidth={1.4}
              />

            </div>


            <h1>
              No pudimos verificar tu correo
            </h1>


            <p>
              {message}
            </p>


            <div className="verify-email-actions">

              <Link
                to="/login"
                className="verify-email-primary"
              >
                IR A INICIAR SESIÓN
              </Link>


              <Link
                to="/"
                className="verify-email-secondary"
              >
                Volver a AURA
              </Link>

            </div>

          </>

        )}

      </section>

    </main>
  );
}


export default VerifyEmail;