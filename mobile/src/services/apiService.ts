import AsyncStorage from '@react-native-async-storage/async-storage';

// API Service for Sidekick Mobile
// Comunicação com o backend

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";

interface LoginPayload {
  email: string;
  password: string;
}

interface RegisterPayload {
  email: string;
  password: string;
  name: string;
}

interface AuthResponse {
  success: boolean;
  token?: string;
  user?: {
    id: string;
    email: string;
    name: string;
  };
  error?: string;
}

/**
 * Faz login
 */
export async function apiLogin(credentials: LoginPayload): Promise<AuthResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(credentials),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || "Erro ao fazer login",
      };
    }

    return data;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro de conexão",
    };
  }
}

/**
 * Registra novo usuário
 */
export async function apiRegister(payload: RegisterPayload): Promise<AuthResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || "Erro ao registrar",
      };
    }

    return data;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro de conexão",
    };
  }
}

/**
 * Valida o token
 */
async function buildHeaders(additionalHeaders: Record<string, string> = {}) {
  const token = await AsyncStorage.getItem('authToken');
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...additionalHeaders,
  };
}

async function safeFetch(url: string, options: RequestInit = {}) {
  const response = await fetch(`${API_BASE_URL}${url}`, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || response.statusText || 'Request failed');
  }
  return data;
}

export async function apiGet(path: string) {
  const headers = await buildHeaders();
  return safeFetch(path, {
    method: 'GET',
    headers,
  });
}

export async function apiPost(path: string, body: any = {}) {
  const headers = await buildHeaders();
  return safeFetch(path, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

export async function apiUpload(path: string, formData: FormData) {
  const headers = await buildHeaders();
  // Remove content-type so fetch can set boundary automatically
  const { 'Content-Type': _ct, ...uploadHeaders } = headers;
  return safeFetch(path, {
    method: 'POST',
    headers: uploadHeaders,
    body: formData,
  });
}

export async function apiPut(path: string, body: any = {}) {
  const headers = await buildHeaders();
  return safeFetch(path, {
    method: 'PUT',
    headers,
    body: JSON.stringify(body),
  });
}

export async function apiDelete(path: string) {
  const headers = await buildHeaders();
  return safeFetch(path, {
    method: 'DELETE',
    headers,
  });
}

export const apiService = {
  get: apiGet,
  post: apiPost,
  put: apiPut,
  delete: apiDelete,
};

export async function apiVerifyToken(token: string): Promise<{ valid: boolean }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    return { valid: response.ok };
  } catch (error) {
    return { valid: false };
  }
}
