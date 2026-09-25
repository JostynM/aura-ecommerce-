const API_URL = import.meta.env.VITE_API_URL;


export type PaymentIdentification = {
  type: string;
  number: string;
};


export type CreatePaymentData = {
  order_id: number;

  token: string | null;

  payment_method_id: string;

  payment_type_id: string;

  installments: number;

  issuer_id?: string | null;

  payer_email: string;

  identification?:
    | PaymentIdentification
    | null;

  idempotency_key: string;
};


export type PaymentResponse = {
  order_id: number;

  mercado_pago_payment_id:
    | string
    | null;

  mercado_pago_status: string;

  status_detail:
    | string
    | null;

  payment_status: string;
};


export async function createPayment(
  accessToken: string,
  data: CreatePaymentData
): Promise<PaymentResponse> {
  const response = await fetch(
    `${API_URL}/payments/create`,
    {
      method: "POST",

      headers: {
        "Content-Type":
          "application/json",

        Authorization:
          `Bearer ${accessToken}`,
      },

      body: JSON.stringify(data),
    }
  );


  const responseData =
    await response.json();


  if (!response.ok) {
    console.error(
      "Respuesta backend pago:",
      responseData
    );


    let message =
      "No se pudo procesar el pago.";


    if (
      typeof responseData?.detail ===
      "string"
    ) {
      message =
        responseData.detail;
    }


    if (
      typeof responseData?.detail
        ?.message === "string"
    ) {
      message =
        responseData.detail.message;
    }


    throw new Error(message);
  }


  return responseData;
}