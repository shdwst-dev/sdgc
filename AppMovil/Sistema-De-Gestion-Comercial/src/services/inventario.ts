/**
 * inventario.ts — Servicios de inventario (productos CRUD).
 *
 * Usa apiClient centralizado para requests con timeout, retry y token.
 */

import { apiRequest, getApiRootUrl, ApiError } from './apiClient';

// Re-export para compatibilidad con imports en pantallas
export { ApiError };

// ─── Types ───────────────────────────────────────────────────────────────────

export type InventarioProducto = {
  id: number;
  idSubcategoria: number | null;
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
  idTienda?: number;
  idEstatus?: number;
};

export type ActualizarProductoPayload = {
  nombre: string;
  precioBase: number;
  precioUnitario: number;
  stock: number;
  stockMinimo?: number;
  codigoBarras?: string;
  imagenUrl?: string;
  idSubcategoria?: number;
  idTienda?: number;
  idEstatus: number;
};

export type InventarioCatalogos = {
  subcategorias: Array<{ id: number; nombre: string; categoria: string }>;
  medidas: Array<{ id: number; nombre: string }>;
  unidades: Array<{ id: number; nombre: string; abreviatura: string }>;
  estatus: Array<{ id: number; nombre: string }>;
  tiendas: Array<{ id: number; nombre: string }>;
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

function toText(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();

  return normalized.length > 0 ? normalized : null;
}

function mapProducto(raw: Record<string, unknown>): InventarioProducto {
  const id = toNumber(raw.id_producto ?? raw.id ?? raw.idProducto) ?? 0;
  const idSubcategoria = toNumber(raw.id_subcategoria ?? raw.idSubcategoria);
  const stockActual = toNumber(raw.stock_actual ?? raw.stockActual ?? raw.stock) ?? 0;
  const stockMinimo = toNumber(raw.stock_minimo ?? raw.stockMinimo);
  const precioBase = toNumber(raw.precio_base ?? raw.precioBase);
  const precioUnitario = toNumber(raw.precio_unitario ?? raw.precioUnitario ?? raw.precio_base ?? raw.precio);
  const idEstatus = toNumber(raw.id_estatus ?? raw.idEstatus);

  return {
    id,
    idSubcategoria,
    sku: String(raw.codigo_barras ?? raw.sku ?? `PROD-${id}`),
    nombre: toText(raw.nombre) ?? toText(raw.producto) ?? toText(raw.name) ?? 'Producto sin nombre',
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

  const asObj = body as { data?: unknown[]; productos?: unknown[] } | null;
  if (Array.isArray(asObj?.data)) return asObj!.data as Record<string, unknown>[];
  if (Array.isArray(asObj?.productos)) return asObj!.productos as Record<string, unknown>[];

  return [];
}

// ─── API functions ───────────────────────────────────────────────────────────

export async function getInventario(token: string): Promise<InventarioProducto[]> {
  const body = await apiRequest<unknown>('/inventario?catalogo_global=1&incluir_inactivos=1', {
    token,
    baseUrl: getApiRootUrl(),
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
      id_tienda: payload.idTienda ?? null,
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
      stock_minimo: payload.stockMinimo ?? null,
      codigo_barras: payload.codigoBarras || null,
      imagen_url: payload.imagenUrl || null,
      id_subcategoria: payload.idSubcategoria ?? null,
      id_tienda: payload.idTienda ?? null,
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

export async function getInventarioCatalogos(token: string): Promise<InventarioCatalogos> {
  const body = await apiRequest<Record<string, unknown>>('/inventario?catalogo_global=1&incluir_inactivos=1', {
    token,
    baseUrl: getApiRootUrl(),
    fallbackError: 'No se pudieron cargar los catalogos de inventario.',
  });

  const catalogos = (body?.catalogos ?? {}) as Record<string, unknown>;

  return {
    subcategorias: Array.isArray(catalogos.subcategorias)
      ? catalogos.subcategorias.map((row: Record<string, unknown>) => ({
          id: Number(row.id_subcategoria ?? 0),
          nombre: String(row.nombre ?? ''),
          categoria: String(row.categoria ?? ''),
        })).filter((row) => row.id > 0)
      : [],
    medidas: Array.isArray(catalogos.medidas)
      ? catalogos.medidas.map((row: Record<string, unknown>) => ({
          id: Number(row.id_medida ?? 0),
          nombre: `Medida #${String(row.id_medida ?? '')}`,
        })).filter((row) => row.id > 0)
      : [],
    unidades: Array.isArray(catalogos.unidades)
      ? catalogos.unidades.map((row: Record<string, unknown>) => ({
          id: Number(row.id_unidad ?? 0),
          nombre: String(row.nombre ?? ''),
          abreviatura: String(row.abreviatura ?? ''),
        })).filter((row) => row.id > 0)
      : [],
    estatus: Array.isArray(catalogos.estatus)
      ? catalogos.estatus.map((row: Record<string, unknown>) => ({
          id: Number(row.id_estatus ?? 0),
          nombre: String(row.nombre ?? ''),
        })).filter((row) => row.id > 0)
      : [],
    tiendas: Array.isArray(catalogos.tiendas)
      ? catalogos.tiendas.map((row: Record<string, unknown>) => ({
          id: Number(row.id_tienda ?? 0),
          nombre: String(row.nombre ?? ''),
        })).filter((row) => row.id > 0)
      : [],
  };
}

