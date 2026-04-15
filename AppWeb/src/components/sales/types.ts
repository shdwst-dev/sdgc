export type ProductoVenta = {
  id_producto: number;
  sku?: string | null;
  nombre: string;
  imagen?: string | null;
  precio: number;
  stock: number;
  stock_por_tienda: Array<{
    id_tienda: number;
    tienda: string;
    stock: number;
  }>;
};

export type ClienteVenta = {
  id_usuario: number;
  nombre: string;
  email: string;
};

export type MetodoPago = {
  id_metodo_pago: number;
  nombre: string;
};

export type TiendaVenta = {
  id_tienda: number;
  nombre: string;
};

export type CarritoItem = {
  producto_id: number;
  sku: string;
  nombre: string;
  precio_unitario: number;
  cantidad: number;
};
