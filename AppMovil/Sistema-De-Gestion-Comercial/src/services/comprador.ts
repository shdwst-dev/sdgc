import { API_BASE_URL, ApiError, MeResponse } from './auth';

type ApiErrorResponse = {
  message?: string;
  errors?: Record<string, string[]>;
};

export type ProductoDestacado = {
  id: number;
  nombre: string;
  imagen_url: string | null;
  precio_unitario: number;
  categoria: string;
  stock_actual: number;
};

export type DashboardCompradorData = {
  usuario: MeResponse;
  productosDestacados: ProductoDestacado[];
  totalCompras: number;
  comprasHoy: number;
};

function getErrorMessage(status: number, body: ApiErrorResponse | null, defaultMessage: string): string {
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

  return defaultMessage;
}

export async function getProductosDestacados(token: string): Promise<ProductoDestacado[]> {
  const response = await fetch(`${API_BASE_URL}/productos?limit=10`, {
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
      getErrorMessage(response.status, body as ApiErrorResponse | null, 'No se pudo cargar los productos.'),
      response.status,
    );
  }

  const rows = Array.isArray(body)
    ? body
    : Array.isArray((body as { data?: unknown[] } | null)?.data)
      ? (body as { data: unknown[] }).data
      : [];

  return rows.slice(0, 10).map((raw: any) => ({
    id: Number(raw.id_producto ?? raw.id ?? 0),
    nombre: String(raw.nombre ?? raw.name ?? 'Producto sin nombre'),
    imagen_url: raw.imagen_url ?? null,
    precio_unitario: Number(raw.precio_unitario ?? raw.precio_base ?? 0),
    categoria: String(raw.categoria ?? raw.nombre_subcategoria ?? raw.subcategoria ?? 'Sin categoría'),
    stock_actual: Number(raw.stock_actual ?? raw.stock ?? 0),
  }));
}

export async function getDashboardCompradorData(token: string, userInfo: MeResponse): Promise<DashboardCompradorData> {
  try {
    const productosDestacados = await getProductosDestacados(token);
    
    // Por ahora usamos valores por defecto para compras, ya que el endpoint podría no existir
    // En el futuro se puede añadir /compras/{usuarioId} para obtener compras reales
    const totalCompras = 12; // Valor por defecto
    const comprasHoy = 2; // Valor por defecto

    return {
      usuario: userInfo,
      productosDestacados,
      totalCompras,
      comprasHoy,
    };
  } catch (error) {
    throw error;
  }
}
