/**
 * comprador.ts — Servicios para flujo de comprador.
 *
 * Usa apiClient centralizado. Corrige checkout para usar
 * POST /api/v1/ventas/registrar (no /compras).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiRequest, ApiError, getApiRootUrl } from './apiClient';
import type { MeResponse } from './auth';

export { ApiError };

export type ProductoDestacado = {
  id: number;
  nombre: string;
  imagen_url: string | null;
  precio_unitario: number;
  categoria: string;
  stock_actual: number;
};

export type VentaDetalle = {
  id_venta: number;
  fecha: string | null;
  estatus: string;
  metodo_pago: string;
  total: number;
  productos: {
    id_producto: number;
    nombre: string;
    imagen_url: string | null;
    cantidad: number;
    precio_unitario: number;
    subtotal: number;
  }[];
};

export type Producto = ProductoDestacado;

export type CartItem = {
  id: number;
  nombre: string;
  precio_unitario: number;
  cantidad: number;
  imagen_url: string | null;
  stock_maximo?: number;
};

export type MetodoPago = {
  id: number;
  id_metodo_pago?: number;
  nombre: string;
};

export type Direccion = {
  id: number;
  calle: string;
  numero_exterior: string;
  numero_interior?: string;
  colonia: string;
  ciudad: string;
  estado: string;
  codigoPostal: string;
  esPrincipal?: boolean;
};

export type DashboardCompradorData = {
  usuario: MeResponse;
  productosDestacados: ProductoDestacado[];
  totalCompras: number;
  comprasHoy: number;
};

export type PedidoResumen = {
  id: number;
  fecha: string | null;
  total: number;
  estado: string;
  metodo_pago: string;
};

function toText(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function ensureAbsoluteUrl(url: string | null): string | null {
  if (!url || url.startsWith('http')) {
    return url;
  }
  const cleanPath = url.startsWith('/') ? url.slice(1) : url;
  const apiRoot = getApiRootUrl();
  const serverBase = apiRoot.split('/api')[0];
  return `${serverBase}/${cleanPath}`;
}
function mapProducto(raw: Record<string, unknown>): Producto {
  return {
    id: Number(raw.id_producto ?? raw.id ?? 0),
    nombre: toText(raw.nombre) ?? toText(raw.producto) ?? toText(raw.name) ?? 'Producto sin nombre',
    imagen_url: ensureAbsoluteUrl(toText(raw.imagen_url as string | null)),
    precio_unitario: Number(raw.precio_unitario ?? raw.precio_base ?? 0),
    categoria: String(raw.categoria ?? raw.nombre_subcategoria ?? raw.subcategoria ?? 'Sin categoría'),
    stock_actual: Number(raw.stock_actual ?? raw.stock ?? 0),
  };
}

function extractDataArray(body: unknown): unknown[] {
  if (Array.isArray(body)) return body;
  const asObj = body as { data?: unknown[] } | null;
  if (Array.isArray(asObj?.data)) return asObj.data;
  return [];
}

function getStockLimit(producto: { stock_actual?: number }): number {
  const stock = Number(producto.stock_actual ?? 0);
  return Number.isFinite(stock) && stock > 0 ? stock : 0;
}

function resolvePedidoFecha(raw: Record<string, unknown>): string | null {
  const candidates = [raw.fecha_venta, raw.created_at, raw.fecha, raw.updated_at];

  for (const candidate of candidates) {
    if (typeof candidate !== 'string' && typeof candidate !== 'number') continue;

    const date = new Date(candidate);
    if (!Number.isNaN(date.getTime())) {
      return date.toISOString();
    }
  }

  return null;
}

function resolvePedidoEstado(raw: Record<string, unknown>): string {
  const estado = toText(raw.estatus) ?? toText(raw.estado);
  if (estado) return estado;

  const idEstatus = Number(raw.id_estatus ?? 0);
  if (idEstatus === 1) return 'Completado';
  if (idEstatus === 2) return 'Procesando';
  if (idEstatus === 3) return 'Cancelado';

  return 'Pendiente';
}

function resolveMetodoPago(raw: Record<string, unknown>): string {
  const metodoPago = raw.metodo_pago as Record<string, unknown> | string | undefined;
  if (typeof metodoPago === 'string') {
    const text = metodoPago.trim();
    if (text.length > 0) return text;
  }

  if (metodoPago && typeof metodoPago === 'object') {
    const nombre = toText((metodoPago as Record<string, unknown>).nombre);
    if (nombre) return nombre;
  }

  return toText(raw.nombre_metodo_pago) ?? 'Efectivo';
}

export async function getProductosDestacados(token: string): Promise<Producto[]> {
  const body = await apiRequest<unknown>('/productos?limit=10', {
    token,
    fallbackError: 'No se pudo cargar los productos.',
  });

  return extractDataArray(body).slice(0, 10).map((raw) => mapProducto(raw as Record<string, unknown>));
}

export async function buscarProductos(token: string, query: string): Promise<Producto[]> {
  const params = new URLSearchParams();
  if (query.trim()) params.append('search', query.trim());

  const body = await apiRequest<unknown>(`/productos?${params.toString()}`, {
    token,
    fallbackError: 'No se pudo realizar la búsqueda.',
  });

  return extractDataArray(body).map((raw) => mapProducto(raw as Record<string, unknown>));
}

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
  const stockLimit = getStockLimit(producto);
  if (stockLimit <= 0) {
    throw new ApiError('Este producto no tiene stock disponible.', 400);
  }

  const cart = await getCarritoLocal();
  const existingItem = cart.find((item) => item.id === producto.id);
  const currentQty = existingItem?.cantidad ?? 0;
  const requestedQty = currentQty + cantidad;

  if (requestedQty > stockLimit) {
    throw new ApiError(`Solo hay ${stockLimit} unidades disponibles de ${producto.nombre}.`, 400);
  }

  if (existingItem) {
    existingItem.cantidad = requestedQty;
  } else {
    cart.push({
      id: producto.id,
      nombre: producto.nombre,
      precio_unitario: producto.precio_unitario,
      cantidad,
      imagen_url: producto.imagen_url,
      stock_maximo: stockLimit,
    });
  }

  await saveCarritoLocal(cart);
  return cart;
}

export async function clearCarritoLocal(): Promise<void> {
  await AsyncStorage.removeItem('@carrito');
}

export async function getMetodosPagoLocal(): Promise<MetodoPago[]> {
  return [
    { id: 1, nombre: 'Efectivo' },
    { id: 2, nombre: 'Tarjeta de Crédito' },
    { id: 3, nombre: 'Tarjeta de Débito' },
    { id: 4, nombre: 'Transferencia' },
    { id: 5, nombre: 'PayPal' },
    { id: 6, nombre: 'Mercado Pago' },
  ];
}

export async function getFavoritePaymentMethodLocal(): Promise<number | null> {
  try {
    const metodo = await AsyncStorage.getItem('@metodoPagoFavorito');
    return metodo ? parseInt(metodo, 10) : null;
  } catch (error) {
    console.error('Error loading favorite payment method:', error);
    return null;
  }
}

export async function setFavoritePaymentMethodLocal(methodId: number): Promise<void> {
  try {
    await AsyncStorage.setItem('@metodoPagoFavorito', methodId.toString());
  } catch (error) {
    console.error('Error saving favorite payment method:', error);
    throw error;
  }
}

export async function getDireccionesLocal(): Promise<Direccion[]> {
  try {
    const direccionesData = await AsyncStorage.getItem('@direcciones');
    return direccionesData ? JSON.parse(direccionesData) : [];
  } catch (error) {
    console.error('Error loading direcciones:', error);
    return [];
  }
}

/**
 * SERVICIOS NUBE (Cloud Sync)
 */

export async function getDireccionesCloud(token: string): Promise<Direccion[]> {
  try {
    const body = await apiRequest<Direccion[]>('/auth/direcciones', {
      token,
      fallbackError: 'No se pudieron sincronizar las direcciones.',
    });
    const addresses = Array.isArray(body) ? body : [];
    // Guardar una copia local para modo offline
    await AsyncStorage.setItem('@direcciones', JSON.stringify(addresses));
    return addresses;
  } catch (error) {
    console.warn('Usando caché local de direcciones');
    return getDireccionesLocal();
  }
}

export async function saveDireccionCloud(token: string, direccion: Direccion): Promise<Direccion[]> {
  // 1. Enviar a la nube
  await apiRequest<any>('/auth/direcciones', {
    method: 'POST',
    token,
    body: {
      ...direccion,
      // Mapear campos si es necesario (el controlador soporta los nombres de la interfaz)
    },
    fallbackError: 'Error al guardar dirección en la nube.',
  });

  // 2. Refrescar lista completa desde la nube
  return getDireccionesCloud(token);
}

export async function deleteDireccionCloud(token: string, id: number): Promise<Direccion[]> {
  await apiRequest<any>(`/auth/direcciones/${id}`, {
    method: 'DELETE',
    token,
    fallbackError: 'Error al eliminar dirección en la nube.',
  });

  return getDireccionesCloud(token);
}

/**
 * Migración Automática: Sube direcciones locales no existentes en la nube.
 */
export async function synchronizeDirecciones(token: string): Promise<void> {
  const local = await getDireccionesLocal();
  if (local.length === 0) return;

  const cloud = await getDireccionesCloud(token);
  
  // Si la nube está vacía pero hay locales, las subimos todas
  if (cloud.length === 0) {
    for (const dir of local) {
      try {
        await apiRequest('/auth/direcciones', {
          method: 'POST',
          token,
          body: dir
        });
      } catch (e) { /* ignore */ }
    }
    // Una vez sincronizado, podemos limpiar el storage local si queremos, 
    // pero getDireccionesCloud ya lo sobrescribe con la versión oficial.
  }
}

// Mantener compatibilidad con nombres antiguos pero apuntando a la lógica híbrida
export async function saveDireccionLocal(direccion: Direccion): Promise<Direccion[]> {
  // Este se usará solo cuando no hay token (proceso de registro?), 
  // pero usualmente las direcciones se guardan ya logueado.
  const direcciones = await getDireccionesLocal();

  if (direccion.id === 0) {
    direccion.id = Date.now();
    if (direcciones.length === 0) direccion.esPrincipal = true;
    direcciones.push(direccion);
  } else {
    const index = direcciones.findIndex((d) => d.id === direccion.id);
    if (index >= 0) direcciones[index] = direccion;
  }

  await AsyncStorage.setItem('@direcciones', JSON.stringify(direcciones));
  return direcciones;
}

export async function deleteDireccionLocal(id: number): Promise<Direccion[]> {
  let direcciones = await getDireccionesLocal();
  const deleted = direcciones.find((d) => d.id === id);

  direcciones = direcciones.filter((d) => d.id !== id);
  if (deleted?.esPrincipal && direcciones.length > 0) direcciones[0].esPrincipal = true;

  await AsyncStorage.setItem('@direcciones', JSON.stringify(direcciones));
  return direcciones;
}

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

  await clearCarritoLocal();
  return result;
}

export async function getMisPedidos(token: string): Promise<PedidoResumen[]> {
  const body = await apiRequest<any>('/ventas', {
    token,
    fallbackError: 'No se pudo cargar el historial de pedidos.',
  });

  const ventas = Array.isArray(body?.data) ? body.data : 
                 (Array.isArray(body) ? body : []);
                 
  return ventas.map((v: any) => ({
    id: v.id_venta ?? v.id ?? 0,
    fecha: resolvePedidoFecha(v as Record<string, unknown>),
    total: Number(v.total_venta || v.total || 0),
    estado: resolvePedidoEstado(v as Record<string, unknown>),
    metodo_pago: resolveMetodoPago(v as Record<string, unknown>),
  }));
}

export async function getDetallePedido(token: string, idVenta: number): Promise<VentaDetalle> {
  const result = await apiRequest<{ data: VentaDetalle }>(`/ventas/${idVenta}`, {
    token,
    fallbackError: 'No se pudo cargar el detalle del pedido.',
  });

  const data = result.data;
  // Normalizar URLs de imágenes en los productos del detalle
  if (data.productos) {
    data.productos = data.productos.map(p => ({
      ...p,
      imagen_url: ensureAbsoluteUrl(p.imagen_url)
    }));
  }

  return data;
}


