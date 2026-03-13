import Layout from "./layout";
import "../styles/dashboard.css";

export default function Facturacion() {
  const facturas = [
    { folio: "FAC-001", cliente: "Cliente A", fecha: "2026-02-18", total: "$250.00", estado: "Pagada" },
    { folio: "FAC-002", cliente: "Cliente B", fecha: "2026-02-17", total: "$1,200.00", estado: "Pendiente" },
    { folio: "FAC-003", cliente: "Cliente C", fecha: "2026-02-15", total: "$450.00", estado: "Vencida" },
    { folio: "FAC-004", cliente: "Cliente A", fecha: "2026-02-14", total: "$180.00", estado: "Pagada" },
  ];

  return (
    <Layout>
      <header className="topbar">
        <div className="topbar-search">
          <input type="text" placeholder="Buscar en facturación..." />
        </div>

        <div className="topbar-actions">
          <button className="icon-button" type="button">🔔</button>
          <select className="user-select" defaultValue={localStorage.getItem("rolUsuario") || "Administrador"}>
            <option>Administrador</option>
            <option>Vendedor</option>
            <option>Comprador</option>
          </select>
        </div>
      </header>

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
              {facturas.map((factura) => (
                <tr key={factura.folio}>
                  <td>{factura.folio}</td>
                  <td>{factura.cliente}</td>
                  <td>{factura.fecha}</td>
                  <td>{factura.total}</td>
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
    </Layout>
  );
}
