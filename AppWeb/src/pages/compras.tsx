import Layout from "./layout";
import "../styles/dashboard.css";

export default function Compras() {
  const ordenes = [
    {
      folio: "OC-001",
      proveedor: "Proveedor A",
      fecha: "2026-02-15",
      total: "$500.00",
      estado: "Ordenada",
    },
    {
      folio: "OC-002",
      proveedor: "Proveedor B",
      fecha: "2026-02-14",
      total: "$1,200.00",
      estado: "Recibida",
    },
    {
      folio: "OC-003",
      proveedor: "Proveedor C",
      fecha: "2026-02-10",
      total: "$350.00",
      estado: "Borrador",
    },
  ];

  return (
    <Layout>
      <header className="topbar">
        <div className="topbar-search">
          <input type="text" placeholder="Buscar en compras..." />
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
          <h1>Compras</h1>
          <p>Da seguimiento a órdenes de compra, proveedores y recepciones de mercancía.</p>
        </div>
        <button className="inventory-primary-button" type="button">
          Crear orden de compra
        </button>
      </section>

      <section className="stats-grid">
        <div className="stat-card">
          <div className="stat-title-row">
            <span>Órdenes del mes</span>
            <span>🧾</span>
          </div>
          <h3>28</h3>
        </div>

        <div className="stat-card">
          <div className="stat-title-row">
            <span>Por recibir</span>
            <span>⏳</span>
          </div>
          <h3>7</h3>
        </div>

        <div className="stat-card">
          <div className="stat-title-row">
            <span>Gasto acumulado</span>
            <span>$</span>
          </div>
          <h3>$24,800</h3>
        </div>

        <div className="stat-card">
          <div className="stat-title-row">
            <span>Proveedores activos</span>
            <span>🏢</span>
          </div>
          <h3>14</h3>
        </div>
      </section>

      <section className="panel inventory-panel">
        <div className="inventory-filters">
          <input type="text" placeholder="Buscar órdenes de compra..." />
          <select defaultValue="Todos">
            <option>Todos los proveedores</option>
            <option>Proveedor A</option>
            <option>Proveedor B</option>
            <option>Proveedor C</option>
          </select>
          <select defaultValue="Todos">
            <option>Todos los estados</option>
            <option>Ordenada</option>
            <option>Recibida</option>
            <option>Borrador</option>
          </select>
          <button type="button" className="inventory-secondary-button">
            Filtrar
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
              {ordenes.map((orden) => (
                <tr key={orden.folio}>
                  <td>{orden.folio}</td>
                  <td>{orden.proveedor}</td>
                  <td>{orden.fecha}</td>
                  <td>{orden.total}</td>
                  <td>
                    <span
                      className={`inventory-status ${
                        orden.estado === "Recibida"
                          ? "inventory-status-ok"
                          : orden.estado === "Ordenada"
                            ? "inventory-status-low"
                            : ""
                      }`}
                    >
                      {orden.estado}
                    </span>
                  </td>
                  <td>
                    <button type="button" className="inventory-secondary-button inventory-table-button">
                      Recibir mercancía
                    </button>
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
