import { useMemo } from "react";
import Layout from "./layout";
import "../styles/dashboard.css";
import { useApiData } from "../hooks/useApiData";
import { formatCurrency, formatDate } from "../lib/format";
import { GoogleChart } from "../components/GoogleChart";

export default function Dashboard() {
  const { data, loading, error } = useApiData("/dashboard", {
    periodo_referencia: { fecha: "", mes: "" },
    metricas: {
      ingresos_hoy: 0,
      ingresos_mes: 0,
      gastos_mes: 0,
      ganancia_mes: 0,
    },
    flujo_mensual: {
      labels: [] as string[],
      ingresos: [] as number[],
      gastos: [] as number[],
      utilidad: [] as number[],
    },
  });
  const { data: graficaFlujo } = useApiData("/v1/graficas/ingresos-vs-gastos", {
    series: {
      labels: [] as string[],
      ingresos: [] as number[],
      gastos: [] as number[],
    },
  });
  const { data: topProductosData } = useApiData("/dashboard/top-productos", {
    top_productos: [] as Array<{
      nombre: string;
      cantidad: number;
    }>,
  });
  const { data: ventasRecientesData } = useApiData("/dashboard/ventas-recientes", {
    ventas_recientes: [] as Array<{
      factura: string;
      cliente: string;
      responsable: string;
      monto: number;
      fecha: string;
    }>,
  });
  const { data: alertasStockData } = useApiData("/dashboard/alertas-stock", {
    alertas_stock: [] as Array<{
      sku: string;
      producto: string;
      actual: number;
      minimo: number;
    }>,
  });

  const subtituloIngresos = data.periodo_referencia.fecha
    ? formatDate(data.periodo_referencia.fecha)
    : "Sin referencia";

  const flowChartData = useMemo(
    () => [
      ["Dia", "Ingresos", "Gastos"],
      ...graficaFlujo.series.labels.map((label, index) => [
        label,
        graficaFlujo.series.ingresos[index] ?? 0,
        graficaFlujo.series.gastos[index] ?? 0,
      ]),
    ],
    [graficaFlujo.series],
  );

  const topProductsChartData = useMemo(
    () => [
      ["Producto", "Cantidad"],
      ...topProductosData.top_productos.map((producto) => [producto.nombre, producto.cantidad]),
    ],
    [topProductosData.top_productos],
  );

  return (
    <Layout>
      <section className="stats-grid">
        <div className="stat-card">
          <div className="stat-title-row">
            <span>Ingresos ({subtituloIngresos})</span>
            <span>$</span>
          </div>
          <h3>{formatCurrency(data.metricas.ingresos_hoy)}</h3>
        </div>

        <div className="stat-card">
          <div className="stat-title-row">
            <span>Ingresos ({data.periodo_referencia.mes || "Mes"})</span>
            <span>↗</span>
          </div>
          <h3>{formatCurrency(data.metricas.ingresos_mes)}</h3>
        </div>

        <div className="stat-card">
          <div className="stat-title-row">
            <span>Gastos ({data.periodo_referencia.mes || "Mes"})</span>
            <span>⌁</span>
          </div>
          <h3>{formatCurrency(data.metricas.gastos_mes)}</h3>
        </div>

        <div className="stat-card">
          <div className="stat-title-row">
            <span>Ganancia ({data.periodo_referencia.mes || "Mes"})</span>
            <span>▣</span>
          </div>
          <h3>{formatCurrency(data.metricas.ganancia_mes)}</h3>
        </div>
      </section>

      <section className="charts-grid">
        <div className="panel large-panel">
          <h4>Ingresos vs Gastos</h4>
          <GoogleChart
            type="LineChart"
            data={flowChartData}
            className="google-chart google-chart-large"
            options={{
              backgroundColor: "transparent",
              chartArea: { left: 60, right: 24, top: 24, bottom: 42, width: "100%", height: "72%" },
              colors: ["#1f4b99", "#d97706"],
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
        </div>

        <div className="panel small-panel">
          <h4>Productos más vendidos</h4>
          <GoogleChart
            type="BarChart"
            data={topProductsChartData}
            className="google-chart google-chart-small"
            options={{
              backgroundColor: "transparent",
              chartArea: { left: 150, right: 20, top: 20, bottom: 24, width: "100%", height: "76%" },
              colors: ["#2563eb"],
              legend: { position: "none" },
              hAxis: {
                minValue: 0,
                textStyle: { color: "#64748b", fontSize: 11 },
                gridlines: { color: "#e2e8f0" },
              },
              vAxis: { textStyle: { color: "#334155", fontSize: 12 } },
              bars: "horizontal",
            }}
          />
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
                <th>Responsable</th>
                <th>Monto</th>
                <th>Fecha</th>
              </tr>
            </thead>
            <tbody>
              {ventasRecientesData.ventas_recientes.map((venta) => (
                <tr key={venta.factura}>
                  <td>{venta.factura}</td>
                  <td>{venta.cliente}</td>
                  <td>{venta.responsable}</td>
                  <td>{formatCurrency(venta.monto)}</td>
                  <td>{formatDate(venta.fecha)}</td>
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
              {alertasStockData.alertas_stock.map((item) => (
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

      {loading ? <p className="panel">Cargando informacion del dashboard...</p> : null}
      {error ? <p className="panel">Error al cargar datos: {error}</p> : null}
    </Layout>
  );
}
