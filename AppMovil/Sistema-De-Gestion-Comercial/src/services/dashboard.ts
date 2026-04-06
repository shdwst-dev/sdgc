/**
 * dashboard.ts — Servicios para dashboard admin.
 *
 * Consume los endpoints /api/dashboard* del backend Laravel (sin prefijo /v1).
 * Los field names coinciden con los del backend DashboardDataController.
 */

import { apiRequest, getApiRootUrl, ApiError } from './apiClient';

export { ApiError };

// ─── Types ───────────────────────────────────────────────────────────────────

export type DashboardMetricas = {
  periodo_referencia: string;
  ingresos_hoy: number;
  ingresos_mes: number;
  gastos_mes: number;
  ganancia_mes: number;
  flujo_mensual: {
    labels: string[];
    ingresos: number[];
    gastos: number[];
    utilidad: number[];
  };
};

export type TopProducto = {
  nombre: string;
  cantidad: number;
};

export type VentaReciente = {
  factura: string;
  cliente: string;
  responsable: string;
  monto: number;
  fecha: string;
};

export type AlertaStock = {
  sku: string;
  producto: string;
  actual: number;
  minimo: number;
};

// ─── Dashboard principal ─────────────────────────────────────────────────────

export async function getDashboardData(token: string): Promise<DashboardMetricas> {
  const body = await apiRequest<Record<string, unknown>>('/dashboard', {
    token,
    baseUrl: getApiRootUrl(),
    fallbackError: 'No se pudo cargar el dashboard.',
  });

  // El backend devuelve: { periodo_referencia: {fecha, mes}, metricas: {...}, flujo_mensual: {...} }
  const metricas = (body?.metricas ?? {}) as Record<string, unknown>;
  const periodo = (body?.periodo_referencia ?? {}) as Record<string, unknown>;
  const flujo = (body?.flujo_mensual ?? { labels: [], ingresos: [], gastos: [], utilidad: [] }) as {
    labels: string[];
    ingresos: number[];
    gastos: number[];
    utilidad: number[];
  };

  return {
    periodo_referencia: String(periodo?.mes ?? ''),
    ingresos_hoy: Number(metricas?.ingresos_hoy ?? 0),
    ingresos_mes: Number(metricas?.ingresos_mes ?? 0),
    gastos_mes: Number(metricas?.gastos_mes ?? 0),
    ganancia_mes: Number(metricas?.ganancia_mes ?? 0),
    flujo_mensual: flujo,
  };
}

// ─── Top productos ───────────────────────────────────────────────────────────

export async function getTopProductos(token: string): Promise<TopProducto[]> {
  const body = await apiRequest<Record<string, unknown>>('/dashboard/top-productos', {
    token,
    baseUrl: getApiRootUrl(),
    fallbackError: 'No se pudo cargar el ranking de productos.',
  });

  // Backend devuelve: { top_productos: [{nombre, cantidad}] }
  const items = Array.isArray(body?.top_productos) ? body.top_productos : [];

  return items.map((raw: Record<string, unknown>) => ({
    nombre: String(raw.nombre ?? 'Sin nombre'),
    cantidad: Number(raw.cantidad ?? 0),
  }));
}

// ─── Ventas recientes ────────────────────────────────────────────────────────

export async function getVentasRecientes(token: string): Promise<VentaReciente[]> {
  const body = await apiRequest<Record<string, unknown>>('/dashboard/ventas-recientes', {
    token,
    baseUrl: getApiRootUrl(),
    fallbackError: 'No se pudo cargar las ventas recientes.',
  });

  // Backend devuelve: { ventas_recientes: [{factura, cliente, responsable, monto, fecha}] }
  const items = Array.isArray(body?.ventas_recientes) ? body.ventas_recientes : [];

  return items.map((raw: Record<string, unknown>) => ({
    factura: String(raw.factura ?? ''),
    cliente: String(raw.cliente ?? 'Venta mostrador'),
    responsable: String(raw.responsable ?? ''),
    monto: Number(raw.monto ?? 0),
    fecha: String(raw.fecha ?? ''),
  }));
}

// ─── Alertas de stock ────────────────────────────────────────────────────────

export async function getAlertasStock(token: string): Promise<AlertaStock[]> {
  const body = await apiRequest<Record<string, unknown>>('/dashboard/alertas-stock', {
    token,
    baseUrl: getApiRootUrl(),
    fallbackError: 'No se pudo cargar las alertas de stock.',
  });

  // Backend devuelve: { alertas_stock: [{sku, producto, actual, minimo}] }
  const items = Array.isArray(body?.alertas_stock) ? body.alertas_stock : [];

  return items.map((raw: Record<string, unknown>) => ({
    sku: String(raw.sku ?? ''),
    producto: String(raw.producto ?? 'Sin nombre'),
    actual: Number(raw.actual ?? 0),
    minimo: Number(raw.minimo ?? 0),
  }));
}
