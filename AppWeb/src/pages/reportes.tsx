import { useMemo } from "react";
import Layout from "./layout";
import "../styles/dashboard.css";
import { useApiData } from "../hooks/useApiData";
import { formatCurrency } from "../lib/format";
import { GoogleChart } from "../components/GoogleChart";

export default function Reportes() {
  const { data, loading, error } = useApiData("/reportes", {
    periodo_referencia: { inicio: "", fin: "", mes: "" },
    metricas: {
      ventas_totales: 0,
      costos_totales: 0,
      utilidad_bruta: 0,
      utilidad_neta: 0,
      facturas_pendientes: 0,
    },
    flujo_periodo: {
      labels: [] as string[],
      ingresos: [] as number[],
      gastos: [] as number[],
      utilidad: [] as number[],
    },
  });

  const reportFlowChartData = useMemo(
    () => [
      ["Dia", "Ventas", "Costos", "Utilidad"],
      ...data.flujo_periodo.labels.map((label, index) => [
        label,
        data.flujo_periodo.ingresos[index] ?? 0,
        data.flujo_periodo.gastos[index] ?? 0,
        data.flujo_periodo.utilidad[index] ?? 0,
      ]),
    ],
    [data.flujo_periodo],
  );

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
          <input id="fecha-inicio" type="date" value={data.periodo_referencia.inicio || "2026-02-01"} readOnly />
          <span>a</span>
          <input id="fecha-fin" type="date" value={data.periodo_referencia.fin || "2026-02-28"} readOnly />
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
          <h3>{formatCurrency(data.metricas.ventas_totales)}</h3>
          <small>Periodo de referencia: {data.periodo_referencia.mes || "Sin datos"}</small>
        </div>

        <div className="stat-card">
          <div className="stat-title-row">
            <span>Costos totales</span>
            <span>⌁</span>
          </div>
          <h3>{formatCurrency(data.metricas.costos_totales)}</h3>
          <small>Compras registradas del periodo</small>
        </div>

        <div className="stat-card">
          <div className="stat-title-row">
            <span>Utilidad bruta</span>
            <span>↗</span>
          </div>
          <h3>{formatCurrency(data.metricas.utilidad_bruta)}</h3>
          <small>Ventas menos costos</small>
        </div>

        <div className="stat-card">
          <div className="stat-title-row">
            <span>Utilidad neta</span>
            <span>↗</span>
          </div>
          <h3>{formatCurrency(data.metricas.utilidad_neta)}</h3>
          <small>Estimado sin otros gastos operativos</small>
        </div>

        <div className="stat-card">
          <div className="stat-title-row">
            <span>Facturas pendientes</span>
            <span>🧾</span>
          </div>
          <h3>{formatCurrency(data.metricas.facturas_pendientes)}</h3>
          <small>Monto pendiente por facturar o procesar</small>
        </div>
      </section>

      <section className="panel reports-chart-panel">
        <div className="reports-chart-header">
          <h4>Utilidad a lo largo del tiempo</h4>
          <button type="button" className="inventory-secondary-button">
            Exportar
          </button>
        </div>
        <GoogleChart
          type="LineChart"
          data={reportFlowChartData}
          className="google-chart google-chart-large"
          options={{
            backgroundColor: "transparent",
            chartArea: { left: 60, right: 24, top: 24, bottom: 42, width: "100%", height: "72%" },
            colors: ["#1f4b99", "#d97706", "#15803d"],
            curveType: "function",
            legend: { position: "top", textStyle: { color: "#475569", fontSize: 12 } },
            hAxis: { textStyle: { color: "#64748b", fontSize: 11 } },
            vAxis: {
              minValue: 0,
              textStyle: { color: "#64748b", fontSize: 11 },
              gridlines: { color: "#e2e8f0" },
            },
            lineWidth: 3,
            pointSize: 5,
          }}
        />
      </section>

      {loading ? <p className="panel">Cargando reportes...</p> : null}
      {error ? <p className="panel">Error al cargar reportes: {error}</p> : null}
    </Layout>
  );
}
