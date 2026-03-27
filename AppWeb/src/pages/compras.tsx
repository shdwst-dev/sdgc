import { useMemo, useRef, useState } from "react";
import Layout from "./layout";
import "../styles/dashboard.css";
import { useApiData } from "../hooks/useApiData";
import { formatCurrency, formatDate } from "../lib/format";
import { deleteApi, fetchApi, postApi, putApi } from "../lib/api";
import { getStoredUser } from "../lib/auth";

function getAssignedStoreId(user: ReturnType<typeof getStoredUser>): string {
  const tienda = user?.tienda;

  if (!tienda || typeof tienda !== "object" || !("id_tienda" in tienda)) {
    return "";
  }

  return String(tienda.id_tienda);
}

type CompraListado = {
  id_compra: number;
  id_proveedor: number;
  id_estatus: number;
  folio: string;
  proveedor: string;
  fecha: string;
  total: number;
  estado: string;
};

type CompraDetalle = {
  id_compra: number;
  folio: string;
  fecha: string;
  id_proveedor: number;
  proveedor: string;
  id_estatus: number;
  estado: string;
  total: number;
  detalles: Array<{
    producto_id: number;
    producto: string;
    cantidad: number;
    precio_compra: number;
    subtotal: number;
  }>;
};

export default function Compras() {
  const usuario = getStoredUser();
  const tiendaUsuarioId = getAssignedStoreId(usuario);
  const editorRef = useRef<HTMLDivElement | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [proveedorSeleccionado, setProveedorSeleccionado] = useState("Todos");
  const [estadoSeleccionado, setEstadoSeleccionado] = useState("Todos");
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [guardando, setGuardando] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [ordenSeleccionada, setOrdenSeleccionada] = useState<CompraDetalle | null>(null);
  const [ordenEditando, setOrdenEditando] = useState<CompraDetalle | null>(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);
  const [accionError, setAccionError] = useState<string | null>(null);
  const [accionSuccess, setAccionSuccess] = useState<string | null>(null);
  const [ordenEditable, setOrdenEditable] = useState({
    id_proveedor: "",
    id_estatus: "",
  });
  const [ordenNueva, setOrdenNueva] = useState({
    id_proveedor: "",
    id_tienda: "",
    id_estatus: "1",
    detalles: [{ producto_id: "", cantidad: "1", precio_compra: "" }],
  });
  const { data, loading, error } = useApiData(`/compras?refresh=${reloadKey}`, {
    periodo_referencia: { mes: "" },
    metricas: {
      ordenes_mes: 0,
      por_recibir: 0,
      gasto_acumulado: 0,
      proveedores_activos: 0,
    },
    proveedores: [] as string[],
    catalogos: {
      proveedores: [] as Array<{ id_proveedor: number; nombre: string }>,
      productos: [] as Array<{ id_producto: number; nombre: string; precio_base: number }>,
      tiendas: [] as Array<{ id_tienda: number; nombre: string }>,
      estatus: [] as Array<{ id_estatus: number; nombre: string }>,
    },
    ordenes: [] as CompraListado[],
  });

  const tiendasDisponibles = useMemo(
    () => (tiendaUsuarioId
      ? data.catalogos.tiendas.filter((tienda) => String(tienda.id_tienda) === tiendaUsuarioId)
      : data.catalogos.tiendas),
    [data.catalogos.tiendas, tiendaUsuarioId],
  );
  const nombreTiendaAsignada = tiendasDisponibles[0]?.nombre ?? "Sin tienda asignada";

  const resetMensajesFormulario = () => {
    setFormError(null);
    setFormSuccess(null);
  };

  const resetMensajesAccion = () => {
    setAccionError(null);
    setAccionSuccess(null);
  };

  const limpiarFormularioNuevaOrden = () => {
    setOrdenNueva({
      id_proveedor: "",
      id_tienda: tiendaUsuarioId,
      id_estatus: "1",
      detalles: [{ producto_id: "", cantidad: "1", precio_compra: "" }],
    });
  };

  const ordenesFiltradas = data.ordenes.filter((orden) => {
    const coincideBusqueda =
      orden.folio.toLowerCase().includes(busqueda.toLowerCase()) ||
      orden.proveedor.toLowerCase().includes(busqueda.toLowerCase());
    const coincideProveedor =
      proveedorSeleccionado === "Todos" || orden.proveedor === proveedorSeleccionado;
    const coincideEstado =
      estadoSeleccionado === "Todos" || orden.estado === estadoSeleccionado;

    return coincideBusqueda && coincideProveedor && coincideEstado;
  });

  const actualizarDetalle = (index: number, field: "producto_id" | "cantidad" | "precio_compra", value: string) => {
    setOrdenNueva((actual) => ({
      ...actual,
      detalles: actual.detalles.map((detalle, detalleIndex) => (
        detalleIndex === index ? { ...detalle, [field]: value } : detalle
      )),
    }));
  };

  const agregarDetalle = () => {
    resetMensajesFormulario();
    setOrdenNueva((actual) => ({
      ...actual,
      detalles: [...actual.detalles, { producto_id: "", cantidad: "1", precio_compra: "" }],
    }));
  };

  const eliminarDetalle = (index: number) => {
    resetMensajesFormulario();
    setOrdenNueva((actual) => ({
      ...actual,
      detalles: actual.detalles.filter((_, detalleIndex) => detalleIndex !== index),
    }));
  };

  const registrarCompra = async () => {
    if (!ordenNueva.id_proveedor) {
      setFormError("Selecciona un proveedor.");
      setFormSuccess(null);
      return;
    }

    const detalleInvalido = ordenNueva.detalles.find((detalle) => (
      !detalle.producto_id ||
      Number(detalle.cantidad) <= 0 ||
      Number(detalle.precio_compra) <= 0
    ));

    if (detalleInvalido) {
      setFormError("Completa todos los productos con cantidad y precio de compra válidos.");
      setFormSuccess(null);
      return;
    }

    setGuardando(true);
    resetMensajesFormulario();

    try {
      await postApi("/v1/compras/registrar", {
        id_proveedor: Number(ordenNueva.id_proveedor),
        id_estatus: Number(ordenNueva.id_estatus),
        detalles: ordenNueva.detalles.map((detalle) => ({
          producto_id: Number(detalle.producto_id),
          cantidad: Number(detalle.cantidad),
          precio_compra: Number(detalle.precio_compra),
        })),
      });

      setFormSuccess("Orden de compra registrada correctamente.");
      limpiarFormularioNuevaOrden();
      setReloadKey((current) => current + 1);
    } catch (submitError) {
      setFormError(submitError instanceof Error ? submitError.message : "No fue posible registrar la compra.");
    } finally {
      setGuardando(false);
    }
  };

  const cargarDetalleCompra = async (idCompra: number) => {
    setCargandoDetalle(true);
    resetMensajesAccion();

    try {
      const response = await fetchApi<{ compra: CompraDetalle }>(`/v1/compras/${idCompra}`);
      return response.compra;
    } catch (submitError) {
      setAccionError(submitError instanceof Error ? submitError.message : "No fue posible consultar la compra.");
      return null;
    } finally {
      setCargandoDetalle(false);
    }
  };

  const abrirDetalle = async (orden: CompraListado) => {
    setOrdenEditando(null);
    const compra = await cargarDetalleCompra(orden.id_compra);

    if (!compra) {
      return;
    }

    setOrdenSeleccionada(compra);
    setOrdenEditando(null);
  };

  const abrirEdicion = async (orden: CompraListado) => {
    setOrdenSeleccionada(null);
    setMostrarFormulario(false);
    resetMensajesFormulario();
    const compra = await cargarDetalleCompra(orden.id_compra);

    if (!compra) {
      return;
    }

    setOrdenEditando(compra);
    setOrdenSeleccionada(null);
    setOrdenEditable({
      id_proveedor: String(compra.id_proveedor),
      id_estatus: String(compra.id_estatus),
    });

    requestAnimationFrame(() => {
      editorRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  };

  const guardarEdicion = async () => {
    if (!ordenEditando) {
      return;
    }

    if (!ordenEditable.id_proveedor) {
      setAccionError("Selecciona un proveedor para actualizar la compra.");
      setAccionSuccess(null);
      return;
    }

    if (!ordenEditable.id_estatus) {
      setAccionError("Selecciona un estatus para actualizar la compra.");
      setAccionSuccess(null);
      return;
    }

    setGuardandoEdicion(true);
    resetMensajesAccion();

    try {
      await putApi(`/v1/compras/${ordenEditando.id_compra}`, {
        id_proveedor: Number(ordenEditable.id_proveedor),
        id_estatus: Number(ordenEditable.id_estatus),
      });

      setAccionSuccess("Compra actualizada correctamente.");
      setOrdenEditando(null);
      setOrdenSeleccionada(null);
      setReloadKey((current) => current + 1);
    } catch (submitError) {
      setAccionError(submitError instanceof Error ? submitError.message : "No fue posible actualizar la compra.");
    } finally {
      setGuardandoEdicion(false);
    }
  };

  const eliminarCompra = async (orden: CompraListado) => {
    if (orden.estado === "Cancelado") {
      setAccionError(`La compra ${orden.folio} ya está cancelada.`);
      setAccionSuccess(null);
      return;
    }

    const confirmado = window.confirm(`¿Deseas cancelar ${orden.folio}?`);

    if (!confirmado) {
      return;
    }

    resetMensajesAccion();

    try {
      await deleteApi(`/v1/compras/${orden.id_compra}`);
      setAccionSuccess("Compra cancelada correctamente.");
      setReloadKey((current) => current + 1);

      if (ordenSeleccionada?.id_compra === orden.id_compra) {
        setOrdenSeleccionada(null);
      }

      if (ordenEditando?.id_compra === orden.id_compra) {
        setOrdenEditando(null);
      }
    } catch (submitError) {
      setAccionError(submitError instanceof Error ? submitError.message : "No fue posible cancelar la compra.");
    }
  };

  const alternarFormulario = () => {
    resetMensajesFormulario();

    if (mostrarFormulario) {
      limpiarFormularioNuevaOrden();
    }

    setMostrarFormulario((valor) => !valor);
  };

  const limpiarFiltros = () => {
    setBusqueda("");
    setProveedorSeleccionado("Todos");
    setEstadoSeleccionado("Todos");
  };

  const hayFiltrosActivos =
    busqueda.trim() !== "" ||
    proveedorSeleccionado !== "Todos" ||
    estadoSeleccionado !== "Todos";
  const totalOrdenNueva = ordenNueva.detalles.reduce((total, detalle) => {
    const cantidad = Number(detalle.cantidad) || 0;
    const precio = Number(detalle.precio_compra) || 0;

    return total + (cantidad * precio);
  }, 0);

  return (
    <Layout>
      <section className="inventory-header">
        <div>
          <h1>Compras a proveedor</h1>
          <p>Da seguimiento a órdenes de compra, proveedores y recepciones de mercancía.</p>
        </div>
        <button className="inventory-primary-button" type="button" onClick={alternarFormulario}>
          {mostrarFormulario ? "Ocultar formulario" : "Crear orden de compra"}
        </button>
      </section>

      {mostrarFormulario ? (
        <section className="panel form-panel purchases-form-panel">
          <div className="form-panel-header">
            <h3>Nueva orden de compra</h3>
            <p>Selecciona proveedor y los productos que formarán parte de la orden para tu tienda asignada.</p>
          </div>

          <div className="form-grid">
            <label className="form-field">
              <span>Proveedor</span>
              <select
                value={ordenNueva.id_proveedor}
                onChange={(e) => {
                  resetMensajesFormulario();
                  setOrdenNueva((actual) => ({ ...actual, id_proveedor: e.target.value }));
                }}
              >
                <option value="">Selecciona un proveedor</option>
                {data.catalogos.proveedores.map((proveedor) => (
                  <option key={proveedor.id_proveedor} value={proveedor.id_proveedor}>
                    {proveedor.nombre}
                  </option>
                ))}
              </select>
            </label>

            <label className="form-field">
              <span>Tienda</span>
              <input value={nombreTiendaAsignada} readOnly disabled />
            </label>

            <label className="form-field">
              <span>Estatus</span>
              <select
                value={ordenNueva.id_estatus}
                onChange={(e) => {
                  resetMensajesFormulario();
                  setOrdenNueva((actual) => ({ ...actual, id_estatus: e.target.value }));
                }}
              >
                {data.catalogos.estatus.map((estatus) => (
                  <option key={estatus.id_estatus} value={estatus.id_estatus}>
                    {estatus.nombre}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="detail-list">
            {ordenNueva.detalles.map((detalle, index) => (
              <div key={`detalle-${index}`} className="detail-row">
                <label className="form-field">
                  <span>Producto</span>
                  <select
                    value={detalle.producto_id}
                    onChange={(e) => {
                      resetMensajesFormulario();
                      actualizarDetalle(index, "producto_id", e.target.value);
                      const producto = data.catalogos.productos.find((item) => item.id_producto === Number(e.target.value));

                      if (producto) {
                        actualizarDetalle(index, "precio_compra", String(producto.precio_base));
                      }
                    }}
                  >
                    <option value="">Selecciona un producto</option>
                    {data.catalogos.productos.map((producto) => (
                      <option key={producto.id_producto} value={producto.id_producto}>
                        {producto.nombre}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="form-field">
                  <span>Cantidad</span>
                  <input
                    type="number"
                    min="1"
                    value={detalle.cantidad}
                    onChange={(e) => {
                      resetMensajesFormulario();
                      actualizarDetalle(index, "cantidad", e.target.value);
                    }}
                  />
                </label>

                <label className="form-field">
                  <span>Precio compra</span>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={detalle.precio_compra}
                    onChange={(e) => {
                      resetMensajesFormulario();
                      actualizarDetalle(index, "precio_compra", e.target.value);
                    }}
                  />
                </label>

                <button type="button" className="inventory-secondary-button detail-remove-button" onClick={() => eliminarDetalle(index)} disabled={ordenNueva.detalles.length === 1}>
                  Quitar
                </button>
              </div>
            ))}
          </div>

          <div className="form-actions">
            <button type="button" className="inventory-secondary-button" onClick={agregarDetalle}>
              Agregar producto
            </button>
          </div>

          {formError ? <p className="form-message form-message-error">{formError}</p> : null}
          {formSuccess ? <p className="form-message form-message-success">{formSuccess}</p> : null}

          <div className="form-actions purchases-form-actions">
            <div className="purchases-form-total">
              <span>Total estimado</span>
              <strong>{formatCurrency(totalOrdenNueva)}</strong>
            </div>
            <button className="inventory-primary-button" type="button" onClick={registrarCompra} disabled={guardando}>
              {guardando ? "Guardando..." : "Guardar orden"}
            </button>
          </div>
        </section>
      ) : null}

      <section className="stats-grid purchases-stats-grid">
        <div className="stat-card">
          <div className="stat-title-row">
            <span>Órdenes ({data.periodo_referencia.mes || "Mes"})</span>
          </div>
          <h3>{data.metricas.ordenes_mes}</h3>
        </div>

        <div className="stat-card">
          <div className="stat-title-row">
            <span>Por recibir</span>
          </div>
          <h3>{data.metricas.por_recibir}</h3>
        </div>

        <div className="stat-card">
          <div className="stat-title-row">
            <span>Gasto acumulado</span>
            <span>$</span>
          </div>
          <h3>{formatCurrency(data.metricas.gasto_acumulado)}</h3>
        </div>

        <div className="stat-card">
          <div className="stat-title-row">
            <span>Proveedores activos</span>
          </div>
          <h3>{data.metricas.proveedores_activos}</h3>
        </div>
      </section>

      <section className="panel inventory-panel purchases-main-panel">
        {accionError ? <p className="form-message form-message-error">{accionError}</p> : null}
        {accionSuccess ? <p className="form-message form-message-success">{accionSuccess}</p> : null}

        {cargandoDetalle ? <p className="form-message">Cargando detalle de la compra...</p> : null}

        {ordenSeleccionada ? (
          <div className="detail-card">
            <div className="detail-card-header">
              <h3>Detalle de la compra</h3>
              <button type="button" className="inventory-secondary-button" onClick={() => setOrdenSeleccionada(null)}>
                Cerrar
              </button>
            </div>
            <div className="detail-hero">
              <div>
                <p className="detail-eyebrow">Orden de compra</p>
                <h4>{ordenSeleccionada.folio}</h4>
                <p className="detail-subtitle">Proveedor: {ordenSeleccionada.proveedor}</p>
              </div>
              <span className="inventory-status inventory-status-low">{ordenSeleccionada.estado}</span>
            </div>
            <div className="detail-summary-grid">
              <div className="detail-summary-card">
                <span>Fecha</span>
                <strong>{formatDate(ordenSeleccionada.fecha)}</strong>
              </div>
              <div className="detail-summary-card">
                <span>Total</span>
                <strong>{formatCurrency(ordenSeleccionada.total)}</strong>
              </div>
              <div className="detail-summary-card">
                <span>Productos</span>
                <strong>{ordenSeleccionada.detalles.length}</strong>
              </div>
            </div>
            <div className="inventory-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Cantidad</th>
                    <th>Precio compra</th>
                    <th>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {ordenSeleccionada.detalles.map((detalle) => (
                    <tr key={`${ordenSeleccionada.id_compra}-${detalle.producto_id}`}>
                      <td>{detalle.producto}</td>
                      <td>{detalle.cantidad}</td>
                      <td>{formatCurrency(detalle.precio_compra)}</td>
                      <td>{formatCurrency(detalle.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {ordenEditando ? (
          <div ref={editorRef} className="detail-card">
            <div className="detail-card-header">
              <h3>Editar compra</h3>
              <button type="button" className="inventory-secondary-button" onClick={() => setOrdenEditando(null)}>
                Cancelar
              </button>
            </div>
            <div className="detail-edit-layout">
              <div className="detail-edit-sidebar">
                <p className="detail-eyebrow">Orden seleccionada</p>
                <h4>{ordenEditando.folio}</h4>
                <p className="detail-subtitle">Solo proveedor y estatus se actualizan en la base actual.</p>
                <div className="detail-field-list">
                  <div className="detail-field"><span>Fecha</span><strong>{formatDate(ordenEditando.fecha)}</strong></div>
                  <div className="detail-field"><span>Total actual</span><strong>{formatCurrency(ordenEditando.total)}</strong></div>
                  <div className="detail-field"><span>Productos</span><strong>{ordenEditando.detalles.length}</strong></div>
                </div>
              </div>
              <div className="detail-edit-main">
                <div className="form-grid">
                  <label className="form-field">
                    <span>Proveedor</span>
                    <select
                      value={ordenEditable.id_proveedor}
                      onChange={(e) => {
                        resetMensajesAccion();
                        setOrdenEditable((actual) => ({ ...actual, id_proveedor: e.target.value }));
                      }}
                    >
                      <option value="">Selecciona un proveedor</option>
                      {data.catalogos.proveedores.map((proveedor) => (
                        <option key={proveedor.id_proveedor} value={proveedor.id_proveedor}>
                          {proveedor.nombre}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="form-field">
                    <span>Estatus</span>
                    <select
                      value={ordenEditable.id_estatus}
                      onChange={(e) => {
                        resetMensajesAccion();
                        setOrdenEditable((actual) => ({ ...actual, id_estatus: e.target.value }));
                      }}
                    >
                      {data.catalogos.estatus.map((estatus) => (
                        <option key={estatus.id_estatus} value={estatus.id_estatus}>
                          {estatus.nombre}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="detail-inline-note">
                  Los productos de la orden se muestran como referencia para no desajustar stock con el esquema actual.
                </div>

                <div className="inventory-table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Producto</th>
                        <th>Cantidad</th>
                        <th>Precio compra</th>
                        <th>Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ordenEditando.detalles.map((detalle) => (
                        <tr key={`${ordenEditando.id_compra}-${detalle.producto_id}`}>
                          <td>{detalle.producto}</td>
                          <td>{detalle.cantidad}</td>
                          <td>{formatCurrency(detalle.precio_compra)}</td>
                          <td>{formatCurrency(detalle.subtotal)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="form-actions">
              <button className="inventory-primary-button" type="button" onClick={guardarEdicion} disabled={guardandoEdicion}>
                {guardandoEdicion ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>
          </div>
        ) : null}

        <div className="inventory-filters purchases-filters">
          <input type="text" placeholder="Buscar órdenes de compra..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
          <select value={proveedorSeleccionado} onChange={(e) => setProveedorSeleccionado(e.target.value)}>
            <option value="Todos">Todos los proveedores</option>
            {data.proveedores.map((proveedor) => (
              <option key={proveedor} value={proveedor}>
                {proveedor}
              </option>
            ))}
          </select>
          <select value={estadoSeleccionado} onChange={(e) => setEstadoSeleccionado(e.target.value)}>
            <option value="Todos">Todos los estados</option>
            <option value="Pendiente">Pendiente</option>
            <option value="Completado">Completado</option>
            <option value="En Proceso">En Proceso</option>
            <option value="Cancelado">Cancelado</option>
          </select>
          <button
            type="button"
            className="inventory-secondary-button"
            onClick={limpiarFiltros}
            disabled={!hayFiltrosActivos}
            title={hayFiltrosActivos ? "Limpiar filtros" : "Sin filtros activos"}
          >
            {hayFiltrosActivos ? "Limpiar filtros" : `${ordenesFiltradas.length} resultados`}
          </button>
        </div>

        <div className="inventory-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Folio</th>
                <th>Proveedor</th>
                <th>Fecha</th>
                <th>Total</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {ordenesFiltradas.map((orden) => (
                <tr key={orden.id_compra}>
                  <td>{orden.folio}</td>
                  <td>{orden.proveedor}</td>
                  <td>{formatDate(orden.fecha)}</td>
                  <td>{formatCurrency(orden.total)}</td>
                  <td>
                    <span
                      className={`inventory-status ${
                        orden.estado === "Completado"
                          ? "inventory-status-ok"
                          : orden.estado === "Pendiente" || orden.estado === "En Proceso"
                            ? "inventory-status-low"
                            : "invoice-status-overdue"
                      }`}
                    >
                      {orden.estado}
                    </span>
                  </td>
                  <td>
                    <div className="customer-actions">
                      <button
                        type="button"
                        className="customer-action-button customer-action-button-view"
                        onClick={() => abrirDetalle(orden)}
                        disabled={cargandoDetalle}
                      >
                        Ver
                      </button>
                      <button
                        type="button"
                        className="customer-action-button customer-action-button-edit"
                        onClick={() => abrirEdicion(orden)}
                        disabled={cargandoDetalle}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        className="customer-action-button customer-action-button-delete"
                        onClick={() => eliminarCompra(orden)}
                        disabled={orden.estado === "Cancelado"}
                      >
                        {orden.estado === "Cancelado" ? "Cancelada" : "Eliminar"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {loading ? <p className="panel">Cargando compras...</p> : null}
      {error ? <p className="panel">Error al cargar compras: {error}</p> : null}
    </Layout>
  );
}
