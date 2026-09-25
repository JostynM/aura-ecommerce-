const API_URL = import.meta.env.VITE_API_URL;


export type AddressData = {
  label: string;
  recipient_name: string;
  phone: string;
  department: string;
  province: string;
  district: string;
  address_line: string;
  reference: string | null;
  is_default: boolean;
};


export type AddressResponse = AddressData & {
  id: number;
  user_id: number;
  created_at: string;
  updated_at: string;
};


function getAuthHeaders(token: string) {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}


export async function getAddresses(
  token: string
): Promise<AddressResponse[]> {
  const response = await fetch(
    `${API_URL}/addresses`,
    {
      method: "GET",
      headers: getAuthHeaders(token),
    }
  );

  if (!response.ok) {
    throw new Error(
      "No se pudieron obtener las direcciones"
    );
  }

  return response.json();
}


export async function createAddress(
  token: string,
  data: AddressData
): Promise<AddressResponse> {
  const response = await fetch(
    `${API_URL}/addresses`,
    {
      method: "POST",
      headers: getAuthHeaders(token),
      body: JSON.stringify(data),
    }
  );

  if (!response.ok) {
    const errorData = await response.json();

    throw new Error(
      errorData.detail ||
        "No se pudo guardar la dirección"
    );
  }

  return response.json();
}


export async function updateAddress(
  token: string,
  addressId: number,
  data: AddressData
): Promise<AddressResponse> {
  const response = await fetch(
    `${API_URL}/addresses/${addressId}`,
    {
      method: "PUT",
      headers: getAuthHeaders(token),
      body: JSON.stringify(data),
    }
  );

  if (!response.ok) {
    const errorData = await response.json();

    throw new Error(
      errorData.detail ||
        "No se pudo actualizar la dirección"
    );
  }

  return response.json();
}


export async function deleteAddress(
  token: string,
  addressId: number
): Promise<void> {
  const response = await fetch(
    `${API_URL}/addresses/${addressId}`,
    {
      method: "DELETE",
      headers: getAuthHeaders(token),
    }
  );

  if (!response.ok) {
    const errorData = await response.json();

    throw new Error(
      errorData.detail ||
        "No se pudo eliminar la dirección"
    );
  }
}