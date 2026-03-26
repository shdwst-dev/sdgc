import { Platform } from 'react-native';

function resolveApiBaseUrl(): string {
  const fallback = Platform.OS === 'web'
    ? 'http://localhost:8000/api/v1'
    : 'http://10.0.2.2:8000/api/v1';
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

export const API_BASE_URL = resolveApiBaseUrl();

export type UsuarioAutenticado = {
  id_usuario: number;
  email: string;
  rol: string | null;
};

export type LoginResponse = {
  token: string;
  hash?: string;
  usuario: UsuarioAutenticado;
};

type EntityNombre = {
  nombre?: string;
} | null;

export type MeResponse = {
  id_usuario: number;
  email: string;
  rol?: EntityNombre | string;
  estatus?: EntityNombre | string;
  persona?: {
    nombre?: string;
    apellido_paterno?: string;
    apellido_materno?: string;
  } | null;
};

type ApiErrorResponse = {
  message?: string;
  errors?: Record<string, string[]>;
};

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

function buildApiErrorMessage(status: number, body: ApiErrorResponse | null): string {
  const firstValidationError = body?.errors
    ? Object.values(body.errors).flat()[0]
    : undefined;

  if (firstValidationError) {
    return firstValidationError;
  }

  if (body?.message) {
    return body.message;
  }

  if (status >= 500) {
    return 'Error interno del servidor.';
  }

  return 'No se pudo iniciar sesion. Intenta nuevamente.';
}

export async function login(email: string, contrasena: string): Promise<LoginResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ email, contrasena }),
  });

  let body: LoginResponse | ApiErrorResponse | null;

  try {
    body = (await response.json()) as LoginResponse | ApiErrorResponse;
  } catch {
    body = null;
  }

  if (!response.ok) {
    throw new ApiError(
      buildApiErrorMessage(response.status, body as ApiErrorResponse | null),
      response.status,
    );
  }

  const successBody = body as LoginResponse;

  if (!successBody?.token || !successBody?.usuario) {
    throw new ApiError('La respuesta del servidor no es valida.', 500);
  }

  return successBody;
}

export async function logout(token: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/auth/logout`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    console.error('Error al cerrar sesión en el servidor');
  }
}

export async function getMe(token: string): Promise<MeResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  });

  let body: MeResponse | ApiErrorResponse | null;

  try {
    body = (await response.json()) as MeResponse | ApiErrorResponse;
  } catch {
    body = null;
  }

  if (!response.ok) {
    throw new ApiError(
      buildApiErrorMessage(response.status, body as ApiErrorResponse | null),
      response.status,
    );
  }

  const successBody = body as MeResponse;

  if (!successBody?.email) {
    throw new ApiError('La respuesta del servidor no es valida.', 500);
  }

  return successBody;
}
