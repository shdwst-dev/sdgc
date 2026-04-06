/**
 * apiClient.ts — Cliente HTTP centralizado para la app móvil SDGC.
 *
 * Provee:
 *  - Resolución automática de base URL por plataforma (web, android, iOS, físico).
 *  - Timeout configurable (default 15 s).
 *  - Retry automático en errores de red o 5xx (1 reintento).
 *  - Inyección automática de Bearer token.
 *  - Clase ApiError unificada.
 *  - Mensajes de error amigables en español.
 */

import { Platform } from 'react-native';

// ─── URL resolution ──────────────────────────────────────────────────────────

function resolveApiBaseUrl(): string {
  // Para iOS Simulator y Web, localhost funciona. Para Android, 10.0.2.2 es requerido.
  const isAndroid = Platform.OS === 'android';
  const fallback = isAndroid
    ? 'http://10.0.2.2:8000/api/v1'
    : 'http://localhost:8000/api/v1';

  const configuredUrl = process.env.EXPO_PUBLIC_API_URL?.trim();

  if (!configuredUrl) {
    return fallback;
  }

  try {
    const parsed = new URL(configuredUrl);
    const localhostHosts = new Set(['localhost', '127.0.0.1']);

    if (Platform.OS === 'android' && localhostHosts.has(parsed.hostname)) {
      parsed.hostname = '10.0.2.2';
      return parsed.toString().replace(/\/$/, '');
    }

    if (Platform.OS === 'web' && parsed.hostname === '10.0.2.2') {
      parsed.hostname = 'localhost';
      return parsed.toString().replace(/\/$/, '');
    }

    return configuredUrl.replace(/\/$/, '');
  } catch {
    return fallback;
  }
}

/** Base URL resuelta (v1). Ej: http://localhost:8000/api/v1 */
export const API_BASE_URL = resolveApiBaseUrl();

/**
 * Devuelve la base URL sin el prefijo /v1.
 * Útil para endpoints como /api/dashboard que no usan /v1.
 */
export function getApiRootUrl(): string {
  return API_BASE_URL.replace(/\/v1$/, '');
}

// ─── ApiError ────────────────────────────────────────────────────────────────

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

// ─── Error helpers ───────────────────────────────────────────────────────────

type ApiErrorBody = {
  message?: string;
  error?: string;
  errors?: Record<string, string[]>;
};

function extractErrorMessage(
  status: number,
  body: ApiErrorBody | null,
  fallback: string,
): string {
  const firstValidation = body?.errors
    ? Object.values(body.errors).flat()[0]
    : undefined;

  if (firstValidation) return firstValidation;
  if (body?.error) return body.error;
  if (body?.message) return body.message;
  if (status >= 500) return 'Error interno del servidor. Intenta de nuevo más tarde.';
  if (status === 401) return 'Tu sesión expiró. Inicia sesión nuevamente.';
  if (status === 403) return 'No tienes permiso para esta acción.';
  if (status === 404) return 'El recurso solicitado no existe.';
  if (status === 422) return fallback;

  return fallback;
}

// ─── Timeout helper ──────────────────────────────────────────────────────────

const DEFAULT_TIMEOUT_MS = 15_000;

function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  return new Promise<Response>((resolve, reject) => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      controller.abort();
      reject(new ApiError('La solicitud tardó demasiado. Revisa tu conexión a internet.', 0));
    }, timeoutMs);

    fetch(url, { ...options, signal: controller.signal })
      .then((response) => {
        clearTimeout(timer);
        resolve(response);
      })
      .catch((error) => {
        clearTimeout(timer);
        if (error?.name === 'AbortError') {
          reject(
            new ApiError('La solicitud tardó demasiado. Revisa tu conexión a internet.', 0),
          );
          return;
        }
        reject(error);
      });
  });
}

// ─── Core request ────────────────────────────────────────────────────────────

export type RequestOptions = {
  /** HTTP method */
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  /** JSON body (se serializa automáticamente) */
  body?: unknown;
  /** Bearer token. Si se omite no envía Authorization. */
  token?: string | null;
  /** URL base. Default = API_BASE_URL (con /v1). */
  baseUrl?: string;
  /** Timeout en ms. Default = 15000 */
  timeoutMs?: number;
  /** Cantidad de reintentos en error de red o 5xx. Default = 1 */
  retries?: number;
  /** Mensaje de error fallback si no se puede extraer uno del body */
  fallbackError?: string;
};

/**
 * Hace una petición HTTP y devuelve el body parseado.
 *
 * @param path  Ruta relativa (ej: "/auth/login", "/productos").
 * @param opts  Opciones de request.
 * @returns     El body JSON parseado.
 * @throws      ApiError con status y mensaje amigable.
 */
export async function apiRequest<T = unknown>(
  path: string,
  opts: RequestOptions = {},
): Promise<T> {
  const {
    method = 'GET',
    body,
    token,
    baseUrl = API_BASE_URL,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    retries = 1,
    fallbackError = 'Ocurrió un error inesperado. Intenta de nuevo.',
  } = opts;

  const url = `${baseUrl}${path}`;

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const fetchOptions: RequestInit = {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  };

  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetchWithTimeout(url, fetchOptions, timeoutMs);

      let responseBody: T | ApiErrorBody | null = null;

      try {
        responseBody = (await response.json()) as T;
      } catch {
        responseBody = null;
      }

      if (!response.ok) {
        throw new ApiError(
          extractErrorMessage(response.status, responseBody as ApiErrorBody | null, fallbackError),
          response.status,
        );
      }

      return responseBody as T;
    } catch (error) {
      lastError = error;

      // No reintentar errores del cliente (4xx) ni ApiErrors explícitos con status 4xx
      if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
        throw error;
      }

      // Si aún quedan reintentos, esperar un poco y reintentar
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
        continue;
      }
    }
  }

  // Si salimos del loop sin retornar, lanzar el último error
  if (lastError instanceof ApiError) {
    throw lastError;
  }

  throw new ApiError(
    'No se pudo conectar al servidor. Revisa tu conexión a internet y que el backend esté activo.',
    0,
  );
}
