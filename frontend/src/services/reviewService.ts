// ==========================================
// API
// ==========================================

const API_URL = (
  import.meta.env.VITE_API_URL ??
  "http://127.0.0.1:8000"
).replace(/\/+$/, "");


// ==========================================
// TIPOS
// ==========================================

export interface Review {
  id: number;

  user_id: number;

  product_id: number;

  rating: number;

  comment: string | null;

  author_name: string;

  created_at: string;

  updated_at: string;
}


export interface ReviewSummary {
  average_rating: number;

  total_reviews: number;
}


export interface CreateReviewPayload {
  rating: number;

  comment?: string | null;
}


export interface UpdateReviewPayload {
  rating?: number;

  comment?: string | null;
}


// ==========================================
// FUNCIÓN AUXILIAR PARA ERRORES
// ==========================================

async function getErrorMessage(
  response: Response,
  fallback: string
): Promise<string> {

  try {

    const data =
      await response.json();


    if (
      typeof data?.detail ===
      "string"
    ) {

      return data.detail;

    }

  } catch {

    // Si FastAPI no devolvió JSON,
    // usamos el mensaje por defecto.

  }


  return fallback;
}


// ==========================================
// OBTENER RESEÑAS DE UN PRODUCTO
//
// GET /reviews/product/{product_id}
// ==========================================

export async function getProductReviews(
  productId: number
): Promise<Review[]> {

  const response =
    await fetch(
      `${API_URL}/reviews/product/${productId}`,
      {
        method: "GET",
      }
    );


  if (!response.ok) {

    const message =
      await getErrorMessage(
        response,
        "No se pudieron obtener las reseñas."
      );


    throw new Error(
      message
    );

  }


  return response.json();
}


// ==========================================
// OBTENER RESUMEN DE CALIFICACIONES
//
// GET /reviews/product/{product_id}/summary
// ==========================================

export async function getReviewSummary(
  productId: number
): Promise<ReviewSummary> {

  const response =
    await fetch(
      `${API_URL}/reviews/product/${productId}/summary`,
      {
        method: "GET",
      }
    );


  if (!response.ok) {

    const message =
      await getErrorMessage(
        response,
        "No se pudo obtener la calificación del producto."
      );


    throw new Error(
      message
    );

  }


  return response.json();
}


// ==========================================
// CREAR RESEÑA
//
// POST /reviews/{product_id}
// ==========================================

export async function createReview(
  token: string,
  productId: number,
  payload: CreateReviewPayload
): Promise<Review> {

  const response =
    await fetch(
      `${API_URL}/reviews/${productId}`,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",

          Authorization:
            `Bearer ${token}`,
        },

        body:
          JSON.stringify(
            payload
          ),
      }
    );


  if (!response.ok) {

    const message =
      await getErrorMessage(
        response,
        "No se pudo publicar la reseña."
      );


    throw new Error(
      message
    );

  }


  return response.json();
}


// ==========================================
// ACTUALIZAR RESEÑA
//
// PUT /reviews/{review_id}
// ==========================================

export async function updateReview(
  token: string,
  reviewId: number,
  payload: UpdateReviewPayload
): Promise<Review> {

  const response =
    await fetch(
      `${API_URL}/reviews/${reviewId}`,
      {
        method: "PUT",

        headers: {
          "Content-Type":
            "application/json",

          Authorization:
            `Bearer ${token}`,
        },

        body:
          JSON.stringify(
            payload
          ),
      }
    );


  if (!response.ok) {

    const message =
      await getErrorMessage(
        response,
        "No se pudo actualizar la reseña."
      );


    throw new Error(
      message
    );

  }


  return response.json();
}


// ==========================================
// ELIMINAR RESEÑA
//
// DELETE /reviews/{review_id}
// ==========================================

export async function deleteReview(
  token: string,
  reviewId: number
): Promise<void> {

  const response =
    await fetch(
      `${API_URL}/reviews/${reviewId}`,
      {
        method: "DELETE",

        headers: {
          Authorization:
            `Bearer ${token}`,
        },
      }
    );


  if (!response.ok) {

    const message =
      await getErrorMessage(
        response,
        "No se pudo eliminar la reseña."
      );


    throw new Error(
      message
    );

  }
}