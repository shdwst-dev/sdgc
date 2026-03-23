import { useState } from "react";
import Layout from "./layout";
import "../styles/dashboard.css";
import { useApiData } from "../hooks/useApiData";
import { formatCurrency, formatDate } from "../lib/format";

export default function Compras() {
  const [busqueda, setBusqueda] = useState("");
  const [proveedorSeleccionado, setProveedorSeleccionado] = useState("Todos");
  const [estadoSeleccionado, setEstadoSeleccionado] = useState("Todos");
  const { data, loading, error } = useApiData("/compras", {
    periodo_referencia: { mes: "" },
    metricas: {
      ordenes_mes: 0,
      por_recibir: 0,
      gasto_acumulado: 0,
      proveedores_activos: 0,
    },
    proveedores: [] as string[],
    ordenes: [] as Array<{
      folio: string;
      proveedor: string;
      fecha: string;
      total: number;
      estado: string;
    }>,
  });

  const ordenesFiltradas = data.ordenes.filter((orden) => {
    const coincideBusqueda =
      orden.folio.toLowerCase().includes(busqueda.toLowerCase()) ||
      orden.proveedor.toLowerCase().includes(busqueda.toLowerCase());
    const coincideProveedor =
      proveedorSeleccionado === "Todos" || orden.proveedor === proveedorSeleccionado;
    const coincideEstado =
      estadoSeleccionado === "Todos" || orden.estado === estadoSeleccionado;

    return coincideBusqueda && coincideProveedor && coincideEstado;
  });

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
            <span>Órdenes ({data.periodo_referencia.mes || "Mes"})</span>
            <span>🧾</span>
          </div>
          <h3>{data.metricas.ordenes_mes}</h3>
        </div>

        <div className="stat-card">
          <div className="stat-title-row">
            <span>Por recibir</span>
            <span>⏳</span>
          </div>
          <h3>{data.metricas.por_recibir}</h3>
        </div>

        <div className="stat-card">
          <div className="stat-title-row">
            <span>Gasto acumulado</span>
            <span>$</span>
          </div>
          <h3>{formatCurrency(data.metricas.gasto_acumulado)}</h3>
        </div>

        <div className="stat-card">
          <div className="stat-title-row">
            <span>Proveedores activos</span>
            <span>🏢</span>
          </div>
          <h3>{data.metricas.proveedores_activos}</h3>
        </div>
      </section>

      <section className="panel inventory-panel">
        <div className="inventory-filters">
          <input type="text" placeholder="Buscar órdenes de compra..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
          <select value={proveedorSeleccionado} onChange={(e) => setProveedorSeleccionado(e.target.value)}>
            <option value="Todos">Todos los proveedores</option>
            {data.proveedores.map((proveedor) => (
              <option key={proveedor} value={proveedor}>
                {proveedor}
              </option>
            ))}
          </select>
          <select value={estadoSeleccionado} onChange={(e) => setEstadoSeleccionado(e.target.value)}>
            <option value="Todos">Todos los estados</option>
            <option value="Pendiente">Pendiente</option>
            <option value="Completado">Completado</option>
            <option value="En Proceso">En Proceso</option>
            <option value="Cancelado">Cancelado</option>
          </select>
          <button type="button" className="inventory-secondary-button">
            {ordenesFiltradas.length} resultados
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
              {ordenesFiltradas.map((orden) => (
                <tr key={orden.folio}>
                  <td>{orden.folio}</td>
                  <td>{orden.proveedor}</td>
                  <td>{formatDate(orden.fecha)}</td>
                  <td>{formatCurrency(orden.total)}</td>
                  <td>
                    <span
                      className={`inventory-status ${
                        orden.estado === "Completado"
                          ? "inventory-status-ok"
                          : orden.estado === "Pendiente" || orden.estado === "En Proceso"
                            ? "inventory-status-low"
                            : "invoice-status-overdue"
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

      {loading ? <p className="panel">Cargando compras...</p> : null}
      {error ? <p className="panel">Error al cargar compras: {error}</p> : null}
    </Layout>
  );
}
