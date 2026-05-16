import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// API Service for Sidekick Mobile
// Comunicação com o backend

const rawApiBase =
  ((Constants.expoConfig?.extra as any)?.API_URL as string) ||
  ((Constants.manifest?.extra as any)?.API_URL as string) ||
  process.env.EXPO_PUBLIC_API_URL ||
  'http://192.168.15.11:3000';

let API_BASE_URL = rawApiBase;
// Ensure protocol is present for React Native fetch to work
if (!/^https?:\/\//i.test(API_BASE_URL)) {
  API_BASE_URL = `http://${API_BASE_URL}`;
}
// Remove trailing slash if present
API_BASE_URL = API_BASE_URL.replace(/\/$/, '');

console.log('[apiService] API_BASE_URL =', API_BASE_URL);

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

function normalizeApiPath(url: string) {
  if (url.startsWith('/api')) {
    return url;
  }
  if (url.startsWith('/')) {
    return `/api${url}`;
  }
  return `/api/${url}`;
}

async function safeFetch(url: string, options: RequestInit = {}) {
  const normalizedPath = normalizeApiPath(url);
  const fullUrl = `${API_BASE_URL}${normalizedPath}`;
  console.log('[apiService] fetch', fullUrl, options.method, options.headers ? 'headers set' : 'no headers');
  try {
    const response = await fetch(fullUrl, options);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error('[apiService] response error', fullUrl, response.status, data);
      throw new Error(data.error || response.statusText || 'Request failed');
    }
    return data;
  } catch (error) {
    console.error('[apiService] network error', fullUrl, error);
    throw error;
  }
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
