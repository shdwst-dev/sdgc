import { useState } from "react";
import Layout from "./layout";
import "../styles/dashboard.css";
import { useApiData } from "../hooks/useApiData";
import { formatCurrency, formatDate } from "../lib/format";
import { deleteApi, fetchApi } from "../lib/api";
import { downloadInvoicePdf } from "../lib/pdf";
import logoPi from "../assets/LogoPI.png";

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

const CFDI_VERSION = "4.0";
const LUGAR_EXPEDICION = "86000";
const REGIMEN_FISCAL = "601 - General de Ley Personas Morales";
const FORMA_PAGO = "99 - Por definir";
const METODO_PAGO = "PPD - Pago en parcialidades o diferido";
const USO_CFDI = "S01 - Sin efectos fiscales";
const QR_SIZE = 21;
const ISSUER_NAME = "PI GESTION (SDGC)";
const ISSUER_RFC = "AAA010101AAA";
const ISSUER_ADDRESS = "Domicilio fiscal generico del proyecto, Villahermosa, Tabasco, Mexico C.P. 86000";
const ISSUER_PHONE = "No disponible";
const ISSUER_EMAIL = "soporte@pigestion.local";

function formatInvoiceDateTime(value: string) {
  if (!value) {
    return "Sin registro";
  }

  const normalizedValue = value.includes("T")
    ? value
    : value.includes(" ")
      ? value.replace(" ", "T")
      : `${value}T00:00:00`;

  const parsedDate = new Date(normalizedValue);

  if (Number.isNaN(parsedDate.getTime())) {
    return "Fecha invalida";
  }

  return new Intl.DateTimeFormat("es-MX", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsedDate);
}

function createQrMatrix(seed: string, size = QR_SIZE) {
  const matrix = Array.from({ length: size }, () => Array.from({ length: size }, () => false));

  const paintFinder = (startRow: number, startColumn: number) => {
    for (let row = 0; row < 7; row += 1) {
      for (let column = 0; column < 7; column += 1) {
        const isBorder = row === 0 || row === 6 || column === 0 || column === 6;
        const isCore = row >= 2 && row <= 4 && column >= 2 && column <= 4;
        matrix[startRow + row][startColumn + column] = isBorder || isCore;
      }
    }
  };

  paintFinder(0, 0);
  paintFinder(0, size - 7);
  paintFinder(size - 7, 0);

  let hash = 0;
  const normalizedSeed = seed || "FACTURA";

  for (let index = 0; index < normalizedSeed.length; index += 1) {
    hash = ((hash << 5) - hash + normalizedSeed.charCodeAt(index)) >>> 0;
  }

  for (let row = 0; row < size; row += 1) {
    for (let column = 0; column < size; column += 1) {
      const inFinderZone =
        (row < 7 && column < 7) ||
        (row < 7 && column >= size - 7) ||
        (row >= size - 7 && column < 7);

      if (inFinderZone) {
        continue;
      }

      hash = (hash * 1664525 + 1013904223) >>> 0;
      matrix[row][column] = ((hash >> 28) & 1) === 1;
    }
  }

  return matrix;
}

function getReceiverName(cliente: string) {
  return cliente === "Venta mostrador" ? "PUBLICO EN GENERAL" : cliente;
}

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

  const subtotalFactura = facturaSeleccionada
    ? facturaSeleccionada.detalles.reduce((acumulado, detalle) => acumulado + detalle.subtotal, 0)
    : 0;
  const qrMatrix = facturaSeleccionada
    ? createQrMatrix(`${facturaSeleccionada.folio}${facturaSeleccionada.fecha}${facturaSeleccionada.total}`)
    : [];

  return (
    <Layout>
      <section className="inventory-header">
        <div>
          <h1>Facturación</h1>
          <p>Consulta el registro de ventas facturadas, revisa sus conceptos, exporta comprobantes y elimina registros cuando sea necesario.</p>
        </div>
      </section>

      <section className="panel inventory-panel">
        {accionError ? <p className="form-message form-message-error">{accionError}</p> : null}
        {cargandoDetalle ? <p className="form-message">Cargando detalle de la factura...</p> : null}

        {facturaSeleccionada ? (
          <div className="detail-card detail-card-view invoice-preview-shell">
            <div className="detail-card-header">
              <div>
                <p className="detail-section-label">Vista previa</p>
                <h3>Factura generada</h3>
              </div>
              <button type="button" className="inventory-secondary-button" onClick={() => setFacturaSeleccionada(null)}>
                Cerrar
              </button>
            </div>
            <div className="invoice-preview-page">
              <div className="invoice-preview-band">FACTURA ELECTRÓNICA {CFDI_VERSION} (CFDI)</div>

              <div className="invoice-preview-top">
                <div className="invoice-preview-brand">
                  <img src={logoPi} alt="PI Gestión" className="invoice-preview-logo" />
                    <div>
                    <h4>{ISSUER_NAME}</h4>
                    <p>RFC: {ISSUER_RFC}</p>
                    <p>{ISSUER_ADDRESS}</p>
                    <p>Tel: {ISSUER_PHONE}</p>
                    <p>E-mail: {ISSUER_EMAIL}</p>
                  </div>
                </div>
                <div className="invoice-preview-folio">
                  <p>FACTURA:</p>
                  <strong>{facturaSeleccionada.folio}</strong>
                  <span>{facturaSeleccionada.registro_venta}</span>
                  <small>Fecha y hora de emisión:</small>
                  <small>{formatInvoiceDateTime(facturaSeleccionada.fecha)}</small>
                </div>
              </div>

              <div className="invoice-preview-meta">
                <div>
                  <span>LUGAR DE EXPEDICIÓN:</span>
                  <strong>{LUGAR_EXPEDICION}</strong>
                </div>
                <div>
                  <span>TIPO DE COMPROBANTE:</span>
                  <strong>I - Ingreso</strong>
                </div>
                <div>
                  <span>ESTADO:</span>
                  <strong>{facturaSeleccionada.estado}</strong>
                </div>
              </div>

              <div className="invoice-preview-parties">
                <div className="invoice-preview-party-block">
                  <p className="invoice-preview-section-title">Receptor</p>
                  <div className="invoice-preview-party-grid">
                    <span>Cliente:</span>
                    <strong>{getReceiverName(facturaSeleccionada.cliente)}</strong>
                    <span>RFC:</span>
                    <strong>XAXX010101000</strong>
                    <span>Dirección:</span>
                    <strong>Datos no disponibles en el sistema actual.</strong>
                    <span>Uso CFDI:</span>
                    <strong>{USO_CFDI}</strong>
                  </div>
                </div>
              </div>

              <div className="invoice-preview-table-wrap">
                <table className="invoice-preview-table">
                  <thead>
                    <tr>
                      <th>Cantidad</th>
                      <th>Unidad</th>
                      <th>Clave</th>
                      <th>Descripción</th>
                      <th>P. unitario</th>
                      <th>Importe</th>
                    </tr>
                  </thead>
                  <tbody>
                    {facturaSeleccionada.detalles.map((detalle) => (
                      <tr key={`${facturaSeleccionada.id_comprobante}-${detalle.producto_id}`}>
                        <td>{detalle.cantidad.toFixed(2)}</td>
                        <td>Pieza</td>
                        <td>H87</td>
                        <td>{detalle.producto}</td>
                        <td>{formatCurrency(detalle.precio_unitario)}</td>
                        <td>{formatCurrency(detalle.subtotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="invoice-preview-footer">
                <div className="invoice-preview-notes">
                  <div className="invoice-preview-qr-section">
                    <div className="invoice-preview-qr" aria-label="Código QR de factura">
                      {qrMatrix.flatMap((row, rowIndex) =>
                        row.map((cell, columnIndex) => (
                          <span
                            key={`${rowIndex}-${columnIndex}`}
                            className={`invoice-preview-qr-cell${cell ? " is-filled" : ""}`}
                          />
                        )),
                      )}
                    </div>
                  </div>
                  <div className="invoice-preview-note-grid">
                    <span>Forma de pago:</span>
                    <strong>{FORMA_PAGO}</strong>
                    <span>Régimen fiscal:</span>
                    <strong>{REGIMEN_FISCAL}</strong>
                    <span>Moneda:</span>
                    <strong>MXN - Peso Mexicano</strong>
                    <span>Método de pago:</span>
                    <strong>{METODO_PAGO}</strong>
                  </div>
                  <p className="invoice-preview-legend">
                    Esta vista es una representación visual del CFDI con los datos actualmente disponibles en el módulo.
                  </p>
                </div>

                <div className="invoice-preview-totals">
                  <div>
                    <span>Subtotal</span>
                    <strong>{formatCurrency(subtotalFactura)}</strong>
                  </div>
                  <div>
                    <span>IVA</span>
                    <strong>No desglosado</strong>
                  </div>
                  <div className="invoice-preview-total-row">
                    <span>Total</span>
                    <strong>{formatCurrency(facturaSeleccionada.total)}</strong>
                  </div>
                </div>
              </div>

              <div className="invoice-preview-stamps">
                <p className="invoice-preview-section-title">Sello digital del CFDI</p>
                <p>
                  {facturaSeleccionada.folio} | {facturaSeleccionada.registro_venta} | {facturaSeleccionada.estado} | {formatInvoiceDateTime(facturaSeleccionada.fecha)}
                </p>
                <p className="invoice-preview-section-title">Cadena original del complemento</p>
                <p>||{CFDI_VERSION}|{facturaSeleccionada.folio}|{facturaSeleccionada.registro_venta}|{facturaSeleccionada.total.toFixed(2)}|MXN||</p>
              </div>

              <div className="invoice-preview-bottom">
                <span>No de serie del certificado del SAT: 00001000000500000000</span>
                <span>Fecha y hora de certificación: {formatInvoiceDateTime(facturaSeleccionada.fecha)}</span>
              </div>
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

      {loading ? <p className="panel">Cargando facturación...</p> : null}
      {error ? <p className="panel">Error al cargar facturación: {error}</p> : null}
    </Layout>
  );
}
