/**
 * inventario.ts — Servicios de inventario (productos CRUD).
 *
 * Usa apiClient centralizado para requests con timeout, retry y token.
 */

import { apiRequest, ApiError } from './apiClient';

// Re-export para compatibilidad con imports en pantallas
export { ApiError };

// ─── Types ───────────────────────────────────────────────────────────────────

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
  stock: number;
  codigoBarras?: string;
  imagenUrl?: string;
  idEstatus: number;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

function extractDataArray(body: unknown): Record<string, unknown>[] {
  if (Array.isArray(body)) return body;

  const asObj = body as { data?: unknown[] } | null;
  if (Array.isArray(asObj?.data)) return asObj!.data as Record<string, unknown>[];

  return [];
}

// ─── API functions ───────────────────────────────────────────────────────────

export async function getInventario(token: string): Promise<InventarioProducto[]> {
  const body = await apiRequest<unknown>('/productos', {
    token,
    fallbackError: 'No se pudo cargar el inventario.',
  });

  return extractDataArray(body)
    .filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === 'object')
    .map(mapProducto)
    .filter((item) => item.id > 0);
}

export async function getProductoById(token: string, idProducto: number): Promise<InventarioProducto> {
  const body = await apiRequest<{ data?: unknown }>(`/productos/${idProducto}`, {
    token,
    fallbackError: 'No se pudo leer el producto.',
  });

  const row = body?.data;

  if (!row || typeof row !== 'object') {
    throw new ApiError('La respuesta del servidor no es válida.', 500);
  }

  return mapProducto(row as Record<string, unknown>);
}

export async function crearProducto(token: string, payload: CrearProductoPayload): Promise<void> {
  await apiRequest('/productos', {
    method: 'POST',
    token,
    body: {
      id_medida: payload.idMedida,
      id_unidad: payload.idUnidad,
      id_subcategoria: payload.idSubcategoria,
      nombre: payload.nombre,
      precio_base: payload.precioBase,
      precio_unitario: payload.precioUnitario,
      codigo_barras: payload.codigoBarras || null,
      imagen_url: payload.imagenUrl || null,
      id_estatus: payload.idEstatus ?? 1,
    },
    fallbackError: 'No se pudo crear el producto.',
  });
}

export async function actualizarProducto(
  token: string,
  idProducto: number,
  payload: ActualizarProductoPayload,
): Promise<void> {
  await apiRequest(`/productos/${idProducto}`, {
    method: 'PUT',
    token,
    body: {
      nombre: payload.nombre,
      precio_base: payload.precioBase,
      precio_unitario: payload.precioUnitario,
      stock: payload.stock,
      codigo_barras: payload.codigoBarras || null,
      imagen_url: payload.imagenUrl || null,
      id_estatus: payload.idEstatus,
    },
    fallbackError: 'No se pudo actualizar el producto.',
  });
}

export async function eliminarProducto(token: string, idProducto: number): Promise<void> {
  await apiRequest(`/productos/${idProducto}`, {
    method: 'DELETE',
    token,
    fallbackError: 'No se pudo eliminar el producto.',
  });
}
