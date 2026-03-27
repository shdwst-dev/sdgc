import AsyncStorage from '@react-native-async-storage/async-storage';
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

export type Producto = ProductoDestacado;

export type CartItem = {
  id: number;
  nombre: string;
  precio_unitario: number;
  cantidad: number;
  imagen_url: string | null;
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

function mapProducto(raw: any): Producto {
  return {
    id: Number(raw.id_producto ?? raw.id ?? 0),
    nombre: String(raw.nombre ?? raw.name ?? 'Producto sin nombre'),
    imagen_url: raw.imagen_url ?? null,
    precio_unitario: Number(raw.precio_unitario ?? raw.precio_base ?? 0),
    categoria: String(raw.categoria ?? raw.nombre_subcategoria ?? raw.subcategoria ?? 'Sin categoría'),
    stock_actual: Number(raw.stock_actual ?? raw.stock ?? 0),
  };
}

export async function getProductosDestacados(token: string): Promise<Producto[]> {
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

  return rows.slice(0, 10).map(mapProducto);
}

export async function buscarProductos(token: string, query: string): Promise<Producto[]> {
  const params = new URLSearchParams();
  if (query.trim()) {
    params.append('search', query.trim());
  }

  const response = await fetch(`${API_BASE_URL}/productos?${params.toString()}`, {
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
      getErrorMessage(response.status, body as ApiErrorResponse | null, 'No se pudo realizar la búsqueda.'),
      response.status,
    );
  }

  const rows = Array.isArray(body)
    ? body
    : Array.isArray((body as { data?: unknown[] } | null)?.data)
      ? (body as { data: unknown[] }).data
      : [];

  return rows.map(mapProducto);
}

export async function getDashboardCompradorData(token: string, userInfo: MeResponse): Promise<DashboardCompradorData> {
  try {
    const productosDestacados = await getProductosDestacados(token);
    
    const totalCompras = 12;
    const comprasHoy = 2;

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

// Cart management functions
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
  try {
    const cart = await getCarritoLocal();
    const existingItem = cart.find(item => item.id === producto.id);
    
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
  } catch (error) {
    console.error('Error adding to cart:', error);
    throw error;
  }
}

export async function checkout(token: string, cartItems: CartItem[]): Promise<any> {
  if (!cartItems || cartItems.length === 0) {
    throw new ApiError('El carrito está vacío.', 400);
  }

  const payload = {
    items: cartItems.map(item => ({
      producto_id: item.id,
      cantidad: item.cantidad,
      precio: item.precio_unitario,
    })),
    total: cartItems.reduce((acc, item) => acc + (item.precio_unitario * item.cantidad), 0),
  };

  const response = await fetch(`${API_BASE_URL}/compras`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  let body: unknown;

  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok) {
    throw new ApiError(
      getErrorMessage(response.status, body as ApiErrorResponse | null, 'No se pudo procesar el pago.'),
      response.status,
    );
  }

  return body;
}
