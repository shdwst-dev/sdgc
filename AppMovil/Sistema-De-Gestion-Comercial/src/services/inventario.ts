import { API_BASE_URL, ApiError } from './auth';

type ApiErrorResponse = {
  message?: string;
  error?: string;
  errors?: Record<string, string[]>;
};

export type InventarioProducto = {
  id: number;
  sku: string;
  nombre: string;
  categoria: string;
  stockActual: number;
  stockMinimo: number | null;
  precioUnitario: number | null;
  precioBase: number | null;
  idEstatus: number | null;
};

export type CrearProductoPayload = {
  idMedida: number;
  idUnidad: number;
  idSubcategoria: number;
  nombre: string;
  precioBase: number;
  precioUnitario: number;
  codigoBarras?: string;
  imagenUrl?: string;
  idEstatus?: number;
};

export type ActualizarProductoPayload = {
  nombre: string;
  precioBase: number;
  precioUnitario: number;
  codigoBarras?: string;
  imagenUrl?: string;
  idEstatus: number;
};

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.replace(',', '.');
    const parsed = Number(normalized);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function getErrorMessage(status: number, body: ApiErrorResponse | null, defaultMessage: string): string {
  const firstValidationError = body?.errors
    ? Object.values(body.errors).flat()[0]
    : undefined;

  if (firstValidationError) {
    return firstValidationError;
  }

  if (body?.error) {
    return body.error;
  }

  if (body?.message) {
    return body.message;
  }

  if (status >= 500) {
    return 'Error interno del servidor.';
  }

  return defaultMessage;
}

function mapProducto(raw: Record<string, unknown>): InventarioProducto {
  const id = toNumber(raw.id_producto ?? raw.id ?? raw.idProducto) ?? 0;
  const stockActual = toNumber(raw.stock_actual ?? raw.stockActual ?? raw.stock) ?? 0;
  const stockMinimo = toNumber(raw.stock_minimo ?? raw.stockMinimo);
  const precioBase = toNumber(raw.precio_base ?? raw.precioBase);
  const precioUnitario = toNumber(raw.precio_unitario ?? raw.precioUnitario ?? raw.precio_base ?? raw.precio);
  const idEstatus = toNumber(raw.id_estatus ?? raw.idEstatus);

  return {
    id,
    sku: String(raw.codigo_barras ?? raw.sku ?? `PROD-${id}`),
    nombre: String(raw.nombre ?? raw.name ?? 'Producto sin nombre'),
    categoria: String(raw.categoria ?? raw.nombre_subcategoria ?? raw.subcategoria ?? 'Sin categoria'),
    stockActual,
    stockMinimo,
    precioBase,
    precioUnitario,
    idEstatus,
  };
}

export async function getInventario(token: string): Promise<InventarioProducto[]> {
  const response = await fetch(`${API_BASE_URL}/productos`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  });

  let body: unknown;

  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok) {
    throw new ApiError(
      getErrorMessage(response.status, body as ApiErrorResponse | null, 'No se pudo cargar el inventario.'),
      response.status,
    );
  }

  const rows = Array.isArray(body)
    ? body
    : Array.isArray((body as { data?: unknown[] } | null)?.data)
      ? (body as { data: unknown[] }).data
      : [];

  return rows
    .filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === 'object')
    .map(mapProducto)
    .filter((item) => item.id > 0);
}

export async function getProductoById(token: string, idProducto: number): Promise<InventarioProducto> {
  const response = await fetch(`${API_BASE_URL}/productos/${idProducto}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  });

  let body: unknown;

  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok) {
    throw new ApiError(
      getErrorMessage(response.status, body as ApiErrorResponse | null, 'No se pudo leer el producto.'),
      response.status,
    );
  }

  const row = (body as { data?: unknown } | null)?.data;

  if (!row || typeof row !== 'object') {
    throw new ApiError('La respuesta del servidor no es valida.', 500);
  }

  return mapProducto(row as Record<string, unknown>);
}

export async function crearProducto(token: string, payload: CrearProductoPayload): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/productos`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      id_medida: payload.idMedida,
      id_unidad: payload.idUnidad,
      id_subcategoria: payload.idSubcategoria,
      nombre: payload.nombre,
      precio_base: payload.precioBase,
      precio_unitario: payload.precioUnitario,
      codigo_barras: payload.codigoBarras || null,
      imagen_url: payload.imagenUrl || null,
      id_estatus: payload.idEstatus ?? 1,
    }),
  });

  let body: ApiErrorResponse | null;

  try {
    body = (await response.json()) as ApiErrorResponse;
  } catch {
    body = null;
  }

  if (!response.ok) {
    throw new ApiError(
      getErrorMessage(response.status, body, 'No se pudo crear el producto.'),
      response.status,
    );
  }
}

export async function actualizarProducto(token: string, idProducto: number, payload: ActualizarProductoPayload): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/productos/${idProducto}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      nombre: payload.nombre,
      precio_base: payload.precioBase,
      precio_unitario: payload.precioUnitario,
      codigo_barras: payload.codigoBarras || null,
      imagen_url: payload.imagenUrl || null,
      id_estatus: payload.idEstatus,
    }),
  });

  let body: ApiErrorResponse | null;

  try {
    body = (await response.json()) as ApiErrorResponse;
  } catch {
    body = null;
  }

  if (!response.ok) {
    throw new ApiError(
      getErrorMessage(response.status, body, 'No se pudo actualizar el producto.'),
      response.status,
    );
  }
}

export async function eliminarProducto(token: string, idProducto: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/productos/${idProducto}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  });

  let body: ApiErrorResponse | null;

  try {
    body = (await response.json()) as ApiErrorResponse;
  } catch {
    body = null;
  }

  if (!response.ok) {
    throw new ApiError(
      getErrorMessage(response.status, body, 'No se pudo eliminar el producto.'),
      response.status,
    );
  }
}
