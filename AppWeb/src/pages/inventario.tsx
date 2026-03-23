import { useState } from "react";
import Layout from "./layout";
import "../styles/dashboard.css";
import { useApiData } from "../hooks/useApiData";
import { formatCurrency } from "../lib/format";

export default function Inventario() {
  const [busqueda, setBusqueda] = useState("");
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState("Todas");
  const [estadoSeleccionado, setEstadoSeleccionado] = useState("Todos");
  const { data, loading, error } = useApiData("/inventario", {
    metricas: {
      productos_activos: 0,
      stock_total: 0,
      alertas_activas: 0,
      valor_inventario: 0,
    },
    categorias: [] as string[],
    productos: [] as Array<{
      sku: string;
      producto: string;
      categoria: string;
      stock: number;
      minimo: number;
      costo: number;
      precio: number;
      estado: string;
    }>,
  });

  const productosFiltrados = data.productos.filter((producto) => {
    const coincideBusqueda =
      producto.producto.toLowerCase().includes(busqueda.toLowerCase()) ||
      producto.sku.toLowerCase().includes(busqueda.toLowerCase());
    const coincideCategoria =
      categoriaSeleccionada === "Todas" || producto.categoria === categoriaSeleccionada;
    const coincideEstado =
      estadoSeleccionado === "Todos" || producto.estado === estadoSeleccionado;

    return coincideBusqueda && coincideCategoria && coincideEstado;
  });

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
          <h3>{data.metricas.productos_activos}</h3>
        </div>

        <div className="stat-card">
          <div className="stat-title-row">
            <span>Stock total</span>
            <span>≡</span>
          </div>
          <h3>{data.metricas.stock_total}</h3>
        </div>

        <div className="stat-card">
          <div className="stat-title-row">
            <span>Alertas activas</span>
            <span>!</span>
          </div>
          <h3>{data.metricas.alertas_activas}</h3>
        </div>

        <div className="stat-card">
          <div className="stat-title-row">
            <span>Valor del inventario</span>
            <span>$</span>
          </div>
          <h3>{formatCurrency(data.metricas.valor_inventario)}</h3>
        </div>
      </section>

      <section className="panel inventory-panel">
        <div className="inventory-filters">
          <input type="text" placeholder="Buscar productos..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
          <select value={categoriaSeleccionada} onChange={(e) => setCategoriaSeleccionada(e.target.value)}>
            <option value="Todas">Todas las categorías</option>
            {data.categorias.map((categoria) => (
              <option key={categoria} value={categoria}>
                {categoria}
              </option>
            ))}
          </select>
          <select value={estadoSeleccionado} onChange={(e) => setEstadoSeleccionado(e.target.value)}>
            <option value="Todos">Todos los estados</option>
            <option value="Disponible">Disponible</option>
            <option value="Stock bajo">Stock bajo</option>
            <option value="Sin stock">Sin stock</option>
          </select>
          <button type="button" className="inventory-secondary-button">
            {productosFiltrados.length} resultados
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
              {productosFiltrados.map((producto) => (
                <tr key={producto.sku}>
                  <td>{producto.sku}</td>
                  <td>{producto.producto}</td>
                  <td>{producto.categoria}</td>
                  <td>{producto.stock}</td>
                  <td>{producto.minimo}</td>
                  <td>{formatCurrency(producto.costo)}</td>
                  <td>{formatCurrency(producto.precio)}</td>
                  <td>
                    <span
                      className={`inventory-status ${
                        producto.estado === "Stock bajo"
                          ? "inventory-status-low"
                          : producto.estado === "Sin stock"
                            ? "invoice-status-overdue"
                            : "inventory-status-ok"
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

      {loading ? <p className="panel">Cargando inventario...</p> : null}
      {error ? <p className="panel">Error al cargar inventario: {error}</p> : null}
    </Layout>
  );
}
