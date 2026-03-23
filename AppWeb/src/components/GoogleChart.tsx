import { useEffect, useRef } from "react";

declare global {
  interface Window {
    google?: {
      charts: {
        load: (version: string, options: { packages: string[] }) => void;
        setOnLoadCallback: (callback: () => void) => void;
      };
      visualization: {
        arrayToDataTable: (data: (string | number)[][]) => unknown;
        LineChart: new (element: Element) => { draw: (data: unknown, options: Record<string, unknown>) => void };
        BarChart: new (element: Element) => { draw: (data: unknown, options: Record<string, unknown>) => void };
      };
    };
  }
}

let googleChartsPromise: Promise<void> | null = null;

function loadGoogleCharts() {
  if (window.google?.charts) {
    return Promise.resolve();
  }

  if (googleChartsPromise) {
    return googleChartsPromise;
  }

  googleChartsPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://www.gstatic.com/charts/loader.js";
    script.async = true;
    script.onload = () => {
      if (!window.google?.charts) {
        reject(new Error("Google Charts no se cargo correctamente."));
        return;
      }

      window.google.charts.load("current", { packages: ["corechart"] });
      window.google.charts.setOnLoadCallback(() => resolve());
    };
    script.onerror = () => reject(new Error("No fue posible cargar Google Charts."));
    document.head.appendChild(script);
  });

  return googleChartsPromise;
}

type GoogleChartProps = {
  type: "LineChart" | "BarChart";
  data: (string | number)[][];
  options: Record<string, unknown>;
  className?: string;
  emptyMessage?: string;
};

export function GoogleChart({
  type,
  data,
  options,
  className = "google-chart",
  emptyMessage = "No hay datos disponibles para esta grafica.",
}: GoogleChartProps) {
  const chartRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (data.length <= 1 || !chartRef.current) {
      return;
    }

    let cancelled = false;

    async function drawChart() {
      await loadGoogleCharts();

      if (cancelled || !chartRef.current || !window.google?.visualization) {
        return;
      }

      const dataTable = window.google.visualization.arrayToDataTable(data);
      const ChartConstructor = window.google.visualization[type];
      const chart = new ChartConstructor(chartRef.current);
      chart.draw(dataTable, options);
    }

    drawChart().catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [data, options, type]);

  if (data.length <= 1) {
    return <div className={`${className} google-chart-empty`}>{emptyMessage}</div>;
  }

  return <div ref={chartRef} className={className} />;
}
