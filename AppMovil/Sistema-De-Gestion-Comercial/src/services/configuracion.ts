/**
 * configuracion.ts — Servicios para pantalla de configuración admin.
 *
 * Consume:
 *   GET /api/configuracion/stats  → estadísticas de empleados por rol/estatus
 *   GET /api/configuracion        → lista de empleados + info tienda
 */

import { apiRequest, getApiRootUrl, ApiError } from './apiClient';

export { ApiError };

// ─── Types ───────────────────────────────────────────────────────────────────

export type ResumenItem = {
  nombre: string;
  cantidad: number;
};

export type EmpleadoListado = {
  id_usuario: number;
  nombre: string;
  email: string;
  telefono: string;
  rol: string;
  estatus: string;
};

export type ConfigStats = {
  total_empleados: number;
  resumen_rol: ResumenItem[];
  resumen_estatus: ResumenItem[];
};

export type ConfigData = {
  tienda: {
    id_tienda: number | null;
    nombre: string;
  };
  empleados: EmpleadoListado[];
};

// ─── API functions ───────────────────────────────────────────────────────────

export async function getConfigStats(token: string): Promise<ConfigStats> {
  const body = await apiRequest<Record<string, unknown>>('/configuracion/stats', {
    token,
    baseUrl: getApiRootUrl(),
    fallbackError: 'No se pudieron cargar las estadísticas.',
  });

  const mapResumen = (items: unknown[]): ResumenItem[] =>
    items
      .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
      .map((item) => ({
        nombre: String(item.nombre ?? 'Sin nombre'),
        cantidad: Number(item.cantidad ?? 0),
      }));

  return {
    total_empleados: Number(body?.total_empleados ?? 0),
    resumen_rol: mapResumen(Array.isArray(body?.resumen_rol) ? body.resumen_rol : []),
    resumen_estatus: mapResumen(Array.isArray(body?.resumen_estatus) ? body.resumen_estatus : []),
  };
}

export async function getConfigData(token: string): Promise<ConfigData> {
  const body = await apiRequest<Record<string, unknown>>('/configuracion', {
    token,
    baseUrl: getApiRootUrl(),
    fallbackError: 'No se pudo cargar la configuración.',
  });

  const tienda = (body?.tienda ?? {}) as Record<string, unknown>;
  const empleados = Array.isArray(body?.empleados) ? body.empleados : [];

  return {
    tienda: {
      id_tienda: tienda.id_tienda != null ? Number(tienda.id_tienda) : null,
      nombre: String(tienda.nombre ?? 'Tienda'),
    },
    empleados: empleados.map((raw: Record<string, unknown>) => ({
      id_usuario: Number(raw.id_usuario ?? 0),
      nombre: String(raw.nombre ?? ''),
      email: String(raw.email ?? ''),
      telefono: String(raw.telefono ?? ''),
      rol: String(raw.rol ?? 'Sin rol'),
      estatus: String(raw.estatus ?? ''),
    })),
  };
}
