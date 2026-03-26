import Layout from "./layout";
import "../styles/dashboard.css";
import { useApiData } from "../hooks/useApiData";
import { formatCurrency, formatDate } from "../lib/format";

export default function Facturacion() {
  const { data, loading, error } = useApiData("/facturacion", {
    facturas: [] as Array<{
      folio: string;
      cliente: string;
      fecha: string;
      total: number;
      estado: string;
    }>,
  });

  return (
    <Layout>
      <section className="inventory-header">
        <div>
          <h1>Facturación</h1>
          <p>Consulta el estado de las facturas, revisa pagos y descarga comprobantes.</p>
        </div>
      </section>

      <section className="panel inventory-panel">
        <div className="inventory-filters">
          <input type="text" placeholder="Buscar facturas..." />
          <select defaultValue="Todos">
            <option>Todos los clientes</option>
            <option>Cliente A</option>
            <option>Cliente B</option>
            <option>Cliente C</option>
          </select>
          <select defaultValue="Todos">
            <option>Todos los estados</option>
            <option>Pagada</option>
            <option>Pendiente</option>
            <option>Vencida</option>
          </select>
          <button type="button" className="inventory-secondary-button">
            Más filtros
          </button>
        </div>

        <div className="inventory-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Folio</th>
                <th>Cliente</th>
                <th>Fecha</th>
                <th>Total</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {data.facturas.map((factura) => (
                <tr key={factura.folio}>
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
                      <button type="button" className="customer-action-button">Ver</button>
                      <button type="button" className="customer-action-button">Descargar</button>
                      <button type="button" className="customer-action-button">Imprimir</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {loading ? <p className="panel">Cargando facturacion...</p> : null}
      {error ? <p className="panel">Error al cargar facturacion: {error}</p> : null}
    </Layout>
  );
}
