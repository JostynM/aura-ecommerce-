import type { Product } from "../types/Product";

const API_URL = import.meta.env.VITE_API_URL;


export type ApiProduct = {
  id: number;
  slug: string;
  brand: string;
  name: string;
  description: string;
  price: string | number;
  stock: number;
  size_ml: number;
  perfume_type: string;
  gender: string;
  image_url: string | null;
  top_notes: string[];
  heart_notes: string[];
  base_notes: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type ProductPayload = {
  slug: string;
  brand: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  size_ml: number;

  perfume_type:
    | "arabe"
    | "disenador";

  gender:
    | "hombre"
    | "mujer"
    | "unisex";

  image_url: string | null;

  top_notes: string[];
  heart_notes: string[];
  base_notes: string[];

  is_active: boolean;
};


function mapApiProduct(
  product: ApiProduct
): Product {
  return {
    id: product.id,

    slug: product.slug,

    brand: product.brand,

    name: product.name,

    price: Number(product.price),

    rating: 0,

    image: product.image_url ?? "",

    type:
      product.perfume_type === "arabe"
        ? "arabe"
        : "disenador",

    gender:
      product.gender === "hombre"
        ? "hombre"
        : product.gender === "mujer"
          ? "mujer"
          : "unisex",

    stock: product.stock,

    size: `${product.size_ml} ml`,

    description:
      product.description,

    topNotes:
      product.top_notes,

    heartNotes:
      product.heart_notes,

    baseNotes:
      product.base_notes,
  };
}


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


export async function getProducts():
Promise<Product[]> {
  const response = await fetch(
    `${API_URL}/products`
  );

  if (!response.ok) {
    throw new Error(
      "No se pudieron obtener los productos"
    );
  }

  const data: ApiProduct[] =
    await response.json();

  return data.map(
    mapApiProduct
  );
}


export async function getProductBySlug(
  slug: string
): Promise<Product> {
  const response = await fetch(
    `${API_URL}/products/${slug}`
  );

  if (!response.ok) {

    if (response.status === 404) {
      throw new Error(
        "Producto no encontrado"
      );
    }

    throw new Error(
      "No se pudo obtener el producto"
    );
  }

  const data: ApiProduct =
    await response.json();

  return mapApiProduct(data);
}


export async function createProduct(
  token: string,
  data: ProductPayload
): Promise<Product> {
  const response = await fetch(
    `${API_URL}/products`,
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
        "No se pudo crear el producto"
    );
  }

  const product: ApiProduct =
    await response.json();

  return mapApiProduct(product);
}


export async function updateProduct(
  token: string,
  productId: number,
  data: ProductPayload
): Promise<Product> {
  const response = await fetch(
    `${API_URL}/products/${productId}`,
    {
      method: "PUT",

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
        "No se pudo actualizar el producto"
    );
  }

  const product: ApiProduct =
    await response.json();

  return mapApiProduct(product);
}


export async function deleteProduct(
  token: string,
  productId: number
): Promise<void> {
  const response = await fetch(
    `${API_URL}/products/${productId}`,
    {
      method: "DELETE",

      headers:
        getAuthHeaders(token),
    }
  );

  if (!response.ok) {
    const errorData =
      await response.json();

    throw new Error(
      errorData.detail ||
        "No se pudo desactivar el producto"
    );
  }
}

export async function getAdminProductById(
  token: string,
  productId: number
): Promise<ApiProduct> {
  const response = await fetch(
    `${API_URL}/products/admin/${productId}`,
    {
      method: "GET",
      headers: getAuthHeaders(token),
    }
  );

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(
        "Producto no encontrado"
      );
    }

    throw new Error(
      "No se pudo obtener el producto"
    );
  }

  return response.json();
}
export async function getAdminProducts(
  token: string
): Promise<ApiProduct[]> {
  const response = await fetch(
    `${API_URL}/products/admin/all`,
    {
      method: "GET",
      headers: getAuthHeaders(token),
    }
  );

  if (!response.ok) {
    throw new Error(
      "No se pudieron cargar los productos"
    );
  }

  return response.json();
}


export async function changeProductStatus(
  token: string,
  productId: number,
  isActive: boolean
): Promise<ApiProduct> {
  const response = await fetch(
    `${API_URL}/products/${productId}/status`,
    {
      method: "PATCH",
      headers: getAuthHeaders(token),

      body: JSON.stringify({
        is_active: isActive,
      }),
    }
  );

  if (!response.ok) {
    const errorData =
      await response.json();

    throw new Error(
      errorData.detail ||
        "No se pudo cambiar el estado del producto"
    );
  }

  return response.json();
}