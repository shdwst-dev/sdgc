import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';

type ChartType = 'LineChart' | 'BarChart' | 'ColumnChart' | 'PieChart' | 'AreaChart';

type GoogleChartViewProps = {
  type: ChartType;
  data: (string | number)[][];
  options?: Record<string, unknown>;
  height?: number;
  emptyMessage?: string;
};

function buildChartHtml(type: ChartType, data: (string | number)[][], options: Record<string, unknown>) {
  const safeData = JSON.stringify(data);
  const safeOptions = JSON.stringify(options);

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
    <script type="text/javascript" src="https://www.gstatic.com/charts/loader.js"></script>
    <script type="text/javascript">
      google.charts.load('current', { packages: ['corechart'] });
      google.charts.setOnLoadCallback(drawChart);

      function drawChart() {
        const rawData = ${safeData};
        const options = ${safeOptions};
        const data = google.visualization.arrayToDataTable(rawData);
        const chart = new google.visualization.${type}(document.getElementById('chart'));
        chart.draw(data, options);
      }

      window.addEventListener('resize', drawChart);
    </script>
    <style>
      html, body, #chart {
        margin: 0;
        padding: 0;
        width: 100%;
        height: 100%;
        background: transparent;
      }
    </style>
  </head>
  <body>
    <div id="chart"></div>
  </body>
</html>`;
}

export function GoogleChartView({
  type,
  data,
  options = {},
  height = 220,
  emptyMessage = 'No hay datos disponibles para esta grafica.',
}: GoogleChartViewProps) {
  const html = useMemo(() => buildChartHtml(type, data, options), [type, data, options]);

  if (data.length <= 1) {
    return (
      <View style={[styles.emptyWrap, { height }]}>
        <Text style={styles.emptyText}>{emptyMessage}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.webWrap, { height }]}>
      <WebView
        originWhitelist={['*']}
        source={{ html }}
        style={styles.webView}
        javaScriptEnabled
        domStorageEnabled
        scrollEnabled={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  webWrap: {
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  webView: {
    backgroundColor: 'transparent',
  },
  emptyWrap: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 16,
  },
  emptyText: {
    color: '#64748B',
    fontSize: 13,
    textAlign: 'center',
  },
});

