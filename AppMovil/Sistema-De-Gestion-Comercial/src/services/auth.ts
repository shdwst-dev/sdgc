const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://10.0.2.2:8000/api/v1';

export type UsuarioAutenticado = {
  id_usuario: number;
  email: string;
  rol: string | null;
};

export type LoginResponse = {
  token: string;
  usuario: UsuarioAutenticado;
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
