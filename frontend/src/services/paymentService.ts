const API_URL = (
  import.meta.env.VITE_API_URL ??
  "http://127.0.0.1:8000"
).replace(/\/+$/, "");

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
  identification?: PaymentIdentification | null;
};

export type PaymentResponse = {
  order_id: number;
  mercado_pago_payment_id: string | null;
  mercado_pago_status: string;
  status_detail: string | null;
  payment_status: string;
};

function getPaymentErrorMessage(responseData: unknown): string {
  const fallback = "No se pudo procesar el pago.";

  if (
    typeof responseData === "object" &&
    responseData !== null &&
    "detail" in responseData
  ) {
    const detail = (responseData as {
      detail?: unknown;
    }).detail;

    if (typeof detail === "string") {
      return detail;
    }

    if (
      typeof detail === "object" &&
      detail !== null &&
      "message" in detail
    ) {
      const message = (detail as {
        message?: unknown;
      }).message;

      if (typeof message === "string") {
        return message;
      }
    }
  }

  return fallback;
}

export async function createPayment(
  accessToken: string,
  data: CreatePaymentData
): Promise<PaymentResponse> {
  const response = await fetch(
    `${API_URL}/payments/create`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(data),
    }
  );

  let responseData: unknown;

  try {
    responseData = await response.json();
  } catch {
    throw new Error(
      "El servidor devolvió una respuesta inválida."
    );
  }

  if (!response.ok) {
    console.error(
      "Respuesta backend pago:",
      responseData
    );

    throw new Error(
      getPaymentErrorMessage(responseData)
    );
  }

  return responseData as PaymentResponse;
}