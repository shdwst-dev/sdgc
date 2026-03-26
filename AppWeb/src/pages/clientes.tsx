import { useState } from "react";
import Layout from "./layout";
import "../styles/dashboard.css";
import { useApiData } from "../hooks/useApiData";
import { formatCurrency, formatDate } from "../lib/format";
import { deleteApi, fetchApi, postApi, putApi } from "../lib/api";

type ClienteListado = {
  id_usuario: number;
  id_estatus: number;
  nombre: string;
  correo: string;
  telefono: string;
  compras: number;
  ultima_compra: string | null;
  estado: string;
};

type ClienteDetalle = {
  id_usuario: number;
  nombre: string;
  apellido_paterno: string;
  apellido_materno: string | null;
  telefono: string;
  email: string;
  id_estatus: number;
  estado: string;
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

export default function Clientes() {
  const [busqueda, setBusqueda] = useState("");
  const [estadoSeleccionado, setEstadoSeleccionado] = useState("Todos");
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [guardando, setGuardando] = useState(false);
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [accionError, setAccionError] = useState<string | null>(null);
  const [accionSuccess, setAccionSuccess] = useState<string | null>(null);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<ClienteDetalle | null>(null);
  const [clienteEditando, setClienteEditando] = useState<ClienteDetalle | null>(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [nuevoCliente, setNuevoCliente] = useState({
    nombre: "",
    apellido_paterno: "",
    apellido_materno: "",
    telefono: "",
    email: "",
    contrasena: "",
    estado: "",
    municipio: "",
    colonia: "",
    cp: "",
    calle: "",
    num_ext: "",
    num_int: "",
    id_estatus: "1",
  });
  const [clienteEditable, setClienteEditable] = useState({
    nombre: "",
    apellido_paterno: "",
    apellido_materno: "",
    telefono: "",
    email: "",
    contrasena: "",
    estado: "",
    municipio: "",
    colonia: "",
    cp: "",
    calle: "",
    num_ext: "",
    num_int: "",
    id_estatus: "1",
  });
  const { data, loading, error } = useApiData(`/clientes?refresh=${reloadKey}`, {
    catalogos: {
      estatus: [] as Array<{ id_estatus: number; nombre: string }>,
    },
    clientes: [] as ClienteListado[],
  });

  const clientesFiltrados = data.clientes.filter((cliente) => {
    const query = busqueda.trim().toLowerCase();
    const coincideBusqueda =
      cliente.nombre.toLowerCase().includes(query) ||
      cliente.correo.toLowerCase().includes(query) ||
      cliente.telefono.toLowerCase().includes(query);
    const coincideEstado = estadoSeleccionado === "Todos" || cliente.estado === estadoSeleccionado;

    return coincideBusqueda && coincideEstado;
  });

  const limpiarMensajesFormulario = () => {
    setFormError(null);
    setFormSuccess(null);
  };

  const limpiarMensajesAccion = () => {
    setAccionError(null);
    setAccionSuccess(null);
  };

  const reiniciarNuevoCliente = () => {
    setNuevoCliente({
      nombre: "",
      apellido_paterno: "",
      apellido_materno: "",
      telefono: "",
      email: "",
      contrasena: "",
      estado: "",
      municipio: "",
      colonia: "",
      cp: "",
      calle: "",
      num_ext: "",
      num_int: "",
      id_estatus: "1",
    });
  };

  const cargarDetalleCliente = async (idCliente: number) => {
    setCargandoDetalle(true);
    limpiarMensajesAccion();

    try {
      const response = await fetchApi<{ cliente: ClienteDetalle }>(`/v1/clientes/${idCliente}`);
      return response.cliente;
    } catch (submitError) {
      setAccionError(submitError instanceof Error ? submitError.message : "No fue posible consultar el cliente.");
      return null;
    } finally {
      setCargandoDetalle(false);
    }
  };

  const registrarCliente = async () => {
    setGuardando(true);
    limpiarMensajesFormulario();

    try {
      await postApi("/v1/clientes/registrar", {
        nombre: nuevoCliente.nombre,
        apellido_paterno: nuevoCliente.apellido_paterno,
        apellido_materno: nuevoCliente.apellido_materno || null,
        telefono: nuevoCliente.telefono,
        email: nuevoCliente.email,
        contrasena: nuevoCliente.contrasena,
        estado: nuevoCliente.estado,
        municipio: nuevoCliente.municipio,
        colonia: nuevoCliente.colonia,
        cp: nuevoCliente.cp ? Number(nuevoCliente.cp) : null,
        calle: nuevoCliente.calle,
        num_ext: Number(nuevoCliente.num_ext),
        num_int: nuevoCliente.num_int ? Number(nuevoCliente.num_int) : null,
        id_estatus: Number(nuevoCliente.id_estatus),
      });

      setFormSuccess("Cliente registrado correctamente.");
      reiniciarNuevoCliente();
      setReloadKey((current) => current + 1);
    } catch (submitError) {
      setFormError(submitError instanceof Error ? submitError.message : "No fue posible registrar el cliente.");
    } finally {
      setGuardando(false);
    }
  };

  const abrirDetalle = async (cliente: ClienteListado) => {
    setClienteEditando(null);
    const detalle = await cargarDetalleCliente(cliente.id_usuario);

    if (!detalle) {
      return;
    }

    setClienteSeleccionado(detalle);
  };

  const abrirEdicion = async (cliente: ClienteListado) => {
    setClienteSeleccionado(null);
    const detalle = await cargarDetalleCliente(cliente.id_usuario);

    if (!detalle) {
      return;
    }

    setClienteEditando(detalle);
    setClienteEditable({
      nombre: detalle.nombre,
      apellido_paterno: detalle.apellido_paterno,
      apellido_materno: detalle.apellido_materno ?? "",
      telefono: detalle.telefono,
      email: detalle.email,
      contrasena: "",
      estado: detalle.direccion.estado,
      municipio: detalle.direccion.municipio,
      colonia: detalle.direccion.colonia,
      cp: detalle.direccion.cp ? String(detalle.direccion.cp) : "",
      calle: detalle.direccion.calle,
      num_ext: detalle.direccion.num_ext ? String(detalle.direccion.num_ext) : "",
      num_int: detalle.direccion.num_int ? String(detalle.direccion.num_int) : "",
      id_estatus: String(detalle.id_estatus),
    });
  };

  const guardarEdicion = async () => {
    if (!clienteEditando) {
      return;
    }

    setGuardandoEdicion(true);
    limpiarMensajesAccion();

    try {
      await putApi(`/v1/clientes/${clienteEditando.id_usuario}`, {
        nombre: clienteEditable.nombre,
        apellido_paterno: clienteEditable.apellido_paterno,
        apellido_materno: clienteEditable.apellido_materno || null,
        telefono: clienteEditable.telefono,
        email: clienteEditable.email,
        contrasena: clienteEditable.contrasena || null,
        estado: clienteEditable.estado,
        municipio: clienteEditable.municipio,
        colonia: clienteEditable.colonia,
        cp: clienteEditable.cp ? Number(clienteEditable.cp) : null,
        calle: clienteEditable.calle,
        num_ext: Number(clienteEditable.num_ext),
        num_int: clienteEditable.num_int ? Number(clienteEditable.num_int) : null,
        id_estatus: Number(clienteEditable.id_estatus),
      });

      setAccionSuccess("Cliente actualizado correctamente.");
      setClienteEditando(null);
      setReloadKey((current) => current + 1);
    } catch (submitError) {
      setAccionError(submitError instanceof Error ? submitError.message : "No fue posible actualizar el cliente.");
    } finally {
      setGuardandoEdicion(false);
    }
  };

  const eliminarCliente = async (cliente: ClienteListado) => {
    const confirmado = window.confirm(`¿Deseas desactivar a ${cliente.nombre}?`);

    if (!confirmado) {
      return;
    }

    limpiarMensajesAccion();

    try {
      await deleteApi(`/v1/clientes/${cliente.id_usuario}`);
      setAccionSuccess("Cliente eliminado correctamente.");
      setReloadKey((current) => current + 1);

      if (clienteSeleccionado?.id_usuario === cliente.id_usuario) {
        setClienteSeleccionado(null);
      }

      if (clienteEditando?.id_usuario === cliente.id_usuario) {
        setClienteEditando(null);
      }
    } catch (submitError) {
      setAccionError(submitError instanceof Error ? submitError.message : "No fue posible eliminar el cliente.");
    }
  };

  return (
    <Layout>
      <section className="inventory-header">
        <div>
          <h1>Clientes</h1>
          <p>Consulta, registra, edita y desactiva clientes desde una sola pantalla.</p>
        </div>
        <button className="inventory-primary-button" type="button" onClick={() => setMostrarFormulario((valor) => !valor)}>
          {mostrarFormulario ? "Ocultar formulario" : "Agregar cliente"}
        </button>
      </section>

      {mostrarFormulario ? (
        <section className="panel form-panel">
          <div className="form-panel-header">
            <h3>Nuevo cliente</h3>
            <p>Registra un comprador con datos de contacto, acceso y dirección.</p>
          </div>

          <div className="form-grid">
            <label className="form-field">
              <span>Nombre</span>
              <input value={nuevoCliente.nombre} onChange={(e) => setNuevoCliente((actual) => ({ ...actual, nombre: e.target.value }))} />
            </label>
            <label className="form-field">
              <span>Apellido paterno</span>
              <input value={nuevoCliente.apellido_paterno} onChange={(e) => setNuevoCliente((actual) => ({ ...actual, apellido_paterno: e.target.value }))} />
            </label>
            <label className="form-field">
              <span>Apellido materno</span>
              <input value={nuevoCliente.apellido_materno} onChange={(e) => setNuevoCliente((actual) => ({ ...actual, apellido_materno: e.target.value }))} />
            </label>
            <label className="form-field">
              <span>Teléfono</span>
              <input value={nuevoCliente.telefono} onChange={(e) => setNuevoCliente((actual) => ({ ...actual, telefono: e.target.value }))} />
            </label>
            <label className="form-field">
              <span>Correo</span>
              <input type="email" value={nuevoCliente.email} onChange={(e) => setNuevoCliente((actual) => ({ ...actual, email: e.target.value }))} />
            </label>
            <label className="form-field">
              <span>Contraseña</span>
              <input type="password" value={nuevoCliente.contrasena} onChange={(e) => setNuevoCliente((actual) => ({ ...actual, contrasena: e.target.value }))} />
            </label>
            <label className="form-field">
              <span>Estado</span>
              <input value={nuevoCliente.estado} onChange={(e) => setNuevoCliente((actual) => ({ ...actual, estado: e.target.value }))} />
            </label>
            <label className="form-field">
              <span>Municipio</span>
              <input value={nuevoCliente.municipio} onChange={(e) => setNuevoCliente((actual) => ({ ...actual, municipio: e.target.value }))} />
            </label>
            <label className="form-field">
              <span>Colonia</span>
              <input value={nuevoCliente.colonia} onChange={(e) => setNuevoCliente((actual) => ({ ...actual, colonia: e.target.value }))} />
            </label>
            <label className="form-field">
              <span>CP</span>
              <input value={nuevoCliente.cp} onChange={(e) => setNuevoCliente((actual) => ({ ...actual, cp: e.target.value }))} />
            </label>
            <label className="form-field">
              <span>Calle</span>
              <input value={nuevoCliente.calle} onChange={(e) => setNuevoCliente((actual) => ({ ...actual, calle: e.target.value }))} />
            </label>
            <label className="form-field">
              <span>Número exterior</span>
              <input value={nuevoCliente.num_ext} onChange={(e) => setNuevoCliente((actual) => ({ ...actual, num_ext: e.target.value }))} />
            </label>
            <label className="form-field">
              <span>Número interior</span>
              <input value={nuevoCliente.num_int} onChange={(e) => setNuevoCliente((actual) => ({ ...actual, num_int: e.target.value }))} />
            </label>
            <label className="form-field">
              <span>Estatus</span>
              <select value={nuevoCliente.id_estatus} onChange={(e) => setNuevoCliente((actual) => ({ ...actual, id_estatus: e.target.value }))}>
                {data.catalogos.estatus.map((estatus) => (
                  <option key={estatus.id_estatus} value={estatus.id_estatus}>
                    {estatus.nombre}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {formError ? <p className="form-message form-message-error">{formError}</p> : null}
          {formSuccess ? <p className="form-message form-message-success">{formSuccess}</p> : null}

          <div className="form-actions">
            <button className="inventory-primary-button" type="button" onClick={registrarCliente} disabled={guardando}>
              {guardando ? "Guardando..." : "Guardar cliente"}
            </button>
          </div>
        </section>
      ) : null}

      <section className="panel inventory-panel">
        {accionError ? <p className="form-message form-message-error">{accionError}</p> : null}
        {accionSuccess ? <p className="form-message form-message-success">{accionSuccess}</p> : null}
        {cargandoDetalle ? <p className="form-message">Cargando detalle del cliente...</p> : null}

        {clienteSeleccionado ? (
          <div className="detail-card detail-card-view">
            <div className="detail-card-header">
              <div>
                <p className="detail-section-label">Vista rápida</p>
                <h3>Detalle del cliente</h3>
              </div>
              <button type="button" className="inventory-secondary-button" onClick={() => setClienteSeleccionado(null)}>
                Cerrar
              </button>
            </div>
            <div className="detail-hero">
              <div>
                <p className="detail-eyebrow">Cliente</p>
                <h4>{`${clienteSeleccionado.nombre} ${clienteSeleccionado.apellido_paterno} ${clienteSeleccionado.apellido_materno ?? ""}`.trim()}</h4>
                <p className="detail-subtitle">{clienteSeleccionado.email}</p>
              </div>
              <span className="inventory-status inventory-status-ok">{clienteSeleccionado.estado}</span>
            </div>
            <div className="detail-card-grid">
              <div className="detail-field"><span>Teléfono</span><strong>{clienteSeleccionado.telefono}</strong></div>
              <div className="detail-field"><span>Estado</span><strong>{clienteSeleccionado.direccion.estado}</strong></div>
              <div className="detail-field"><span>Municipio</span><strong>{clienteSeleccionado.direccion.municipio}</strong></div>
              <div className="detail-field"><span>Colonia</span><strong>{clienteSeleccionado.direccion.colonia}</strong></div>
              <div className="detail-field"><span>Calle</span><strong>{clienteSeleccionado.direccion.calle}</strong></div>
              <div className="detail-field"><span>Número</span><strong>{clienteSeleccionado.direccion.num_ext}{clienteSeleccionado.direccion.num_int ? ` Int ${clienteSeleccionado.direccion.num_int}` : ""}</strong></div>
            </div>
          </div>
        ) : null}

        {clienteEditando ? (
          <div className="detail-card detail-card-edit">
            <div className="detail-card-header">
              <div>
                <p className="detail-section-label">Modo edición</p>
                <h3>Editar cliente</h3>
              </div>
              <button type="button" className="inventory-secondary-button" onClick={() => setClienteEditando(null)}>
                Cancelar
              </button>
            </div>
            <div className="detail-edit-main">
              <div className="form-grid">
                <label className="form-field">
                  <span>Nombre</span>
                  <input value={clienteEditable.nombre} onChange={(e) => setClienteEditable((actual) => ({ ...actual, nombre: e.target.value }))} />
                </label>
                <label className="form-field">
                  <span>Apellido paterno</span>
                  <input value={clienteEditable.apellido_paterno} onChange={(e) => setClienteEditable((actual) => ({ ...actual, apellido_paterno: e.target.value }))} />
                </label>
                <label className="form-field">
                  <span>Apellido materno</span>
                  <input value={clienteEditable.apellido_materno} onChange={(e) => setClienteEditable((actual) => ({ ...actual, apellido_materno: e.target.value }))} />
                </label>
                <label className="form-field">
                  <span>Teléfono</span>
                  <input value={clienteEditable.telefono} onChange={(e) => setClienteEditable((actual) => ({ ...actual, telefono: e.target.value }))} />
                </label>
                <label className="form-field">
                  <span>Correo</span>
                  <input value={clienteEditable.email} onChange={(e) => setClienteEditable((actual) => ({ ...actual, email: e.target.value }))} />
                </label>
                <label className="form-field">
                  <span>Nueva contraseña</span>
                  <input type="password" value={clienteEditable.contrasena} onChange={(e) => setClienteEditable((actual) => ({ ...actual, contrasena: e.target.value }))} placeholder="Opcional" />
                </label>
                <label className="form-field">
                  <span>Estado</span>
                  <input value={clienteEditable.estado} onChange={(e) => setClienteEditable((actual) => ({ ...actual, estado: e.target.value }))} />
                </label>
                <label className="form-field">
                  <span>Municipio</span>
                  <input value={clienteEditable.municipio} onChange={(e) => setClienteEditable((actual) => ({ ...actual, municipio: e.target.value }))} />
                </label>
                <label className="form-field">
                  <span>Colonia</span>
                  <input value={clienteEditable.colonia} onChange={(e) => setClienteEditable((actual) => ({ ...actual, colonia: e.target.value }))} />
                </label>
                <label className="form-field">
                  <span>CP</span>
                  <input value={clienteEditable.cp} onChange={(e) => setClienteEditable((actual) => ({ ...actual, cp: e.target.value }))} />
                </label>
                <label className="form-field">
                  <span>Calle</span>
                  <input value={clienteEditable.calle} onChange={(e) => setClienteEditable((actual) => ({ ...actual, calle: e.target.value }))} />
                </label>
                <label className="form-field">
                  <span>Número exterior</span>
                  <input value={clienteEditable.num_ext} onChange={(e) => setClienteEditable((actual) => ({ ...actual, num_ext: e.target.value }))} />
                </label>
                <label className="form-field">
                  <span>Número interior</span>
                  <input value={clienteEditable.num_int} onChange={(e) => setClienteEditable((actual) => ({ ...actual, num_int: e.target.value }))} />
                </label>
                <label className="form-field">
                  <span>Estatus</span>
                  <select value={clienteEditable.id_estatus} onChange={(e) => setClienteEditable((actual) => ({ ...actual, id_estatus: e.target.value }))}>
                    {data.catalogos.estatus.map((estatus) => (
                      <option key={estatus.id_estatus} value={estatus.id_estatus}>
                        {estatus.nombre}
                      </option>
                    ))}
                  </select>
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
          <input type="text" placeholder="Buscar clientes por nombre, correo o teléfono..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
          <select value={estadoSeleccionado} onChange={(e) => setEstadoSeleccionado(e.target.value)}>
            <option value="Todos">Todos los estados</option>
            {[...new Set(data.clientes.map((cliente) => cliente.estado))].map((estado) => (
              <option key={estado} value={estado}>
                {estado}
              </option>
            ))}
          </select>
        </div>

        <div className="inventory-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Correo / Teléfono</th>
                <th>Total comprado</th>
                <th>Última compra</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {clientesFiltrados.map((cliente) => (
                <tr key={cliente.id_usuario}>
                  <td>{cliente.nombre}</td>
                  <td>
                    <div className="customer-contact">
                      <span>{cliente.correo}</span>
                      <span>{cliente.telefono}</span>
                    </div>
                  </td>
                  <td>{formatCurrency(cliente.compras)}</td>
                  <td>{formatDate(cliente.ultima_compra)}</td>
                  <td>
                    <span
                      className={`inventory-status ${
                        cliente.estado === "VIP" ? "customer-status-vip" : cliente.estado === "Inactivo" ? "invoice-status-overdue" : "inventory-status-ok"
                      }`}
                    >
                      {cliente.estado}
                    </span>
                  </td>
                  <td>
                    <div className="customer-actions">
                      <button type="button" className="customer-action-button customer-action-button-view" onClick={() => abrirDetalle(cliente)}>
                        Ver
                      </button>
                      <button type="button" className="customer-action-button customer-action-button-edit" onClick={() => abrirEdicion(cliente)}>
                        Editar
                      </button>
                      <button type="button" className="customer-action-button customer-action-button-delete" onClick={() => eliminarCliente(cliente)}>
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {loading ? <p className="panel">Cargando clientes...</p> : null}
      {error ? <p className="panel">Error al cargar clientes: {error}</p> : null}
    </Layout>
  );
}
