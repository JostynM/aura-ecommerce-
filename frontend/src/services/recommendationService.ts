export type ChatRole = "user" | "assistant";

export interface ChatHistoryItem {
  role: ChatRole;
  content: string;
}

export interface RecommendedProduct {
  id: number;
  slug: string;
  brand: string;
  name: string;
  price: number | string;
  size_ml: number;
  perfume_type: string;
  gender: string;
  image_url: string | null;
  reason: string;
}

export interface ChatRecommendationRequest {
  message: string;
  history: ChatHistoryItem[];
}

export interface ChatRecommendationResponse {
  type: "question" | "recommendations";
  message: string;
  recommendations: RecommendedProduct[];
}


const API_URL =
  import.meta.env.VITE_API_URL ??
  "http://127.0.0.1:8000";


export async function sendRecommendationMessage(
  data: ChatRecommendationRequest,
): Promise<ChatRecommendationResponse> {

  const response = await fetch(
    `${API_URL}/recommendations/chat`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify(data),
    },
  );


  if (!response.ok) {

    let message =
      "No fue posible comunicarse con AURA.";

    try {

      const errorData = await response.json();

      if (errorData?.detail) {
        message = errorData.detail;
      }

    } catch {
      // Conservamos el mensaje por defecto.
    }

    throw new Error(message);
  }


  return response.json();
}