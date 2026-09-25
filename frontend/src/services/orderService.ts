const API_URL = import.meta.env.VITE_API_URL;


// ==========================================
// ESTADOS PERMITIDOS DE UN PEDIDO
// ==========================================

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled";


// ==========================================
// ESTADOS DE PAGO
// ==========================================

export type PaymentStatus =
  | "pending"
  | "paid"
  | "failed"
  | "refunded";


// ==========================================
// ESTADOS DEL STOCK DEL PEDIDO
// ==========================================

export type StockStatus =
  | "reserved"
  | "committed"
  | "released"
  | "legacy";


// ==========================================
// ITEM DE PEDIDO
// ==========================================

export type OrderItemResponse = {
  id: number;

  product_id: number;

  product_name: string;

  brand: string;

  size_ml: number;

  unit_price: string | number;

  quantity: number;

  line_total: string | number;
};


// ==========================================
// PEDIDO
// ==========================================

export type OrderResponse = {
  id: number;

  order_number: string;

  // Estado logístico
  status: OrderStatus;

  // Estado financiero
  payment_status: PaymentStatus;

  // Estado de la reserva de inventario
  stock_status: StockStatus;

  // Fecha hasta la que está reservado.
  //
  // Será null cuando:
  // - se pagó
  // - se liberó
  // - es un pedido antiguo
  stock_reserved_until: string | null;

  // Fecha/hora desde la que el pedido
  // puede empezar a ser procesado.
  //
  // Ejemplo:
  // compra domingo → lunes 09:00
  //
  // Puede ser null en pedidos antiguos
  // o todavía no programados.
  scheduled_processing_at: string | null;

  subtotal: string | number;

  shipping_cost: string | number;

  total: string | number;

  recipient_name: string;

  phone: string;

  department: string;

  province: string;

  district: string;

  address_line: string;

  reference: string | null;

  created_at: string;

  items: OrderItemResponse[];
};


// ==========================================
// DATOS PARA CREAR PEDIDO
// ==========================================

export type OrderCreateData = {
  address_id: number;

  items: {
    product_id: number;

    quantity: number;
  }[];
};


// ==========================================
// HEADERS DE AUTENTICACIÓN
// ==========================================

function getAuthHeaders(
  token: string
) {
  return {
    "Content-Type": "application/json",

    Authorization:
      `Bearer ${token}`,
  };
}


// ==========================================
// CLIENTE - OBTENER MIS PEDIDOS
// GET /orders
// ==========================================

export async function getOrders(
  token: string
): Promise<OrderResponse[]> {

  const response = await fetch(
    `${API_URL}/orders`,
    {
      method: "GET",

      headers:
        getAuthHeaders(token),
    }
  );


  if (!response.ok) {

    throw new Error(
      "No se pudieron obtener los pedidos"
    );
  }


  return response.json();
}


// ==========================================
// CLIENTE - OBTENER UN PEDIDO
// GET /orders/{id}
// ==========================================

export async function getOrderById(
  token: string,
  orderId: number
): Promise<OrderResponse> {

  const response = await fetch(
    `${API_URL}/orders/${orderId}`,
    {
      method: "GET",

      headers:
        getAuthHeaders(token),
    }
  );


  if (!response.ok) {

    if (
      response.status === 404
    ) {
      throw new Error(
        "Pedido no encontrado"
      );
    }


    throw new Error(
      "No se pudo obtener el pedido"
    );
  }


  return response.json();
}


// ==========================================
// CLIENTE - CREAR PEDIDO
// POST /orders
// ==========================================

export async function createOrder(
  token: string,
  data: OrderCreateData
): Promise<OrderResponse> {

  const response = await fetch(
    `${API_URL}/orders`,
    {
      method: "POST",

      headers:
        getAuthHeaders(token),

      body:
        JSON.stringify(data),
    }
  );


  if (!response.ok) {

    const errorData =
      await response.json();


    throw new Error(
      errorData.detail ||
        "No se pudo crear el pedido"
    );
  }


  return response.json();
}


// ==========================================
// ADMIN - OBTENER TODOS LOS PEDIDOS
// GET /orders/admin/all
// ==========================================

export async function getAdminOrders(
  token: string
): Promise<OrderResponse[]> {

  const response = await fetch(
    `${API_URL}/orders/admin/all`,
    {
      method: "GET",

      headers:
        getAuthHeaders(token),
    }
  );


  if (!response.ok) {

    throw new Error(
      "No se pudieron obtener los pedidos"
    );
  }


  return response.json();
}


// ==========================================
// ADMIN - OBTENER UN PEDIDO
// GET /orders/admin/{id}
// ==========================================

export async function getAdminOrderById(
  token: string,
  orderId: number
): Promise<OrderResponse> {

  const response = await fetch(
    `${API_URL}/orders/admin/${orderId}`,
    {
      method: "GET",

      headers:
        getAuthHeaders(token),
    }
  );


  if (!response.ok) {

    if (
      response.status === 404
    ) {
      throw new Error(
        "Pedido no encontrado"
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
      "No se pudo obtener el pedido"
    );
  }


  return response.json();
}


// ==========================================
// ADMIN - CAMBIAR ESTADO DEL PEDIDO
// PATCH /orders/admin/{id}/status
// ==========================================

export async function updateOrderStatus(
  token: string,
  orderId: number,
  newStatus: OrderStatus
): Promise<OrderResponse> {

  const response = await fetch(
    `${API_URL}/orders/admin/${orderId}/status`,
    {
      method: "PATCH",

      headers:
        getAuthHeaders(token),

      body:
        JSON.stringify({
          status: newStatus,
        }),
    }
  );


  if (!response.ok) {

    const errorData =
      await response.json();


    let message =
      "No se pudo actualizar el pedido";


    if (
      typeof errorData?.detail ===
      "string"
    ) {
      message =
        errorData.detail;
    }


    throw new Error(
      message
    );
  }


  return response.json();
}