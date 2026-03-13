import Layout from "./layout";
import "../styles/dashboard.css";

export default function Inventario() {
  const productos = [
    {
      sku: "SKU-001",
      producto: "Cereal integral",
      categoria: "Abarrotes",
      stock: 50,
      minimo: 20,
      costo: "$10.00",
      precio: "$15.00",
      estado: "Disponible",
    },
    {
      sku: "SKU-002",
      producto: "Café molido",
      categoria: "Bebidas",
      stock: 5,
      minimo: 10,
      costo: "$20.00",
      precio: "$30.00",
      estado: "Stock bajo",
    },
    {
      sku: "SKU-003",
      producto: "Jabón líquido",
      categoria: "Limpieza",
      stock: 100,
      minimo: 15,
      costo: "$5.00",
      precio: "$8.00",
      estado: "Disponible",
    },
  ];

  return (
    <Layout>
      <header className="topbar">
        <div className="topbar-search">
          <input type="text" placeholder="Buscar en inventario..." />
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
          <h1>Catálogo de productos</h1>
          <p>Administra existencias, categorías y niveles mínimos desde un solo lugar.</p>
        </div>
        <button className="inventory-primary-button" type="button">
          Nuevo producto
        </button>
      </section>

      <section className="stats-grid">
        <div className="stat-card">
          <div className="stat-title-row">
            <span>Productos activos</span>
            <span>📦</span>
          </div>
          <h3>320</h3>
        </div>

        <div className="stat-card">
          <div className="stat-title-row">
            <span>Stock total</span>
            <span>≡</span>
          </div>
          <h3>8,450</h3>
        </div>

        <div className="stat-card">
          <div className="stat-title-row">
            <span>Alertas activas</span>
            <span>!</span>
          </div>
          <h3>12</h3>
        </div>

        <div className="stat-card">
          <div className="stat-title-row">
            <span>Valor del inventario</span>
            <span>$</span>
          </div>
          <h3>$48,900</h3>
        </div>
      </section>

      <section className="panel inventory-panel">
        <div className="inventory-filters">
          <input type="text" placeholder="Buscar productos..." />
          <select defaultValue="Todas">
            <option>Todas las categorías</option>
            <option>Abarrotes</option>
            <option>Bebidas</option>
            <option>Limpieza</option>
          </select>
          <select defaultValue="Todos">
            <option>Todos los estados</option>
            <option>Disponible</option>
            <option>Stock bajo</option>
            <option>Sin stock</option>
          </select>
          <button type="button" className="inventory-secondary-button">
            Más filtros
          </button>
        </div>

        <div className="inventory-table-wrap">
          <table>
            <thead>
              <tr>
                <th>SKU</th>
                <th>Producto</th>
                <th>Categoría</th>
                <th>Existencia</th>
                <th>Mínimo</th>
                <th>Costo</th>
                <th>Precio</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {productos.map((producto) => (
                <tr key={producto.sku}>
                  <td>{producto.sku}</td>
                  <td>{producto.producto}</td>
                  <td>{producto.categoria}</td>
                  <td>{producto.stock}</td>
                  <td>{producto.minimo}</td>
                  <td>{producto.costo}</td>
                  <td>{producto.precio}</td>
                  <td>
                    <span
                      className={`inventory-status ${
                        producto.estado === "Stock bajo" ? "inventory-status-low" : "inventory-status-ok"
                      }`}
                    >
                      {producto.estado}
                    </span>
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
