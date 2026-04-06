/**
 * comprador.ts — Servicios para flujo de comprador.
 *
 * Usa apiClient centralizado. Corrige checkout para usar
 * POST /api/v1/ventas/registrar (no /compras).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiRequest, ApiError } from './apiClient';
import type { MeResponse } from './auth';

export { ApiError };

// ─── Types ───────────────────────────────────────────────────────────────────

export type ProductoDestacado = {
  id: number;
  nombre: string;
  imagen_url: string | null;
  precio_unitario: number;
  categoria: string;
  stock_actual: number;
};

export type Producto = ProductoDestacado;

export type CartItem = {
  id: number;
  nombre: string;
  precio_unitario: number;
  cantidad: number;
  imagen_url: string | null;
};

export type MetodoPago = {
  id_metodo_pago: number;
  nombre: string;
};

export type DashboardCompradorData = {
  usuario: MeResponse;
  productosDestacados: ProductoDestacado[];
  totalCompras: number;
  comprasHoy: number;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function mapProducto(raw: Record<string, unknown>): Producto {
  return {
    id: Number(raw.id_producto ?? raw.id ?? 0),
    nombre: String(raw.nombre ?? raw.name ?? 'Producto sin nombre'),
    imagen_url: raw.imagen_url ? String(raw.imagen_url) : null,
    precio_unitario: Number(raw.precio_unitario ?? raw.precio_base ?? 0),
    categoria: String(raw.categoria ?? raw.nombre_subcategoria ?? raw.subcategoria ?? 'Sin categoría'),
    stock_actual: Number(raw.stock_actual ?? raw.stock ?? 0),
  };
}

function extractDataArray(body: unknown): unknown[] {
  if (Array.isArray(body)) return body;

  const asObj = body as { data?: unknown[] } | null;
  if (Array.isArray(asObj?.data)) return asObj!.data;

  return [];
}

// ─── Productos ───────────────────────────────────────────────────────────────

export async function getProductosDestacados(token: string): Promise<Producto[]> {
  const body = await apiRequest<unknown>('/productos?limit=10', {
    token,
    fallbackError: 'No se pudo cargar los productos.',
  });

  return extractDataArray(body).slice(0, 10).map((raw) => mapProducto(raw as Record<string, unknown>));
}

export async function buscarProductos(token: string, query: string): Promise<Producto[]> {
  const params = new URLSearchParams();
  if (query.trim()) {
    params.append('search', query.trim());
  }

  const body = await apiRequest<unknown>(`/productos?${params.toString()}`, {
    token,
    fallbackError: 'No se pudo realizar la búsqueda.',
  });

  return extractDataArray(body).map((raw) => mapProducto(raw as Record<string, unknown>));
}

// ─── Dashboard Comprador ─────────────────────────────────────────────────────

export async function getDashboardCompradorData(
  token: string,
  userInfo: MeResponse,
): Promise<DashboardCompradorData> {
  const productosDestacados = await getProductosDestacados(token);

  return {
    usuario: userInfo,
    productosDestacados,
    totalCompras: 0,
    comprasHoy: 0,
  };
}

// ─── Carrito local (AsyncStorage) ────────────────────────────────────────────

export async function getCarritoLocal(): Promise<CartItem[]> {
  try {
    const carritoData = await AsyncStorage.getItem('@carrito');
    return carritoData ? JSON.parse(carritoData) : [];
  } catch (error) {
    console.error('Error loading cart:', error);
    return [];
  }
}

export async function saveCarritoLocal(cart: CartItem[]): Promise<void> {
  try {
    await AsyncStorage.setItem('@carrito', JSON.stringify(cart));
  } catch (error) {
    console.error('Error saving cart:', error);
  }
}

export async function addToCarritoLocal(producto: Producto, cantidad: number = 1): Promise<CartItem[]> {
  const cart = await getCarritoLocal();
  const existingItem = cart.find((item) => item.id === producto.id);

  if (existingItem) {
    existingItem.cantidad += cantidad;
  } else {
    cart.push({
      id: producto.id,
      nombre: producto.nombre,
      precio_unitario: producto.precio_unitario,
      cantidad,
      imagen_url: producto.imagen_url,
    });
  }

  await saveCarritoLocal(cart);
  return cart;
}

export async function clearCarritoLocal(): Promise<void> {
  await AsyncStorage.removeItem('@carrito');
}

// ─── Métodos de pago ─────────────────────────────────────────────────────────

export async function getMetodosPago(token: string): Promise<MetodoPago[]> {
  try {
    // /api/ventas (sin v1) devuelve { catalogos: { metodos_pago: [...] }, ... }
    const { getApiRootUrl } = await import('./apiClient');

    const body = await apiRequest<Record<string, unknown>>('/ventas', {
      token,
      baseUrl: getApiRootUrl(),
      fallbackError: 'No se pudieron cargar los métodos de pago.',
    });

    // metodos_pago está dentro de catalogos
    const catalogos = (body?.catalogos ?? {}) as Record<string, unknown>;
    const items = Array.isArray(catalogos?.metodos_pago) ? catalogos.metodos_pago : [];

    return items.map((raw: Record<string, unknown>) => ({
      id_metodo_pago: Number(raw.id_metodo_pago ?? raw.id ?? 0),
      nombre: String(raw.nombre ?? ''),
    }));
  } catch {
    // Fallback: devolver métodos de pago por defecto
    return [
      { id_metodo_pago: 1, nombre: 'Efectivo' },
      { id_metodo_pago: 2, nombre: 'Tarjeta de Crédito' },
      { id_metodo_pago: 3, nombre: 'Tarjeta de Débito' },
      { id_metodo_pago: 4, nombre: 'Transferencia' },
    ];
  }
}

// ─── Checkout (CORREGIDO: ahora usa POST /api/v1/ventas/registrar) ───────────

export async function checkout(
  token: string,
  cartItems: CartItem[],
  idMetodoPago: number = 1,
): Promise<{ message: string }> {
  if (!cartItems || cartItems.length === 0) {
    throw new ApiError('El carrito está vacío.', 400);
  }

  const payload = {
    id_metodo_pago: idMetodoPago,
    detalles: cartItems.map((item) => ({
      producto_id: item.id,
      cantidad: item.cantidad,
    })),
  };

  const result = await apiRequest<{ message: string }>('/ventas/registrar', {
    method: 'POST',
    token,
    body: payload,
    fallbackError: 'No se pudo procesar la compra.',
  });

  // Limpiar carrito local después de checkout exitoso
  await clearCarritoLocal();

  return result;
}
