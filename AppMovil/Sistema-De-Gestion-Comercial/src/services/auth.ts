/**
 * auth.ts — Servicios de autenticación.
 *
 * Re-exporta API_BASE_URL y ApiError desde apiClient para mantener
 * compatibilidad con los imports existentes en pantallas.
 */

import { apiRequest, API_BASE_URL, ApiError } from './apiClient';

// Re-exports de compatibilidad (usado en inventario.ts, comprador.ts, screens)
export { API_BASE_URL, ApiError };

// ─── Types ───────────────────────────────────────────────────────────────────

export type UsuarioAutenticado = {
  id_usuario: number;
  email: string;
  rol: string | null;
  tienda?: {
    id_tienda: number;
    nombre: string;
  } | null;
};

export type LoginResponse = {
  token: string;
  hash?: string;
  requiere_cambio_contrasena?: boolean;
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
  tienda?: {
    id_tienda: number;
    nombre: string;
  } | null;
  persona?: {
    nombre?: string;
    apellido_paterno?: string;
    apellido_materno?: string;
    telefono?: string;
  } | null;
};

// ─── Login ───────────────────────────────────────────────────────────────────

export async function login(email: string, contrasena: string): Promise<LoginResponse> {
  const body = await apiRequest<LoginResponse>('/auth/login', {
    method: 'POST',
    body: { email, contrasena },
    fallbackError: 'No se pudo iniciar sesión. Intenta nuevamente.',
  });

  if (!body?.token || !body?.usuario) {
    throw new ApiError('La respuesta del servidor no es válida.', 500);
  }

  return body;
}

// ─── Logout ──────────────────────────────────────────────────────────────────

export async function logout(token: string): Promise<void> {
  try {
    await apiRequest('/auth/logout', {
      method: 'POST',
      token,
      retries: 0,
      fallbackError: 'No se pudo cerrar la sesión en el servidor.',
    });
  } catch {
    console.error('Error al cerrar sesión en el servidor');
  }
}

// ─── Me (perfil) ─────────────────────────────────────────────────────────────

export async function getMe(token: string): Promise<MeResponse> {
  const body = await apiRequest<MeResponse>('/auth/me', {
    token,
    fallbackError: 'No se pudo cargar el perfil del usuario.',
  });

  if (!body?.email) {
    throw new ApiError('La respuesta del servidor no es válida.', 500);
  }

  return body;
}
