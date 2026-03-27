import { useState } from "react";
import Layout from "./layout";
import "../styles/dashboard.css";
import { useApiData } from "../hooks/useApiData";
import { formatCurrency, formatDate } from "../lib/format";
import { deleteApi, fetchApi } from "../lib/api";
import { downloadInvoicePdf } from "../lib/pdf";

type FacturaListado = {
  id_comprobante: number;
  id_venta: number;
  registro_venta: string;
  folio: string;
  cliente: string;
  fecha: string;
  total: number;
  estado: string;
};

type FacturaDetalle = FacturaListado & {
  detalles: Array<{
    producto_id: number;
    producto: string;
    cantidad: number;
    precio_unitario: number;
    subtotal: number;
  }>;
};

export default function Facturacion() {
  const [busqueda, setBusqueda] = useState("");
  const [clienteSeleccionado, setClienteSeleccionado] = useState("Todos");
  const [estadoSeleccionado, setEstadoSeleccionado] = useState("Todos");
  const [facturaSeleccionada, setFacturaSeleccionada] = useState<FacturaDetalle | null>(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [descargandoId, setDescargandoId] = useState<number | null>(null);
  const [eliminandoId, setEliminandoId] = useState<number | null>(null);
  const [accionError, setAccionError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const { data, loading, error } = useApiData(`/facturacion?refresh=${reloadKey}`, {
    facturas: [] as FacturaListado[],
  });

  const facturasFiltradas = data.facturas.filter((factura) => {
    const query = busqueda.trim().toLowerCase();
    const coincideBusqueda =
      factura.folio.toLowerCase().includes(query) ||
      factura.cliente.toLowerCase().includes(query) ||
      factura.registro_venta.toLowerCase().includes(query);
    const coincideCliente = clienteSeleccionado === "Todos" || factura.cliente === clienteSeleccionado;
    const coincideEstado = estadoSeleccionado === "Todos" || factura.estado === estadoSeleccionado;

    return coincideBusqueda && coincideCliente && coincideEstado;
  });

  const cargarDetalleFactura = async (idComprobante: number) => {
    setCargandoDetalle(true);
    setAccionError(null);

    try {
      const response = await fetchApi<{ factura: FacturaDetalle }>(`/v1/facturacion/${idComprobante}`);
      return response.factura;
    } catch (submitError) {
      setAccionError(submitError instanceof Error ? submitError.message : "No fue posible consultar la factura.");
      return null;
    } finally {
      setCargandoDetalle(false);
    }
  };

  const abrirDetalle = async (factura: FacturaListado) => {
    const detalle = await cargarDetalleFactura(factura.id_comprobante);

    if (!detalle) {
      return;
    }

    setFacturaSeleccionada(detalle);
  };

  const descargarFactura = async (factura: FacturaListado) => {
    setDescargandoId(factura.id_comprobante);
    setAccionError(null);

    try {
      const detalle = await cargarDetalleFactura(factura.id_comprobante);

      if (!detalle) {
        return;
      }

      downloadInvoicePdf(detalle);
    } finally {
      setDescargandoId(null);
    }
  };

  const eliminarFactura = async (factura: FacturaListado) => {
    const confirmado = window.confirm(`¿Deseas eliminar la factura ${factura.folio} del registro ${factura.registro_venta}?`);

    if (!confirmado) {
      return;
    }

    setEliminandoId(factura.id_comprobante);
    setAccionError(null);

    try {
      await deleteApi(`/v1/facturacion/${factura.id_comprobante}`);

      if (facturaSeleccionada?.id_comprobante === factura.id_comprobante) {
        setFacturaSeleccionada(null);
      }

      setReloadKey((actual) => actual + 1);
    } catch (submitError) {
      setAccionError(submitError instanceof Error ? submitError.message : "No fue posible eliminar la factura.");
    } finally {
      setEliminandoId(null);
    }
  };

  return (
    <Layout>
      <section className="inventory-header">
        <div>
          <h1>Facturacion</h1>
          <p>Consulta el registro de ventas facturadas, revisa sus conceptos, exporta comprobantes y elimina registros cuando sea necesario.</p>
        </div>
      </section>

      <section className="panel inventory-panel">
        {accionError ? <p className="form-message form-message-error">{accionError}</p> : null}
        {cargandoDetalle ? <p className="form-message">Cargando detalle de la factura...</p> : null}

        {facturaSeleccionada ? (
          <div className="detail-card detail-card-view">
            <div className="detail-card-header">
              <div>
                <p className="detail-section-label">Vista rapida</p>
                <h3>Detalle de factura</h3>
              </div>
              <button type="button" className="inventory-secondary-button" onClick={() => setFacturaSeleccionada(null)}>
                Cerrar
              </button>
            </div>
            <div className="detail-hero">
              <div>
                <p className="detail-eyebrow">Factura</p>
                <h4>{facturaSeleccionada.folio}</h4>
                <p className="detail-subtitle">{facturaSeleccionada.cliente} · {facturaSeleccionada.registro_venta}</p>
              </div>
              <span
                className={`inventory-status ${
                  facturaSeleccionada.estado === "Pagada"
                    ? "inventory-status-ok"
                    : facturaSeleccionada.estado === "Pendiente"
                      ? "inventory-status-low"
                      : "invoice-status-overdue"
                }`}
              >
                {facturaSeleccionada.estado}
              </span>
            </div>
            <div className="detail-summary-grid">
              <div className="detail-summary-card">
                <span>Fecha</span>
                <strong>{formatDate(facturaSeleccionada.fecha)}</strong>
              </div>
              <div className="detail-summary-card">
                <span>Registro de venta</span>
                <strong>{facturaSeleccionada.registro_venta}</strong>
              </div>
              <div className="detail-summary-card">
                <span>Total</span>
                <strong>{formatCurrency(facturaSeleccionada.total)}</strong>
              </div>
              <div className="detail-summary-card">
                <span>Conceptos</span>
                <strong>{facturaSeleccionada.detalles.length}</strong>
              </div>
            </div>
            <div className="inventory-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Cantidad</th>
                    <th>Precio unitario</th>
                    <th>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {facturaSeleccionada.detalles.map((detalle) => (
                    <tr key={`${facturaSeleccionada.id_comprobante}-${detalle.producto_id}`}>
                      <td>{detalle.producto}</td>
                      <td>{detalle.cantidad}</td>
                      <td>{formatCurrency(detalle.precio_unitario)}</td>
                      <td>{formatCurrency(detalle.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        <div className="inventory-filters">
          <input type="text" placeholder="Buscar por registro, folio o cliente..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
          <select value={clienteSeleccionado} onChange={(e) => setClienteSeleccionado(e.target.value)}>
            <option value="Todos">Todos los clientes</option>
            {[...new Set(data.facturas.map((factura) => factura.cliente))].map((cliente) => (
              <option key={cliente} value={cliente}>
                {cliente}
              </option>
            ))}
          </select>
          <select value={estadoSeleccionado} onChange={(e) => setEstadoSeleccionado(e.target.value)}>
            <option value="Todos">Todos los estados</option>
            {[...new Set(data.facturas.map((factura) => factura.estado))].map((estado) => (
              <option key={estado} value={estado}>
                {estado}
              </option>
            ))}
          </select>
          <button type="button" className="inventory-secondary-button" onClick={() => {
            setBusqueda("");
            setClienteSeleccionado("Todos");
            setEstadoSeleccionado("Todos");
          }}>
            Limpiar
          </button>
        </div>

        <div className="inventory-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Registro</th>
                <th>Folio</th>
                <th>Cliente</th>
                <th>Fecha</th>
                <th>Total</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {facturasFiltradas.map((factura) => (
                <tr key={factura.id_comprobante}>
                  <td>{factura.registro_venta}</td>
                  <td>{factura.folio}</td>
                  <td>{factura.cliente}</td>
                  <td>{formatDate(factura.fecha)}</td>
                  <td>{formatCurrency(factura.total)}</td>
                  <td>
                    <span
                      className={`inventory-status ${
                        factura.estado === "Pagada"
                          ? "inventory-status-ok"
                          : factura.estado === "Pendiente"
                            ? "inventory-status-low"
                            : "invoice-status-overdue"
                      }`}
                    >
                      {factura.estado}
                    </span>
                  </td>
                  <td>
                    <div className="customer-actions">
                      <button type="button" className="customer-action-button customer-action-button-view" onClick={() => abrirDetalle(factura)}>
                        Ver
                      </button>
                      <button
                        type="button"
                        className="customer-action-button customer-action-button-edit"
                        onClick={() => descargarFactura(factura)}
                        disabled={descargandoId === factura.id_comprobante}
                      >
                        {descargandoId === factura.id_comprobante ? "Exportando..." : "Exportar"}
                      </button>
                      <button
                        type="button"
                        className="customer-action-button customer-action-button-delete"
                        onClick={() => eliminarFactura(factura)}
                        disabled={eliminandoId === factura.id_comprobante}
                      >
                        {eliminandoId === factura.id_comprobante ? "Eliminando..." : "Eliminar"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && facturasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={7}>No se encontraron facturas con los filtros actuales.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      {loading ? <p className="panel">Cargando facturacion...</p> : null}
      {error ? <p className="panel">Error al cargar facturacion: {error}</p> : null}
    </Layout>
  );
}
