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

export interface Favorite {
  id: number;

  user_id: number;

  product_id: number;

  created_at: string;
}


export interface FavoriteCheckResponse {
  is_favorite: boolean;
}


// ==========================================
// OBTENER FAVORITOS
//
// GET /favorites
// ==========================================

export async function getFavorites(
  token: string
): Promise<Favorite[]> {

  const response = await fetch(
    `${API_URL}/favorites`,
    {
      method: "GET",

      headers: {
        Authorization:
          `Bearer ${token}`,
      },
    }
  );


  if (!response.ok) {

    const data = await response
      .json()
      .catch(() => null);


    throw new Error(
      data?.detail ??
      "No se pudieron obtener los favoritos."
    );

  }


  return response.json();
}


// ==========================================
// AGREGAR FAVORITO
//
// POST /favorites/{product_id}
// ==========================================

export async function addFavorite(
  token: string,
  productId: number
): Promise<Favorite> {

  const response = await fetch(
    `${API_URL}/favorites/${productId}`,
    {
      method: "POST",

      headers: {
        Authorization:
          `Bearer ${token}`,
      },
    }
  );


  if (!response.ok) {

    const data = await response
      .json()
      .catch(() => null);


    throw new Error(
      data?.detail ??
      "No se pudo agregar el producto a favoritos."
    );

  }


  return response.json();
}


// ==========================================
// ELIMINAR FAVORITO
//
// DELETE /favorites/{product_id}
// ==========================================

export async function removeFavorite(
  token: string,
  productId: number
): Promise<void> {

  const response = await fetch(
    `${API_URL}/favorites/${productId}`,
    {
      method: "DELETE",

      headers: {
        Authorization:
          `Bearer ${token}`,
      },
    }
  );


  if (!response.ok) {

    const data = await response
      .json()
      .catch(() => null);


    throw new Error(
      data?.detail ??
      "No se pudo eliminar el producto de favoritos."
    );

  }

}


// ==========================================
// COMPROBAR FAVORITO
//
// GET /favorites/check/{product_id}
// ==========================================

export async function checkFavorite(
  token: string,
  productId: number
): Promise<boolean> {

  const response = await fetch(
    `${API_URL}/favorites/check/${productId}`,
    {
      method: "GET",

      headers: {
        Authorization:
          `Bearer ${token}`,
      },
    }
  );


  if (!response.ok) {

    const data = await response
      .json()
      .catch(() => null);


    throw new Error(
      data?.detail ??
      "No se pudo comprobar el favorito."
    );

  }


  const data:
    FavoriteCheckResponse =
      await response.json();


  return data.is_favorite;
}