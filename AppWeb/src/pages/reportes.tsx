import { useEffect, useMemo, useState } from "react";
import Layout from "./layout";
import "../styles/dashboard.css";
import { useApiData } from "../hooks/useApiData";
import { formatCurrency } from "../lib/format";
import { GoogleChart } from "../components/GoogleChart";

export default function Reportes() {
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [filtroAplicado, setFiltroAplicado] = useState<{ inicio: string; fin: string }>({
    inicio: "",
    fin: "",
  });
  const [filtroError, setFiltroError] = useState<string | null>(null);

  const reportesPath = useMemo(() => {
    const params = new URLSearchParams();

    if (filtroAplicado.inicio) {
      params.set("inicio", filtroAplicado.inicio);
    }

    if (filtroAplicado.fin) {
      params.set("fin", filtroAplicado.fin);
    }

    const query = params.toString();
    return query ? `/reportes?${query}` : "/reportes";
  }, [filtroAplicado]);

  const { data, loading, error } = useApiData(reportesPath, {
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
  const { data: ingresosVsGastosData, loading: loadingIngresosVsGastos } = useApiData(`/v1/graficas/ingresos-vs-gastos${reportesPath.replace("/reportes", "")}`, {
    periodo_referencia: { inicio: "", fin: "", mes: "" },
    series: {
      labels: [] as string[],
      ingresos: [] as number[],
      gastos: [] as number[],
    },
    totales: {
      ingresos: 0,
      gastos: 0,
    },
  });
  const { data: productosMasVendidosData, loading: loadingProductosMasVendidos } = useApiData(`/v1/graficas/productos-mas-vendidos${reportesPath.replace("/reportes", "")}`, {
    periodo_referencia: { inicio: "", fin: "", mes: "" },
    series: {
      labels: [] as string[],
      cantidad: [] as number[],
    },
    top_productos: [] as Array<{
      producto_id: number;
      nombre: string;
      cantidad: number;
    }>,
  });

  useEffect(() => {
    setFechaInicio((actual) => actual || data.periodo_referencia.inicio);
    setFechaFin((actual) => actual || data.periodo_referencia.fin);
  }, [data.periodo_referencia.inicio, data.periodo_referencia.fin]);

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
  const ingresosChartData = useMemo(
    () => [
      ["Dia", "Ingresos"],
      ...ingresosVsGastosData.series.labels.map((label, index) => [
        label,
        ingresosVsGastosData.series.ingresos[index] ?? 0,
      ]),
    ],
    [ingresosVsGastosData.series],
  );
  const gastosChartData = useMemo(
    () => [
      ["Dia", "Gastos"],
      ...ingresosVsGastosData.series.labels.map((label, index) => [
        label,
        ingresosVsGastosData.series.gastos[index] ?? 0,
      ]),
    ],
    [ingresosVsGastosData.series],
  );
  const productosMasVendidosChartData = useMemo(
    () => [
      ["Producto", "Cantidad"],
      ...productosMasVendidosData.series.labels.map((label, index) => [
        label,
        productosMasVendidosData.series.cantidad[index] ?? 0,
      ]),
    ],
    [productosMasVendidosData.series],
  );

  const aplicarFiltro = () => {
    if (!fechaInicio || !fechaFin) {
      setFiltroError("Selecciona la fecha inicial y final.");
      return;
    }

    if (fechaInicio > fechaFin) {
      setFiltroError("La fecha inicial no puede ser mayor que la fecha final.");
      return;
    }

    setFiltroError(null);
    setFiltroAplicado({
      inicio: fechaInicio,
      fin: fechaFin,
    });
  };

  return (
    <Layout>
      <section className="inventory-header">
        <div>
          <h1>Reportes y analítica</h1>
          <p>Analiza ventas, costos, utilidad y facturas pendientes en el periodo seleccionado.</p>
        </div>
      </section>

      <section className="panel reports-filter-panel">
        <div className="reports-filters">
          <label htmlFor="fecha-inicio">Rango de fechas:</label>
          <input id="fecha-inicio" type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
          <span>a</span>
          <input id="fecha-fin" type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} />
          <button type="button" className="inventory-primary-button" onClick={aplicarFiltro}>
            Aplicar
          </button>
        </div>
        {filtroError ? <p className="form-message form-message-error">{filtroError}</p> : null}
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

      <section className="panel reports-chart-panel">
        <div className="reports-chart-header">
          <h4>Ingresos</h4>
          <small>{ingresosVsGastosData.periodo_referencia.mes || data.periodo_referencia.mes}</small>
        </div>
        <GoogleChart
          type="LineChart"
          data={ingresosChartData}
          className="google-chart google-chart-large"
          options={{
            backgroundColor: "transparent",
            chartArea: { left: 60, right: 24, top: 24, bottom: 42, width: "100%", height: "72%" },
            colors: ["#0f766e"],
            curveType: "function",
            legend: { position: "none" },
            hAxis: { textStyle: { color: "#64748b", fontSize: 11 } },
            vAxis: {
              minValue: 0,
              textStyle: { color: "#64748b", fontSize: 11 },
              gridlines: { color: "#e2e8f0" },
            },
            lineWidth: 3,
            pointSize: 5,
          }}
          emptyMessage={loadingIngresosVsGastos ? "Cargando grafica..." : "No hay datos de ingresos para este periodo."}
        />
      </section>

      <section className="panel reports-chart-panel">
        <div className="reports-chart-header">
          <h4>Gastos</h4>
          <small>{ingresosVsGastosData.periodo_referencia.mes || data.periodo_referencia.mes}</small>
        </div>
        <GoogleChart
          type="LineChart"
          data={gastosChartData}
          className="google-chart google-chart-large"
          options={{
            backgroundColor: "transparent",
            chartArea: { left: 60, right: 24, top: 24, bottom: 42, width: "100%", height: "72%" },
            colors: ["#dc2626"],
            curveType: "function",
            legend: { position: "none" },
            hAxis: { textStyle: { color: "#64748b", fontSize: 11 } },
            vAxis: {
              minValue: 0,
              textStyle: { color: "#64748b", fontSize: 11 },
              gridlines: { color: "#e2e8f0" },
            },
            lineWidth: 3,
            pointSize: 5,
          }}
          emptyMessage={loadingIngresosVsGastos ? "Cargando grafica..." : "No hay datos de gastos para este periodo."}
        />
      </section>

      <section className="panel reports-chart-panel">
        <div className="reports-chart-header">
          <h4>Productos mas vendidos</h4>
          <small>{productosMasVendidosData.periodo_referencia.mes || data.periodo_referencia.mes}</small>
        </div>
        <GoogleChart
          type="BarChart"
          data={productosMasVendidosChartData}
          className="google-chart google-chart-large"
          options={{
            backgroundColor: "transparent",
            chartArea: { left: 150, right: 24, top: 24, bottom: 42, width: "100%", height: "72%" },
            colors: ["#1f4b99"],
            legend: { position: "none" },
            hAxis: {
              minValue: 0,
              textStyle: { color: "#64748b", fontSize: 11 },
              gridlines: { color: "#e2e8f0" },
            },
            vAxis: { textStyle: { color: "#475569", fontSize: 11 } },
            bars: "horizontal",
          }}
          emptyMessage={loadingProductosMasVendidos ? "Cargando grafica..." : "No hay ventas suficientes para mostrar productos mas vendidos."}
        />
      </section>

      {loading ? <p className="panel">Cargando reportes...</p> : null}
      {error ? <p className="panel">Error al cargar reportes: {error}</p> : null}
    </Layout>
  );
}
