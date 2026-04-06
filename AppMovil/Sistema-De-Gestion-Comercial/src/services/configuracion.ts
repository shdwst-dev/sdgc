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

export type EmpleadoDetalle = {
  id_usuario: number;
  id_persona: number;
  id_rol: number;
  id_estatus: number;
  nombre: string;
  apellido_paterno: string;
  apellido_materno: string | null;
  telefono: string;
  email: string;
  rol: string;
  estatus: string;
};

export type CatalogoSimple = { id: number; nombre: string };

export type EmpleadoDetalleResponse = {
  empleado: EmpleadoDetalle;
  catalogos: {
    roles: CatalogoSimple[];
    estatus: CatalogoSimple[];
  };
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

export async function getEmpleadoDetalle(token: string, idEmpleado: number): Promise<EmpleadoDetalleResponse> {
  const body = await apiRequest<Record<string, unknown>>(`/v1/configuracion/empleados/${idEmpleado}`, {
    token,
    fallbackError: 'No se pudo cargar el detalle del empleado.',
  });

  const empleadoRaw = (body?.empleado ?? {}) as Record<string, unknown>;
  const catalogos = (body?.catalogos ?? {}) as Record<string, unknown>;

  const mapCatalogo = (rows: unknown[]): CatalogoSimple[] => rows
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
    .map((item) => ({
      id: Number(item.id_rol ?? item.id_estatus ?? 0),
      nombre: String(item.nombre ?? ''),
    }))
    .filter((item) => item.id > 0);

  return {
    empleado: {
      id_usuario: Number(empleadoRaw.id_usuario ?? 0),
      id_persona: Number(empleadoRaw.id_persona ?? 0),
      id_rol: Number(empleadoRaw.id_rol ?? 0),
      id_estatus: Number(empleadoRaw.id_estatus ?? 0),
      nombre: String(empleadoRaw.nombre ?? ''),
      apellido_paterno: String(empleadoRaw.apellido_paterno ?? ''),
      apellido_materno: empleadoRaw.apellido_materno ? String(empleadoRaw.apellido_materno) : null,
      telefono: String(empleadoRaw.telefono ?? ''),
      email: String(empleadoRaw.email ?? ''),
      rol: String(empleadoRaw.rol ?? ''),
      estatus: String(empleadoRaw.estatus ?? ''),
    },
    catalogos: {
      roles: mapCatalogo(Array.isArray(catalogos.roles) ? catalogos.roles : []),
      estatus: mapCatalogo(Array.isArray(catalogos.estatus) ? catalogos.estatus : []),
    },
  };
}

export async function actualizarEmpleado(
  token: string,
  idEmpleado: number,
  payload: {
    nombre: string;
    apellido_paterno: string;
    apellido_materno: string | null;
    telefono: string;
    email: string;
    id_rol: number;
    id_estatus: number;
  },
): Promise<void> {
  await apiRequest(`/v1/configuracion/empleados/${idEmpleado}`, {
    method: 'PUT',
    token,
    body: payload,
    fallbackError: 'No se pudo actualizar el empleado.',
  });
}

export async function eliminarEmpleado(token: string, idEmpleado: number): Promise<void> {
  await apiRequest(`/v1/configuracion/empleados/${idEmpleado}`, {
    method: 'DELETE',
    token,
    fallbackError: 'No se pudo eliminar el empleado.',
  });
}

