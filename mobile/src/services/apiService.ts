import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// API Service for Sidekick Mobile
// Comunicação com o backend

const rawApiBase =
  process.env.EXPO_PUBLIC_API_URL ||
  (typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:3000'
    : ((Constants.expoConfig?.extra as any)?.API_URL as string) ||
      ((Constants.manifest?.extra as any)?.API_URL as string) ||
      'https://sidekick-jtne.onrender.com');

export let API_BASE_URL = rawApiBase;
// Ensure protocol is present for React Native fetch to work
if (!/^https?:\/\//i.test(API_BASE_URL)) {
  API_BASE_URL = `http://${API_BASE_URL}`;
}
// Remove trailing slash if present
API_BASE_URL = API_BASE_URL.replace(/\/$/, '');

console.log('[apiService] API_BASE_URL =', API_BASE_URL);

const DEFAULT_TIMEOUT_MS = 28000;

async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      throw new Error(
        'O servidor demorou para responder (pode estar acordando). Tente novamente em alguns segundos.'
      );
    }
    throw new Error(
      'Não foi possível conectar ao servidor Sidekick. Verifique sua internet e tente novamente.'
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

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
  user?: any;
  error?: string;
}

/**
 * Faz login e já recebe o perfil completo em uma única requisição
 */
export async function apiLogin(credentials: LoginPayload): Promise<AuthResponse> {
  try {
    const response = await fetchWithTimeout(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'E-mail ou senha inválidos',
      };
    }

    return data;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro de conexão',
    };
  }
}

/**
 * Registra novo usuário e já retorna token + perfil inicial
 */
export async function apiRegister(payload: RegisterPayload): Promise<AuthResponse> {
  try {
    const response = await fetchWithTimeout(`${API_BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Erro ao registrar conta',
      };
    }

    return data;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro de conexão',
    };
  }
}

let activeToken: string | null = null;

export function setAuthToken(token: string | null) {
  activeToken = token;
}

/**
 * Monta headers autenticados
 */
async function buildHeaders(additionalHeaders: Record<string, string> = {}) {
  const token = activeToken || (await AsyncStorage.getItem('authToken'));
  return {
    'Content-Type': 'application/json',
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
  try {
    const response = await fetchWithTimeout(fullUrl, options);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(
        data.error || response.statusText || 'Falha na requisição'
      ) as any;
      error.status = response.status;
      error.code = data.code;
      throw error;
    }
    return data;
  } catch (error) {
    console.error('[apiService] request error', fullUrl, error);
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
    const response = await fetchWithTimeout(`${API_BASE_URL}/api/auth/me`, {
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
