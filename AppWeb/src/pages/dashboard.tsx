import Layout from "./layout";
import "../styles/dashboard.css";

export default function Dashboard() {
  const ventasRecientes = [
    { factura: "FAC-001", cliente: "Cliente A", monto: "$000", fecha: "2026-02-18" },
    { factura: "FAC-002", cliente: "Cliente B", monto: "$000", fecha: "2026-02-18" },
    { factura: "FAC-003", cliente: "Cliente C", monto: "$000", fecha: "2026-02-17" },
    { factura: "FAC-004", cliente: "Cliente D", monto: "$000", fecha: "2026-02-17" },
  ];

  const alertasStock = [
    { sku: "SKU-001", producto: "Producto A", actual: 5, minimo: 20 },
    { sku: "SKU-002", producto: "Producto B", actual: 2, minimo: 10 },
    { sku: "SKU-003", producto: "Producto C", actual: 8, minimo: 15 },
  ];

  return (
    <Layout>
      <header className="topbar">
        <div className="topbar-search">
          <input type="text" placeholder="Búsqueda global..." />
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

      <section className="stats-grid">
        <div className="stat-card">
          <div className="stat-title-row">
            <span>Ingresos (Hoy)</span>
            <span>$</span>
          </div>
          <h3>$0,000</h3>
        </div>

        <div className="stat-card">
          <div className="stat-title-row">
            <span>Ingresos (Mes)</span>
            <span>↗</span>
          </div>
          <h3>$00,000</h3>
        </div>

        <div className="stat-card">
          <div className="stat-title-row">
            <span>Gastos (Mes)</span>
            <span>⌁</span>
          </div>
          <h3>$00,000</h3>
        </div>

        <div className="stat-card">
          <div className="stat-title-row">
            <span>Ganancia (Mes)</span>
            <span>▣</span>
          </div>
          <h3>$00,000</h3>
        </div>
      </section>

      <section className="charts-grid">
        <div className="panel large-panel">
          <h4>Ingresos vs Gastos</h4>
          <div className="chart-placeholder">Espacio para gráfica de líneas</div>
        </div>

        <div className="panel small-panel">
          <h4>Productos más vendidos</h4>
          <div className="chart-placeholder">Espacio para gráfica de barras</div>
        </div>
      </section>

      <section className="tables-grid">
        <div className="panel">
          <h4>Ventas recientes</h4>
          <table>
            <thead>
              <tr>
                <th>Factura</th>
                <th>Cliente</th>
                <th>Monto</th>
                <th>Fecha</th>
              </tr>
            </thead>
            <tbody>
              {ventasRecientes.map((venta) => (
                <tr key={venta.factura}>
                  <td>{venta.factura}</td>
                  <td>{venta.cliente}</td>
                  <td>{venta.monto}</td>
                  <td>{venta.fecha}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="panel">
          <h4>Alertas de bajo stock</h4>
          <table>
            <thead>
              <tr>
                <th>SKU</th>
                <th>Producto</th>
                <th>Actual</th>
                <th>Mínimo</th>
              </tr>
            </thead>
            <tbody>
              {alertasStock.map((item) => (
                <tr key={item.sku}>
                  <td>{item.sku}</td>
                  <td>{item.producto}</td>
                  <td>{item.actual}</td>
                  <td>{item.minimo}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </Layout>
  );
}