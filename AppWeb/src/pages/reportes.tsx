import Layout from "./layout";
import "../styles/dashboard.css";

export default function Reportes() {
  return (
    <Layout>
      <header className="topbar">
        <div className="topbar-search">
          <input type="text" placeholder="Buscar en reportes..." />
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
          <h1>Reportes y analítica</h1>
          <p>Analiza ventas, costos, utilidad y facturas pendientes en el periodo seleccionado.</p>
        </div>
      </section>

      <section className="panel reports-filter-panel">
        <div className="reports-filters">
          <label htmlFor="fecha-inicio">Rango de fechas:</label>
          <input id="fecha-inicio" type="date" defaultValue="2026-02-01" />
          <span>a</span>
          <input id="fecha-fin" type="date" defaultValue="2026-02-29" />
          <button type="button" className="inventory-primary-button">
            Aplicar
          </button>
        </div>
      </section>

      <section className="stats-grid reports-stats-grid">
        <div className="stat-card">
          <div className="stat-title-row">
            <span>Ventas totales</span>
            <span>$</span>
          </div>
          <h3>$45,280</h3>
          <small>+12.5% respecto al periodo anterior</small>
        </div>

        <div className="stat-card">
          <div className="stat-title-row">
            <span>Costos totales</span>
            <span>⌁</span>
          </div>
          <h3>$28,150</h3>
          <small>+8.2% respecto al periodo anterior</small>
        </div>

        <div className="stat-card">
          <div className="stat-title-row">
            <span>Utilidad bruta</span>
            <span>↗</span>
          </div>
          <h3>$17,130</h3>
          <small>+18.7% respecto al periodo anterior</small>
        </div>

        <div className="stat-card">
          <div className="stat-title-row">
            <span>Utilidad neta</span>
            <span>↗</span>
          </div>
          <h3>$15,220</h3>
          <small>+21.3% respecto al periodo anterior</small>
        </div>

        <div className="stat-card">
          <div className="stat-title-row">
            <span>Facturas pendientes</span>
            <span>🧾</span>
          </div>
          <h3>$3,450</h3>
          <small>12 facturas por cobrar</small>
        </div>
      </section>

      <section className="panel reports-chart-panel">
        <div className="reports-chart-header">
          <h4>Utilidad a lo largo del tiempo</h4>
          <button type="button" className="inventory-secondary-button">
            Exportar
          </button>
        </div>
        <div className="chart-placeholder reports-chart-placeholder">
          Espacio para gráfica de tendencia de utilidad
        </div>
      </section>
    </Layout>
  );
}
