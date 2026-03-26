import { useState } from "react";
import Layout from "./layout";
import "../styles/dashboard.css";
import { useApiData } from "../hooks/useApiData";
import { formatDate } from "../lib/format";
import { deleteApi, fetchApi, postApi, putApi } from "../lib/api";

type ProveedorListado = {
  id_proveedor: number;
  nombre: string;
  razon_social: string;
  contacto: string;
  correo: string;
  telefono: string;
  id_metodo_pago: number | null;
  metodo_pago: string | null;
  compras: number;
  productos: number;
  ultimo_pedido: string | null;
};

type ProveedorDetalle = {
  id_proveedor: number;
  razon_social: string;
  id_metodo_pago: number | null;
  metodo_pago: string | null;
  nombre: string;
  apellido_paterno: string;
  apellido_materno: string | null;
  telefono: string;
  compras: number;
  productos: number;
  ultimo_pedido: string | null;
  direccion: {
    estado: string;
    municipio: string;
    colonia: string;
    cp: number | null;
    calle: string;
    num_ext: number | null;
    num_int: number | null;
  };
};

type FormProveedor = {
  nombre: string;
  apellido_paterno: string;
  apellido_materno: string;
  telefono: string;
  razon_social: string;
  id_metodo_pago: string;
  estado: string;
  municipio: string;
  colonia: string;
  cp: string;
  calle: string;
  num_ext: string;
  num_int: string;
};

const initialProveedorForm: FormProveedor = {
  nombre: "",
  apellido_paterno: "",
  apellido_materno: "",
  telefono: "",
  razon_social: "",
  id_metodo_pago: "",
  estado: "",
  municipio: "",
  colonia: "",
  cp: "",
  calle: "",
  num_ext: "",
  num_int: "",
};

export default function Proveedores() {
  const [busqueda, setBusqueda] = useState("");
  const [metodoPagoSeleccionado, setMetodoPagoSeleccionado] = useState("Todos");
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [guardando, setGuardando] = useState(false);
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [accionError, setAccionError] = useState<string | null>(null);
  const [accionSuccess, setAccionSuccess] = useState<string | null>(null);
  const [proveedorSeleccionado, setProveedorSeleccionado] = useState<ProveedorDetalle | null>(null);
  const [proveedorEditando, setProveedorEditando] = useState<ProveedorDetalle | null>(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [nuevoProveedor, setNuevoProveedor] = useState<FormProveedor>(initialProveedorForm);
  const [proveedorEditable, setProveedorEditable] = useState<FormProveedor>(initialProveedorForm);
  const { data, loading, error } = useApiData(`/proveedores?refresh=${reloadKey}`, {
    catalogos: {
      metodos_pago: [] as Array<{ id_metodo_pago: number; nombre: string }>,
    },
    proveedores: [] as ProveedorListado[],
  });

  const proveedoresFiltrados = data.proveedores.filter((proveedor) => {
    const query = busqueda.trim().toLowerCase();
    const coincideBusqueda =
      proveedor.nombre.toLowerCase().includes(query) ||
      proveedor.contacto.toLowerCase().includes(query) ||
      proveedor.correo.toLowerCase().includes(query) ||
      proveedor.telefono.toLowerCase().includes(query);
    const coincideMetodo =
      metodoPagoSeleccionado === "Todos" || (proveedor.metodo_pago ?? "Sin definir") === metodoPagoSeleccionado;

    return coincideBusqueda && coincideMetodo;
  });

  const limpiarMensajesFormulario = () => {
    setFormError(null);
    setFormSuccess(null);
  };

  const limpiarMensajesAccion = () => {
    setAccionError(null);
    setAccionSuccess(null);
  };

  const reiniciarNuevoProveedor = () => {
    setNuevoProveedor(initialProveedorForm);
  };

  const construirPayload = (formulario: FormProveedor) => ({
    nombre: formulario.nombre,
    apellido_paterno: formulario.apellido_paterno,
    apellido_materno: formulario.apellido_materno || null,
    telefono: formulario.telefono,
    razon_social: formulario.razon_social,
    id_metodo_pago: formulario.id_metodo_pago ? Number(formulario.id_metodo_pago) : null,
    estado: formulario.estado,
    municipio: formulario.municipio,
    colonia: formulario.colonia,
    cp: formulario.cp ? Number(formulario.cp) : null,
    calle: formulario.calle,
    num_ext: Number(formulario.num_ext),
    num_int: formulario.num_int ? Number(formulario.num_int) : null,
  });

  const formularioInvalido = (formulario: FormProveedor) => (
    !formulario.nombre.trim() ||
    !formulario.apellido_paterno.trim() ||
    !formulario.telefono.trim() ||
    !formulario.razon_social.trim() ||
    !formulario.estado.trim() ||
    !formulario.municipio.trim() ||
    !formulario.colonia.trim() ||
    !formulario.calle.trim() ||
    Number(formulario.num_ext) <= 0
  );

  const cargarDetalleProveedor = async (idProveedor: number) => {
    setCargandoDetalle(true);
    limpiarMensajesAccion();

    try {
      const response = await fetchApi<{ proveedor: ProveedorDetalle }>(`/v1/proveedores/${idProveedor}`);
      return response.proveedor;
    } catch (submitError) {
      setAccionError(submitError instanceof Error ? submitError.message : "No fue posible consultar el proveedor.");
      return null;
    } finally {
      setCargandoDetalle(false);
    }
  };

  const registrarProveedor = async () => {
    if (formularioInvalido(nuevoProveedor)) {
      setFormError("Completa los campos obligatorios del proveedor y un numero exterior valido.");
      setFormSuccess(null);
      return;
    }

    setGuardando(true);
    limpiarMensajesFormulario();

    try {
      await postApi("/v1/proveedores/registrar", construirPayload(nuevoProveedor));
      setFormSuccess("Proveedor registrado correctamente.");
      reiniciarNuevoProveedor();
      setReloadKey((current) => current + 1);
    } catch (submitError) {
      setFormError(submitError instanceof Error ? submitError.message : "No fue posible registrar el proveedor.");
    } finally {
      setGuardando(false);
    }
  };

  const abrirDetalle = async (proveedor: ProveedorListado) => {
    setProveedorEditando(null);
    const detalle = await cargarDetalleProveedor(proveedor.id_proveedor);

    if (!detalle) {
      return;
    }

    setProveedorSeleccionado(detalle);
  };

  const abrirEdicion = async (proveedor: ProveedorListado) => {
    setProveedorSeleccionado(null);
    const detalle = await cargarDetalleProveedor(proveedor.id_proveedor);

    if (!detalle) {
      return;
    }

    setProveedorEditando(detalle);
    setProveedorEditable({
      nombre: detalle.nombre,
      apellido_paterno: detalle.apellido_paterno,
      apellido_materno: detalle.apellido_materno ?? "",
      telefono: detalle.telefono,
      razon_social: detalle.razon_social,
      id_metodo_pago: detalle.id_metodo_pago ? String(detalle.id_metodo_pago) : "",
      estado: detalle.direccion.estado,
      municipio: detalle.direccion.municipio,
      colonia: detalle.direccion.colonia,
      cp: detalle.direccion.cp ? String(detalle.direccion.cp) : "",
      calle: detalle.direccion.calle,
      num_ext: detalle.direccion.num_ext ? String(detalle.direccion.num_ext) : "",
      num_int: detalle.direccion.num_int ? String(detalle.direccion.num_int) : "",
    });
  };

  const guardarEdicion = async () => {
    if (!proveedorEditando) {
      return;
    }

    if (formularioInvalido(proveedorEditable)) {
      setAccionError("Completa los campos obligatorios del proveedor y un numero exterior valido.");
      setAccionSuccess(null);
      return;
    }

    setGuardandoEdicion(true);
    limpiarMensajesAccion();

    try {
      await putApi(`/v1/proveedores/${proveedorEditando.id_proveedor}`, construirPayload(proveedorEditable));
      setAccionSuccess("Proveedor actualizado correctamente.");
      setProveedorEditando(null);
      setReloadKey((current) => current + 1);
    } catch (submitError) {
      setAccionError(submitError instanceof Error ? submitError.message : "No fue posible actualizar el proveedor.");
    } finally {
      setGuardandoEdicion(false);
    }
  };

  const eliminarProveedor = async (proveedor: ProveedorListado) => {
    const confirmado = window.confirm(`¿Deseas eliminar a ${proveedor.nombre}?`);

    if (!confirmado) {
      return;
    }

    limpiarMensajesAccion();

    try {
      await deleteApi(`/v1/proveedores/${proveedor.id_proveedor}`);
      setAccionSuccess("Proveedor eliminado correctamente.");
      setReloadKey((current) => current + 1);

      if (proveedorSeleccionado?.id_proveedor === proveedor.id_proveedor) {
        setProveedorSeleccionado(null);
      }

      if (proveedorEditando?.id_proveedor === proveedor.id_proveedor) {
        setProveedorEditando(null);
      }
    } catch (submitError) {
      setAccionError(submitError instanceof Error ? submitError.message : "No fue posible eliminar el proveedor.");
    }
  };

  return (
    <Layout>
      <section className="inventory-header">
        <div>
          <h1>Proveedores</h1>
          <p>Consulta, registra, edita y elimina proveedores desde una sola pantalla.</p>
        </div>
        <button className="inventory-primary-button" type="button" onClick={() => setMostrarFormulario((valor) => !valor)}>
          {mostrarFormulario ? "Ocultar formulario" : "Agregar proveedor"}
        </button>
      </section>

      {mostrarFormulario ? (
        <section className="panel form-panel">
          <div className="form-panel-header">
            <h3>Nuevo proveedor</h3>
            <p>Registra razon social, contacto principal, direccion y metodo de pago.</p>
          </div>

          <div className="form-grid">
            <label className="form-field">
              <span>Razon social</span>
              <input value={nuevoProveedor.razon_social} onChange={(e) => setNuevoProveedor((actual) => ({ ...actual, razon_social: e.target.value }))} />
            </label>
            <label className="form-field">
              <span>Metodo de pago</span>
              <select value={nuevoProveedor.id_metodo_pago} onChange={(e) => setNuevoProveedor((actual) => ({ ...actual, id_metodo_pago: e.target.value }))}>
                <option value="">Sin definir</option>
                {data.catalogos.metodos_pago.map((metodo) => (
                  <option key={metodo.id_metodo_pago} value={metodo.id_metodo_pago}>
                    {metodo.nombre}
                  </option>
                ))}
              </select>
            </label>
            <label className="form-field">
              <span>Nombre</span>
              <input value={nuevoProveedor.nombre} onChange={(e) => setNuevoProveedor((actual) => ({ ...actual, nombre: e.target.value }))} />
            </label>
            <label className="form-field">
              <span>Apellido paterno</span>
              <input value={nuevoProveedor.apellido_paterno} onChange={(e) => setNuevoProveedor((actual) => ({ ...actual, apellido_paterno: e.target.value }))} />
            </label>
            <label className="form-field">
              <span>Apellido materno</span>
              <input value={nuevoProveedor.apellido_materno} onChange={(e) => setNuevoProveedor((actual) => ({ ...actual, apellido_materno: e.target.value }))} />
            </label>
            <label className="form-field">
              <span>Telefono</span>
              <input value={nuevoProveedor.telefono} onChange={(e) => setNuevoProveedor((actual) => ({ ...actual, telefono: e.target.value }))} />
            </label>
            <label className="form-field">
              <span>Estado</span>
              <input value={nuevoProveedor.estado} onChange={(e) => setNuevoProveedor((actual) => ({ ...actual, estado: e.target.value }))} />
            </label>
            <label className="form-field">
              <span>Municipio</span>
              <input value={nuevoProveedor.municipio} onChange={(e) => setNuevoProveedor((actual) => ({ ...actual, municipio: e.target.value }))} />
            </label>
            <label className="form-field">
              <span>Colonia</span>
              <input value={nuevoProveedor.colonia} onChange={(e) => setNuevoProveedor((actual) => ({ ...actual, colonia: e.target.value }))} />
            </label>
            <label className="form-field">
              <span>CP</span>
              <input value={nuevoProveedor.cp} onChange={(e) => setNuevoProveedor((actual) => ({ ...actual, cp: e.target.value }))} />
            </label>
            <label className="form-field">
              <span>Calle</span>
              <input value={nuevoProveedor.calle} onChange={(e) => setNuevoProveedor((actual) => ({ ...actual, calle: e.target.value }))} />
            </label>
            <label className="form-field">
              <span>Numero exterior</span>
              <input value={nuevoProveedor.num_ext} onChange={(e) => setNuevoProveedor((actual) => ({ ...actual, num_ext: e.target.value }))} />
            </label>
            <label className="form-field">
              <span>Numero interior</span>
              <input value={nuevoProveedor.num_int} onChange={(e) => setNuevoProveedor((actual) => ({ ...actual, num_int: e.target.value }))} />
            </label>
          </div>

          {formError ? <p className="form-message form-message-error">{formError}</p> : null}
          {formSuccess ? <p className="form-message form-message-success">{formSuccess}</p> : null}

          <div className="form-actions">
            <button className="inventory-primary-button" type="button" onClick={registrarProveedor} disabled={guardando}>
              {guardando ? "Guardando..." : "Guardar proveedor"}
            </button>
          </div>
        </section>
      ) : null}

      <section className="panel inventory-panel">
        {accionError ? <p className="form-message form-message-error">{accionError}</p> : null}
        {accionSuccess ? <p className="form-message form-message-success">{accionSuccess}</p> : null}
        {cargandoDetalle ? <p className="form-message">Cargando detalle del proveedor...</p> : null}

        {proveedorSeleccionado ? (
          <div className="detail-card detail-card-view">
            <div className="detail-card-header">
              <div>
                <p className="detail-section-label">Vista rapida</p>
                <h3>Detalle del proveedor</h3>
              </div>
              <button type="button" className="inventory-secondary-button" onClick={() => setProveedorSeleccionado(null)}>
                Cerrar
              </button>
            </div>
            <div className="detail-hero">
              <div>
                <p className="detail-eyebrow">Proveedor</p>
                <h4>{proveedorSeleccionado.razon_social}</h4>
                <p className="detail-subtitle">
                  {`${proveedorSeleccionado.nombre} ${proveedorSeleccionado.apellido_paterno} ${proveedorSeleccionado.apellido_materno ?? ""}`.trim()}
                </p>
              </div>
              <span className="inventory-status inventory-status-ok">{proveedorSeleccionado.metodo_pago ?? "Sin definir"}</span>
            </div>
            <div className="detail-summary-grid">
              <div className="detail-summary-card">
                <span>Compras</span>
                <strong>{proveedorSeleccionado.compras}</strong>
              </div>
              <div className="detail-summary-card">
                <span>Productos surtidos</span>
                <strong>{proveedorSeleccionado.productos}</strong>
              </div>
              <div className="detail-summary-card">
                <span>Ultimo pedido</span>
                <strong>{formatDate(proveedorSeleccionado.ultimo_pedido)}</strong>
              </div>
            </div>
            <div className="detail-card-grid">
              <div className="detail-field"><span>Telefono</span><strong>{proveedorSeleccionado.telefono}</strong></div>
              <div className="detail-field"><span>Estado</span><strong>{proveedorSeleccionado.direccion.estado}</strong></div>
              <div className="detail-field"><span>Municipio</span><strong>{proveedorSeleccionado.direccion.municipio}</strong></div>
              <div className="detail-field"><span>Colonia</span><strong>{proveedorSeleccionado.direccion.colonia}</strong></div>
              <div className="detail-field"><span>Calle</span><strong>{proveedorSeleccionado.direccion.calle}</strong></div>
              <div className="detail-field"><span>Numero</span><strong>{proveedorSeleccionado.direccion.num_ext}{proveedorSeleccionado.direccion.num_int ? ` Int ${proveedorSeleccionado.direccion.num_int}` : ""}</strong></div>
            </div>
          </div>
        ) : null}

        {proveedorEditando ? (
          <div className="detail-card detail-card-edit">
            <div className="detail-card-header">
              <div>
                <p className="detail-section-label">Modo edicion</p>
                <h3>Editar proveedor</h3>
              </div>
              <button type="button" className="inventory-secondary-button" onClick={() => setProveedorEditando(null)}>
                Cancelar
              </button>
            </div>
            <div className="detail-edit-main">
              <div className="form-grid">
                <label className="form-field">
                  <span>Razon social</span>
                  <input value={proveedorEditable.razon_social} onChange={(e) => setProveedorEditable((actual) => ({ ...actual, razon_social: e.target.value }))} />
                </label>
                <label className="form-field">
                  <span>Metodo de pago</span>
                  <select value={proveedorEditable.id_metodo_pago} onChange={(e) => setProveedorEditable((actual) => ({ ...actual, id_metodo_pago: e.target.value }))}>
                    <option value="">Sin definir</option>
                    {data.catalogos.metodos_pago.map((metodo) => (
                      <option key={metodo.id_metodo_pago} value={metodo.id_metodo_pago}>
                        {metodo.nombre}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="form-field">
                  <span>Nombre</span>
                  <input value={proveedorEditable.nombre} onChange={(e) => setProveedorEditable((actual) => ({ ...actual, nombre: e.target.value }))} />
                </label>
                <label className="form-field">
                  <span>Apellido paterno</span>
                  <input value={proveedorEditable.apellido_paterno} onChange={(e) => setProveedorEditable((actual) => ({ ...actual, apellido_paterno: e.target.value }))} />
                </label>
                <label className="form-field">
                  <span>Apellido materno</span>
                  <input value={proveedorEditable.apellido_materno} onChange={(e) => setProveedorEditable((actual) => ({ ...actual, apellido_materno: e.target.value }))} />
                </label>
                <label className="form-field">
                  <span>Telefono</span>
                  <input value={proveedorEditable.telefono} onChange={(e) => setProveedorEditable((actual) => ({ ...actual, telefono: e.target.value }))} />
                </label>
                <label className="form-field">
                  <span>Estado</span>
                  <input value={proveedorEditable.estado} onChange={(e) => setProveedorEditable((actual) => ({ ...actual, estado: e.target.value }))} />
                </label>
                <label className="form-field">
                  <span>Municipio</span>
                  <input value={proveedorEditable.municipio} onChange={(e) => setProveedorEditable((actual) => ({ ...actual, municipio: e.target.value }))} />
                </label>
                <label className="form-field">
                  <span>Colonia</span>
                  <input value={proveedorEditable.colonia} onChange={(e) => setProveedorEditable((actual) => ({ ...actual, colonia: e.target.value }))} />
                </label>
                <label className="form-field">
                  <span>CP</span>
                  <input value={proveedorEditable.cp} onChange={(e) => setProveedorEditable((actual) => ({ ...actual, cp: e.target.value }))} />
                </label>
                <label className="form-field">
                  <span>Calle</span>
                  <input value={proveedorEditable.calle} onChange={(e) => setProveedorEditable((actual) => ({ ...actual, calle: e.target.value }))} />
                </label>
                <label className="form-field">
                  <span>Numero exterior</span>
                  <input value={proveedorEditable.num_ext} onChange={(e) => setProveedorEditable((actual) => ({ ...actual, num_ext: e.target.value }))} />
                </label>
                <label className="form-field">
                  <span>Numero interior</span>
                  <input value={proveedorEditable.num_int} onChange={(e) => setProveedorEditable((actual) => ({ ...actual, num_int: e.target.value }))} />
                </label>
              </div>
            </div>
            <div className="form-actions">
              <button className="inventory-primary-button" type="button" onClick={guardarEdicion} disabled={guardandoEdicion}>
                {guardandoEdicion ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>
          </div>
        ) : null}

        <div className="customers-filters">
          <input type="text" placeholder="Buscar proveedores por razon social, contacto o telefono..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
          <select value={metodoPagoSeleccionado} onChange={(e) => setMetodoPagoSeleccionado(e.target.value)}>
            <option value="Todos">Todos los metodos</option>
            {[...new Set(data.proveedores.map((proveedor) => proveedor.metodo_pago ?? "Sin definir"))].map((metodo) => (
              <option key={metodo} value={metodo}>
                {metodo}
              </option>
            ))}
          </select>
        </div>

        <div className="inventory-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Razon social</th>
                <th>Contacto</th>
                <th>Metodo de pago</th>
                <th>Productos surtidos</th>
                <th>Ultimo pedido</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {proveedoresFiltrados.map((proveedor) => (
                <tr key={proveedor.id_proveedor}>
                  <td>{proveedor.nombre}</td>
                  <td>
                    <div className="customer-contact">
                      <span>{proveedor.contacto}</span>
                      <span>{proveedor.telefono}</span>
                    </div>
                  </td>
                  <td>{proveedor.metodo_pago ?? "Sin definir"}</td>
                  <td>{proveedor.productos}</td>
                  <td>{formatDate(proveedor.ultimo_pedido)}</td>
                  <td>
                    <div className="customer-actions">
                      <button type="button" className="customer-action-button customer-action-button-view" onClick={() => abrirDetalle(proveedor)}>Ver</button>
                      <button type="button" className="customer-action-button customer-action-button-edit" onClick={() => abrirEdicion(proveedor)}>Editar</button>
                      <button type="button" className="customer-action-button customer-action-button-delete" onClick={() => eliminarProveedor(proveedor)}>Eliminar</button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && proveedoresFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={6}>No se encontraron proveedores con los filtros actuales.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      {loading ? <p className="panel">Cargando proveedores...</p> : null}
      {error ? <p className="panel">Error al cargar proveedores: {error}</p> : null}
    </Layout>
  );
}
