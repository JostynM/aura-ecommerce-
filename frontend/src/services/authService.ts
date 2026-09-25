const API_URL = import.meta.env.VITE_API_URL;


// ==========================================
// TIPOS
// ==========================================

export type RegisterData = {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
};


export type LoginData = {
  email: string;
  password: string;
};


export type UserResponse = {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  email_verified: boolean;
  is_active: boolean;
  role: string;
  created_at: string;
};


export type TokenResponse = {
  access_token: string;
  token_type: string;
};


export type MessageResponse = {
  message: string;
};


// ==========================================
// REGISTRO
// ==========================================

export async function registerUser(
  data: RegisterData
): Promise<UserResponse> {

  const response = await fetch(
    `${API_URL}/auth/register`,
    {
      method: "POST",

      headers: {
        "Content-Type":
          "application/json",
      },

      body: JSON.stringify(
        data
      ),
    }
  );


  if (!response.ok) {

    const errorData =
      await response.json();

    throw new Error(
      errorData.detail ||
        "No se pudo crear la cuenta"
    );
  }


  return response.json();
}


// ==========================================
// LOGIN
// ==========================================

export async function loginUser(
  data: LoginData
): Promise<TokenResponse> {

  const response = await fetch(
    `${API_URL}/auth/login`,
    {
      method: "POST",

      headers: {
        "Content-Type":
          "application/json",
      },

      body: JSON.stringify(
        data
      ),
    }
  );


  if (!response.ok) {

    const errorData =
      await response.json();

    throw new Error(
      errorData.detail ||
        "No se pudo iniciar sesión"
    );
  }


  return response.json();
}


// ==========================================
// USUARIO ACTUAL
// ==========================================

export async function getCurrentUser(
  token: string
): Promise<UserResponse> {

  const response = await fetch(
    `${API_URL}/auth/me`,
    {
      method: "GET",

      headers: {
        Authorization:
          `Bearer ${token}`,
      },
    }
  );


  if (!response.ok) {

    throw new Error(
      "No se pudo obtener el usuario autenticado"
    );
  }


  return response.json();
}


// ==========================================
// VERIFICAR CORREO
// ==========================================

export async function verifyEmail(
  token: string
): Promise<MessageResponse> {

  const response = await fetch(
    `${API_URL}/auth/verify-email`,
    {
      method: "POST",

      headers: {
        "Content-Type":
          "application/json",
      },

      body: JSON.stringify({
        token,
      }),
    }
  );


  const responseData =
    await response.json();


  if (!response.ok) {

    throw new Error(
      responseData.detail ||
        "No se pudo verificar el correo electrónico"
    );
  }


  return responseData;
}


// ==========================================
// REENVIAR VERIFICACIÓN
// ==========================================

export async function resendVerificationEmail(
  email: string
): Promise<MessageResponse> {

  const response = await fetch(
    `${API_URL}/auth/resend-verification`,
    {
      method: "POST",

      headers: {
        "Content-Type":
          "application/json",
      },

      body: JSON.stringify({
        email,
      }),
    }
  );


  const responseData =
    await response.json();


  if (!response.ok) {

    throw new Error(
      responseData.detail ||
        "No se pudo reenviar el correo de verificación"
    );
  }


  return responseData;
}


// ==========================================
// SOLICITAR RECUPERACIÓN DE CONTRASEÑA
// ==========================================

export async function forgotPassword(
  email: string
): Promise<MessageResponse> {

  const response = await fetch(
    `${API_URL}/auth/forgot-password`,
    {
      method: "POST",

      headers: {
        "Content-Type":
          "application/json",
      },

      body: JSON.stringify({
        email,
      }),
    }
  );


  const responseData =
    await response.json();


  if (!response.ok) {

    throw new Error(
      responseData.detail ||
        "No se pudo solicitar la recuperación de contraseña"
    );
  }


  return responseData;
}


// ==========================================
// RESTABLECER CONTRASEÑA
// ==========================================

export async function resetPassword(
  token: string,
  newPassword: string
): Promise<MessageResponse> {

  const response = await fetch(
    `${API_URL}/auth/reset-password`,
    {
      method: "POST",

      headers: {
        "Content-Type":
          "application/json",
      },

      body: JSON.stringify({
        token,
        new_password:
          newPassword,
      }),
    }
  );


  const responseData =
    await response.json();


  if (!response.ok) {

    throw new Error(
      responseData.detail ||
        "No se pudo restablecer la contraseña"
    );
  }


  return responseData;
}