import { useState } from "react";
import Layout from "./layout";
import "../styles/dashboard.css";
import { useApiData } from "../hooks/useApiData";
import { deleteApi, fetchApi, putApi } from "../lib/api";

type EmpleadoListado = {
  id_usuario: number;
  nombre: string;
  email: string;
  telefono: string;
  rol: string;
  estatus: string;
};

type EmpleadoDetalle = {
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

type ConfiguracionData = {
  tienda: {
    id_tienda: number | null;
    nombre: string;
  };
  empleados: EmpleadoListado[];
};

type EmpleadoResponse = {
  empleado: EmpleadoDetalle;
  catalogos: {
    roles: Array<{ id_rol: number; nombre: string }>;
    estatus: Array<{ id_estatus: number; nombre: string }>;
  };
};

const initialEditable = {
  nombre: "",
  apellido_paterno: "",
  apellido_materno: "",
  telefono: "",
  email: "",
  id_rol: "",
  id_estatus: "",
};

export default function Configuracion() {
  const [reloadKey, setReloadKey] = useState(0);
  const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState<EmpleadoDetalle | null>(null);
  const [empleadoEditando, setEmpleadoEditando] = useState<EmpleadoDetalle | null>(null);
  const [catalogosEdicion, setCatalogosEdicion] = useState<EmpleadoResponse["catalogos"]>({
    roles: [],
    estatus: [],
  });
  const [empleadoEditable, setEmpleadoEditable] = useState(initialEditable);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);
  const [eliminandoId, setEliminandoId] = useState<number | null>(null);
  const [accionError, setAccionError] = useState<string | null>(null);
  const [accionSuccess, setAccionSuccess] = useState<string | null>(null);
  const { data, loading, error } = useApiData<ConfiguracionData>(`/configuracion?refresh=${reloadKey}`, {
    tienda: {
      id_tienda: null,
      nombre: "",
    },
    empleados: [],
  });

  const limpiarMensajes = () => {
    setAccionError(null);
    setAccionSuccess(null);
  };

  const cargarDetalleEmpleado = async (idEmpleado: number) => {
    setCargandoDetalle(true);
    limpiarMensajes();

    try {
      return await fetchApi<EmpleadoResponse>(`/v1/configuracion/empleados/${idEmpleado}`);
    } catch (submitError) {
      setAccionError(submitError instanceof Error ? submitError.message : "No fue posible consultar el empleado.");
      return null;
    } finally {
      setCargandoDetalle(false);
    }
  };

  const abrirDetalle = async (empleado: EmpleadoListado) => {
    setEmpleadoEditando(null);
    const response = await cargarDetalleEmpleado(empleado.id_usuario);

    if (!response) {
      return;
    }

    setEmpleadoSeleccionado(response.empleado);
  };

  const abrirEdicion = async (empleado: EmpleadoListado) => {
    setEmpleadoSeleccionado(null);
    const response = await cargarDetalleEmpleado(empleado.id_usuario);

    if (!response) {
      return;
    }

    setEmpleadoEditando(response.empleado);
    setCatalogosEdicion(response.catalogos);
    setEmpleadoEditable({
      nombre: response.empleado.nombre,
      apellido_paterno: response.empleado.apellido_paterno,
      apellido_materno: response.empleado.apellido_materno ?? "",
      telefono: response.empleado.telefono,
      email: response.empleado.email,
      id_rol: String(response.empleado.id_rol),
      id_estatus: String(response.empleado.id_estatus),
    });
  };

  const guardarEdicion = async () => {
    if (!empleadoEditando) {
      return;
    }

    setGuardandoEdicion(true);
    limpiarMensajes();

    try {
      await putApi(`/v1/configuracion/empleados/${empleadoEditando.id_usuario}`, {
        nombre: empleadoEditable.nombre,
        apellido_paterno: empleadoEditable.apellido_paterno,
        apellido_materno: empleadoEditable.apellido_materno || null,
        telefono: empleadoEditable.telefono,
        email: empleadoEditable.email,
        id_rol: Number(empleadoEditable.id_rol),
        id_estatus: Number(empleadoEditable.id_estatus),
      });

      setAccionSuccess("Empleado actualizado correctamente.");
      setEmpleadoEditando(null);
      setReloadKey((actual) => actual + 1);
    } catch (submitError) {
      setAccionError(submitError instanceof Error ? submitError.message : "No fue posible actualizar el empleado.");
    } finally {
      setGuardandoEdicion(false);
    }
  };

  const eliminarEmpleado = async (empleado: EmpleadoListado) => {
    const confirmado = window.confirm(`¿Deseas eliminar a ${empleado.nombre}?`);

    if (!confirmado) {
      return;
    }

    setEliminandoId(empleado.id_usuario);
    limpiarMensajes();

    try {
      await deleteApi(`/v1/configuracion/empleados/${empleado.id_usuario}`);

      if (empleadoSeleccionado?.id_usuario === empleado.id_usuario) {
        setEmpleadoSeleccionado(null);
      }

      if (empleadoEditando?.id_usuario === empleado.id_usuario) {
        setEmpleadoEditando(null);
      }

      setAccionSuccess("Empleado eliminado correctamente.");
      setReloadKey((actual) => actual + 1);
    } catch (submitError) {
      setAccionError(submitError instanceof Error ? submitError.message : "No fue posible eliminar el empleado.");
    } finally {
      setEliminandoId(null);
    }
  };

  return (
    <Layout>
      <section className="inventory-header">
        <div>
          <h1>Configuracion</h1>
          <p>
            {data.tienda.id_tienda
              ? "Consulta y administra los empleados dados de alta en la tienda asignada a tu usuario."
              : "Consulta y administra los empleados registrados en todas las tiendas."}
          </p>
        </div>
      </section>

      <section className="settings-layout settings-layout-single">
        <aside className="panel settings-sidebar-panel">
          <div className="settings-sidebar-summary">
            <p className="detail-section-label">Panel activo</p>
            <h3>{data.tienda.nombre || "Tienda"}</h3>
            <p>{data.empleados.length} empleados registrados</p>
          </div>
          <div className="settings-nav">
            <button type="button" className="settings-nav-item active">
              {data.tienda.id_tienda ? "Empleados de la tienda" : "Empleados de todas las tiendas"}
            </button>
          </div>
        </aside>

        <section className="panel settings-content-panel">
          <div className="settings-panel-header">
            <div>
              <p className="detail-section-label">Personal registrado</p>
              <h4>Empleados dados de alta</h4>
            </div>
          </div>

          {accionError ? <p className="form-message form-message-error">{accionError}</p> : null}
          {accionSuccess ? <p className="form-message form-message-success">{accionSuccess}</p> : null}
          {cargandoDetalle ? <p className="form-message">Cargando detalle del empleado...</p> : null}

          {empleadoSeleccionado ? (
            <div className="detail-card detail-card-view">
              <div className="detail-card-header">
                <div>
                  <p className="detail-section-label">Vista rapida</p>
                  <h3>{empleadoSeleccionado.nombre} {empleadoSeleccionado.apellido_paterno}</h3>
                </div>
                <button type="button" className="inventory-secondary-button" onClick={() => setEmpleadoSeleccionado(null)}>
                  Cerrar
                </button>
              </div>
              <div className="detail-summary-grid">
                <div className="detail-summary-card">
                  <span>Correo</span>
                  <strong>{empleadoSeleccionado.email}</strong>
                </div>
                <div className="detail-summary-card">
                  <span>Telefono</span>
                  <strong>{empleadoSeleccionado.telefono || "Sin telefono"}</strong>
                </div>
                <div className="detail-summary-card">
                  <span>Rol</span>
                  <strong>{empleadoSeleccionado.rol}</strong>
                </div>
                <div className="detail-summary-card">
                  <span>Estatus</span>
                  <strong>{empleadoSeleccionado.estatus}</strong>
                </div>
              </div>
            </div>
          ) : null}

          {empleadoEditando ? (
            <div className="detail-card detail-card-view">
              <div className="detail-card-header">
                <div>
                  <p className="detail-section-label">Edicion</p>
                  <h3>Actualizar empleado</h3>
                </div>
                <button type="button" className="inventory-primary-button settings-save-button" onClick={guardarEdicion} disabled={guardandoEdicion}>
                  {guardandoEdicion ? "Guardando..." : "Guardar cambios"}
                </button>
              </div>

              <div className="settings-form">
                <div className="settings-field">
                  <label htmlFor="empleado-nombre">Nombre</label>
                  <input id="empleado-nombre" value={empleadoEditable.nombre} onChange={(e) => setEmpleadoEditable((actual) => ({ ...actual, nombre: e.target.value }))} />
                </div>
                <div className="settings-field">
                  <label htmlFor="empleado-ap">Apellido paterno</label>
                  <input id="empleado-ap" value={empleadoEditable.apellido_paterno} onChange={(e) => setEmpleadoEditable((actual) => ({ ...actual, apellido_paterno: e.target.value }))} />
                </div>
                <div className="settings-field">
                  <label htmlFor="empleado-am">Apellido materno</label>
                  <input id="empleado-am" value={empleadoEditable.apellido_materno} onChange={(e) => setEmpleadoEditable((actual) => ({ ...actual, apellido_materno: e.target.value }))} />
                </div>
                <div className="settings-field">
                  <label htmlFor="empleado-telefono">Telefono</label>
                  <input id="empleado-telefono" value={empleadoEditable.telefono} onChange={(e) => setEmpleadoEditable((actual) => ({ ...actual, telefono: e.target.value }))} />
                </div>
                <div className="settings-field settings-field-full">
                  <label htmlFor="empleado-email">Correo</label>
                  <input id="empleado-email" type="email" value={empleadoEditable.email} onChange={(e) => setEmpleadoEditable((actual) => ({ ...actual, email: e.target.value }))} />
                </div>
                <div className="settings-field">
                  <label htmlFor="empleado-rol">Rol</label>
                  <select id="empleado-rol" value={empleadoEditable.id_rol} onChange={(e) => setEmpleadoEditable((actual) => ({ ...actual, id_rol: e.target.value }))}>
                    {catalogosEdicion.roles.map((rol) => (
                      <option key={rol.id_rol} value={rol.id_rol}>{rol.nombre}</option>
                    ))}
                  </select>
                </div>
                <div className="settings-field">
                  <label htmlFor="empleado-estatus">Estatus</label>
                  <select id="empleado-estatus" value={empleadoEditable.id_estatus} onChange={(e) => setEmpleadoEditable((actual) => ({ ...actual, id_estatus: e.target.value }))}>
                    {catalogosEdicion.estatus.map((estatus) => (
                      <option key={estatus.id_estatus} value={estatus.id_estatus}>{estatus.nombre}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          ) : null}

          <div className="inventory-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Empleado</th>
                  <th>Correo</th>
                  <th>Telefono</th>
                  <th>Rol</th>
                  <th>Estatus</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {data.empleados.map((empleado) => (
                  <tr key={empleado.id_usuario}>
                    <td>{empleado.nombre}</td>
                    <td>{empleado.email}</td>
                    <td>{empleado.telefono || "Sin telefono"}</td>
                    <td>{empleado.rol}</td>
                    <td>
                      <span className={`inventory-status ${empleado.estatus === "Activo" ? "inventory-status-ok" : "inventory-status-low"}`}>
                        {empleado.estatus}
                      </span>
                    </td>
                    <td>
                      <div className="customer-actions">
                        <button type="button" className="customer-action-button customer-action-button-view" onClick={() => abrirDetalle(empleado)}>
                          Ver
                        </button>
                        <button type="button" className="customer-action-button customer-action-button-edit" onClick={() => abrirEdicion(empleado)}>
                          Editar
                        </button>
                        <button
                          type="button"
                          className="customer-action-button customer-action-button-delete"
                          onClick={() => eliminarEmpleado(empleado)}
                          disabled={eliminandoId === empleado.id_usuario}
                        >
                          {eliminandoId === empleado.id_usuario ? "Eliminando..." : "Eliminar"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!loading && data.empleados.length === 0 ? (
                  <tr>
                    <td colSpan={6}>No hay empleados registrados para esta tienda.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </section>

      {loading ? <p className="panel">Cargando configuracion...</p> : null}
      {error ? <p className="panel">Error al cargar configuracion: {error}</p> : null}
    </Layout>
  );
}
