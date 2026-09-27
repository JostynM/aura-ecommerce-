const API_URL = (
  import.meta.env.VITE_API_URL ??
  "http://127.0.0.1:8000"
).replace(/\/+$/, "");

// ==========================================
// TIPOS
// ==========================================

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled";

export type PaymentStatus =
  | "pending"
  | "paid"
  | "failed"
  | "refunded";

export type StockStatus =
  | "reserved"
  | "committed"
  | "released"
  | "legacy";

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

export type OrderResponse = {
  id: number;
  order_number: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  stock_status: StockStatus;
  stock_reserved_until: string | null;
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

export type PaginatedOrdersResponse = {
  items: OrderResponse[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
};

export type AdminOrdersFilters = {
  search?: string;
  orderStatus?: OrderStatus | "all";
  paymentStatus?: PaymentStatus | "all";
};

export type AdminOrderStatsResponse = {
  total_orders: number;
  pending_orders: number;
  paid_orders: number;
  pending_payments: number;
  paid_revenue: string | number;
};

export type OrderCreateData = {
  address_id: number;
  items: {
    product_id: number;
    quantity: number;
  }[];
};

export type RefundResponse = {
  order_id: number;
  order_number: string;
  mercado_pago_order_id: string;
  mercado_pago_refund_id: string | null;
  payment_status: "refunded";
  refunded_at: string;
  message: string;
};

// ==========================================
// HELPERS
// ==========================================

function getAuthHeaders(token: string) {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

async function getErrorMessage(
  response: Response,
  fallbackMessage: string
): Promise<string> {
  try {
    const data = await response.json();

    if (typeof data?.detail === "string") {
      return data.detail;
    }

    if (
      data?.detail &&
      typeof data.detail === "object" &&
      typeof data.detail.message === "string"
    ) {
      return data.detail.message;
    }

    if (typeof data?.message === "string") {
      return data.message;
    }

    return fallbackMessage;
  } catch {
    return fallbackMessage;
  }
}

function normalizePage(page: number) {
  if (!Number.isInteger(page) || page < 1) {
    return 1;
  }

  return page;
}

function normalizePageSize(
  pageSize: number,
  maxPageSize: number
) {
  if (!Number.isInteger(pageSize) || pageSize < 1) {
    return 1;
  }

  return Math.min(pageSize, maxPageSize);
}

// ==========================================
// CLIENTE - MIS PEDIDOS
// ==========================================

export async function getOrders(
  token: string,
  page = 1,
  pageSize = 10
): Promise<PaginatedOrdersResponse> {
  const safePage = normalizePage(page);
  const safePageSize = normalizePageSize(pageSize, 50);

  const params = new URLSearchParams({
    page: String(safePage),
    page_size: String(safePageSize),
  });

  const response = await fetch(
    `${API_URL}/orders?${params.toString()}`,
    {
      method: "GET",
      headers: getAuthHeaders(token),
    }
  );

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Debes iniciar sesión.");
    }

    const message = await getErrorMessage(
      response,
      "No se pudieron obtener los pedidos."
    );

    throw new Error(message);
  }

  return response.json();
}

// ==========================================
// CLIENTE - DETALLE
// ==========================================

export async function getOrderById(
  token: string,
  orderId: number
): Promise<OrderResponse> {
  const response = await fetch(
    `${API_URL}/orders/${orderId}`,
    {
      method: "GET",
      headers: getAuthHeaders(token),
    }
  );

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error("Pedido no encontrado.");
    }

    if (response.status === 401) {
      throw new Error("Debes iniciar sesión.");
    }

    const message = await getErrorMessage(
      response,
      "No se pudo obtener el pedido."
    );

    throw new Error(message);
  }

  return response.json();
}

// ==========================================
// CLIENTE - CREAR PEDIDO
// ==========================================

export async function createOrder(
  token: string,
  data: OrderCreateData
): Promise<OrderResponse> {
  const response = await fetch(
    `${API_URL}/orders`,
    {
      method: "POST",
      headers: getAuthHeaders(token),
      body: JSON.stringify(data),
    }
  );

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Debes iniciar sesión.");
    }

    const message = await getErrorMessage(
      response,
      "No se pudo crear el pedido."
    );

    throw new Error(message);
  }

  return response.json();
}

// ==========================================
// ADMIN - PEDIDOS
// ==========================================

export async function getAdminOrders(
  token: string,
  page = 1,
  pageSize = 20,
  filters: AdminOrdersFilters = {}
): Promise<PaginatedOrdersResponse> {
  const safePage = normalizePage(page);
  const safePageSize = normalizePageSize(pageSize, 100);

  const params = new URLSearchParams({
    page: String(safePage),
    page_size: String(safePageSize),
  });

  const cleanSearch = filters.search?.trim();

  if (cleanSearch) {
    params.set("search", cleanSearch);
  }

  if (
    filters.orderStatus &&
    filters.orderStatus !== "all"
  ) {
    params.set("status", filters.orderStatus);
  }

  if (
    filters.paymentStatus &&
    filters.paymentStatus !== "all"
  ) {
    params.set(
      "payment_status",
      filters.paymentStatus
    );
  }

  const response = await fetch(
    `${API_URL}/orders/admin/all?${params.toString()}`,
    {
      method: "GET",
      headers: getAuthHeaders(token),
    }
  );

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Debes iniciar sesión.");
    }

    if (response.status === 403) {
      throw new Error(
        "No tienes permisos de administrador."
      );
    }

    const message = await getErrorMessage(
      response,
      "No se pudieron obtener los pedidos."
    );

    throw new Error(message);
  }

  return response.json();
}

// ==========================================
// ADMIN - ESTADÍSTICAS
// ==========================================

export async function getAdminOrderStats(
  token: string
): Promise<AdminOrderStatsResponse> {
  const response = await fetch(
    `${API_URL}/orders/admin/stats`,
    {
      method: "GET",
      headers: getAuthHeaders(token),
    }
  );

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Debes iniciar sesión.");
    }

    if (response.status === 403) {
      throw new Error(
        "No tienes permisos de administrador."
      );
    }

    const message = await getErrorMessage(
      response,
      "No se pudieron obtener las estadísticas de pedidos."
    );

    throw new Error(message);
  }

  return response.json();
}

// ==========================================
// ADMIN - DETALLE
// ==========================================

export async function getAdminOrderById(
  token: string,
  orderId: number
): Promise<OrderResponse> {
  const response = await fetch(
    `${API_URL}/orders/admin/${orderId}`,
    {
      method: "GET",
      headers: getAuthHeaders(token),
    }
  );

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error("Pedido no encontrado.");
    }

    if (response.status === 401) {
      throw new Error("Debes iniciar sesión.");
    }

    if (response.status === 403) {
      throw new Error(
        "No tienes permisos de administrador."
      );
    }

    const message = await getErrorMessage(
      response,
      "No se pudo obtener el pedido."
    );

    throw new Error(message);
  }

  return response.json();
}

// ==========================================
// ADMIN - CAMBIAR ESTADO
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
      headers: getAuthHeaders(token),
      body: JSON.stringify({
        status: newStatus,
      }),
    }
  );

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Debes iniciar sesión.");
    }

    if (response.status === 403) {
      throw new Error(
        "No tienes permisos de administrador."
      );
    }

    if (response.status === 404) {
      throw new Error("Pedido no encontrado.");
    }

    const message = await getErrorMessage(
      response,
      "No se pudo actualizar el pedido."
    );

    throw new Error(message);
  }

  return response.json();
}

// ==========================================
// ADMIN - REEMBOLSAR PAGO
// ==========================================

export async function refundAdminOrder(
  token: string,
  orderId: number
): Promise<RefundResponse> {
  const response = await fetch(
    `${API_URL}/payments/admin/orders/${orderId}/refund`,
    {
      method: "POST",
      headers: getAuthHeaders(token),
    }
  );

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Debes iniciar sesión.");
    }

    if (response.status === 403) {
      throw new Error(
        "No tienes permisos de administrador."
      );
    }

    if (response.status === 404) {
      throw new Error("Pedido no encontrado.");
    }

    const message = await getErrorMessage(
      response,
      "No se pudo reembolsar el pago."
    );

    throw new Error(message);
  }

  return response.json();
}
