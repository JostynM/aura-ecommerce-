const API_URL =
  import.meta.env.VITE_API_URL;


// ==========================================
// CLIENTE PARA PANEL ADMIN
// ==========================================

export type AdminUserResponse = {
  id: number;

  first_name: string;
  last_name: string;

  email: string;

  email_verified: boolean;
  is_active: boolean;

  role: string;

  created_at: string;

  order_count: number;
};


// ==========================================
// PEDIDO RESUMIDO DEL CLIENTE
// ==========================================

export type AdminCustomerOrderResponse = {
  id: number;

  order_number: string;

  status: string;

  payment_status: string;

  total: string | number;

  created_at: string;
};


// ==========================================
// DETALLE DEL CLIENTE
// ==========================================

export type AdminUserDetailResponse =
  AdminUserResponse & {

    paid_order_count: number;

    total_spent:
      string | number;

    orders:
      AdminCustomerOrderResponse[];
  };


// ==========================================
// HEADERS
// ==========================================

function getAuthHeaders(
  token: string
) {
  return {
    "Content-Type":
      "application/json",

    Authorization:
      `Bearer ${token}`,
  };
}


// ==========================================
// ADMIN - LISTAR CLIENTES
// GET /users/admin/all
// ==========================================

export async function getAdminUsers(
  token: string
): Promise<
  AdminUserResponse[]
> {

  const response =
    await fetch(
      `${API_URL}/users/admin/all`,
      {
        method: "GET",

        headers:
          getAuthHeaders(
            token
          ),
      }
    );


  if (!response.ok) {

    throw new Error(
      "No se pudieron obtener los clientes"
    );
  }


  return response.json();
}


// ==========================================
// ADMIN - OBTENER DETALLE CLIENTE
// GET /users/admin/{user_id}
// ==========================================

export async function getAdminUserById(
  token: string,
  userId: number
): Promise<
  AdminUserDetailResponse
> {

  const response =
    await fetch(
      `${API_URL}/users/admin/${userId}`,
      {
        method: "GET",

        headers:
          getAuthHeaders(
            token
          ),
      }
    );


  if (!response.ok) {

    if (
      response.status === 404
    ) {

      throw new Error(
        "Cliente no encontrado"
      );
    }


    if (
      response.status === 401
    ) {

      throw new Error(
        "Debes iniciar sesión."
      );
    }


    if (
      response.status === 403
    ) {

      throw new Error(
        "No tienes permisos de administrador."
      );
    }


    throw new Error(
      "No se pudo obtener el cliente"
    );
  }


  return response.json();
}