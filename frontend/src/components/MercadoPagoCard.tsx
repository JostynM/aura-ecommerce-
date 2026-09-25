import type { ComponentProps } from "react";
import { CardPayment } from "@mercadopago/sdk-react";

import {
  createPayment,
  type PaymentResponse,
} from "../services/paymentService";

import "./MercadoPagoCard.css";


type CardPaymentOnSubmit = NonNullable<
  ComponentProps<typeof CardPayment>["onSubmit"]
>;


type MercadoPagoCardProps = {
  orderId: number;
  amount: number;
  accessToken: string;

  onPaymentResult: (
    payment: PaymentResponse
  ) => void;
};


function MercadoPagoCard({
  orderId,
  amount,
  accessToken,
  onPaymentResult,
}: MercadoPagoCardProps) {
  const handleSubmit: CardPaymentOnSubmit = async (
    formData,
    additionalData
  ) => {
    try {
      // =====================================
      // VALIDAR TOKEN
      // =====================================

      if (!formData.token) {
        throw new Error(
          "Mercado Pago no generó el token de la tarjeta."
        );
      }


      // =====================================
      // VALIDAR MÉTODO DE PAGO
      // =====================================

      if (!formData.payment_method_id) {
        throw new Error(
          "No se pudo identificar el método de pago."
        );
      }


      // =====================================
      // VALIDAR TIPO DE PAGO
      // =====================================

      const paymentTypeId =
        additionalData?.paymentTypeId;


      if (!paymentTypeId) {
        throw new Error(
          "No se pudo identificar el tipo de tarjeta."
        );
      }


      // =====================================
      // VALIDAR CORREO
      // =====================================

      const payerEmail =
        formData.payer?.email;


      if (!payerEmail) {
        throw new Error(
          "Ingresa un correo válido para realizar el pago."
        );
      }


      // =====================================
      // DOCUMENTO DEL PAGADOR
      // =====================================

      const identification =
        formData.payer?.identification?.type &&
        formData.payer?.identification?.number
          ? {
              type:
                formData.payer.identification.type,

              number:
                formData.payer.identification.number,
            }
          : null;


      // =====================================
      // MOSTRAR DATOS DE PRUEBA
      // =====================================

      console.log(
        "Método de pago:",
        formData.payment_method_id
      );

      console.log(
        "Tipo de pago:",
        paymentTypeId
      );


      // =====================================
      // ENVIAR PAGO A FASTAPI
      // =====================================

      const payment = await createPayment(
        accessToken,
        {
          order_id: orderId,

          token:
            formData.token,

          payment_method_id:
            formData.payment_method_id,

          payment_type_id:
            paymentTypeId,

          installments:
            formData.installments ?? 1,

          issuer_id:
            formData.issuer_id || null,

          payer_email:
            payerEmail,

          identification,

          idempotency_key:
            crypto.randomUUID(),
        }
      );


      // =====================================
      // ENVIAR RESULTADO AL CHECKOUT
      // =====================================

      onPaymentResult(payment);

    } catch (error) {
      console.error(
        "Error procesando pago:",
        error
      );

      throw error;
    }
  };


  // =====================================
  // MERCADO PAGO LISTO
  // =====================================

  const handleReady = () => {
    console.log(
      "Formulario de Mercado Pago listo."
    );
  };


  // =====================================
  // ERROR DEL BRICK
  // =====================================

  const handleError = (
    error: unknown
  ) => {
    console.error(
      "Error del Brick de Mercado Pago:",
      error
    );
  };


  return (
    <section className="mercado-pago-card">

      <div className="mercado-pago-card-header">

        <span className="mercado-pago-eyebrow">
          PAGO SEGURO
        </span>

        <h2>
          Paga con tarjeta
        </h2>

        <p>
          Completa los datos de tu tarjeta
          para finalizar tu compra.
        </p>

      </div>


      <div className="mercado-pago-card-content">

        <CardPayment
          initialization={{
            amount,
          }}
          onSubmit={handleSubmit}
          onReady={handleReady}
          onError={handleError}
        />

      </div>

    </section>
  );
}


export default MercadoPagoCard;