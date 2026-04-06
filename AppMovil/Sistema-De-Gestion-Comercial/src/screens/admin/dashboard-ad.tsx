import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { DollarSign, TrendingUp, TrendingDown, ShoppingCart, RefreshCw } from 'lucide-react-native';
import { CommonActions, useNavigation } from '@react-navigation/native';
import {
  DashboardMetricas,
  TopProducto,
  getDashboardData,
  getTopProductos,
} from '../../services/dashboard';
import { ApiError } from '../../services/apiClient';
import { clearToken, getToken, hydrateToken } from '../../services/storage';
import { GoogleChartView } from '../../components/GoogleChartView';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(value);
}

export default function DashboardAdmin() {
  const navigation = useNavigation();
  const [metricas, setMetricas] = useState<DashboardMetricas | null>(null);
  const [topProductos, setTopProductos] = useState<TopProducto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rangeDays, setRangeDays] = useState<7 | 15 | 30>(30);

  const goToLogin = useCallback(() => {
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'InicioSesion' as never }],
      }),
    );
  }, [navigation]);

  const requireToken = useCallback(async (): Promise<string | null> => {
    let token = getToken();
    if (!token) token = await hydrateToken();
    if (!token) {
      await clearToken();
      goToLogin();
      return null;
    }
    return token;
  }, [goToLogin]);

  const loadDashboard = useCallback(async (showFullLoader = true) => {
    const token = await requireToken();
    if (!token) return;

    if (showFullLoader) setIsLoading(true);
    else setIsRefreshing(true);

    setError(null);

    try {
      const [dashData, topData] = await Promise.all([
        getDashboardData(token),
        getTopProductos(token),
      ]);

      setMetricas(dashData);
      setTopProductos(topData);
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 401) {
        await clearToken();
        Alert.alert('Sesion expirada', 'Inicia sesion nuevamente.');
        goToLogin();
        return;
      }

      const message = requestError instanceof Error
        ? requestError.message
        : 'No se pudo cargar el dashboard.';
      setError(message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [goToLogin, requireToken]);

  useEffect(() => {
    loadDashboard().catch(() => {
      setError('No se pudo cargar el dashboard.');
      setIsLoading(false);
    });
  }, [loadDashboard]);

  const filteredFlow = useMemo(() => {
    if (!metricas?.flujo_mensual?.labels?.length) {
      return { labels: [] as string[], ingresos: [] as number[], gastos: [] as number[] };
    }

    const startIndex = Math.max(metricas.flujo_mensual.labels.length - rangeDays, 0);

    return {
      labels: metricas.flujo_mensual.labels.slice(startIndex),
      ingresos: metricas.flujo_mensual.ingresos.slice(startIndex),
      gastos: metricas.flujo_mensual.gastos.slice(startIndex),
    };
  }, [metricas, rangeDays]);

  const ingresosPeriodo = filteredFlow.ingresos.reduce((acc, value) => acc + value, 0);
  const gastosPeriodo = filteredFlow.gastos.reduce((acc, value) => acc + value, 0);
  const gananciaPeriodo = ingresosPeriodo - gastosPeriodo;

  const metricsCards = metricas
    ? [
        { title: 'Ingresos Hoy', icon: DollarSign, value: formatCurrency(metricas.ingresos_hoy) },
        { title: `Ingresos ${rangeDays}d`, icon: TrendingUp, value: formatCurrency(ingresosPeriodo) },
        { title: `Gastos ${rangeDays}d`, icon: TrendingDown, value: formatCurrency(gastosPeriodo) },
        { title: `Ganancia ${rangeDays}d`, icon: ShoppingCart, value: formatCurrency(gananciaPeriodo) },
      ]
    : [];

  const flujoChartData = useMemo<(string | number)[][]>(() => {
    if (!filteredFlow.labels.length) {
      return [['Dia', 'Ingresos', 'Gastos']];
    }

    return [
      ['Dia', 'Ingresos', 'Gastos'],
      ...filteredFlow.labels.map((label, index) => [
        label,
        filteredFlow.ingresos[index] ?? 0,
        filteredFlow.gastos[index] ?? 0,
      ]),
    ];
  }, [filteredFlow]);

  const topProductosChartData = useMemo<(string | number)[][]>(() => {
    if (topProductos.length === 0) {
      return [['Producto', 'Cantidad']];
    }

    return [['Producto', 'Cantidad'], ...topProductos.map((item) => [item.nombre, item.cantidad])];
  }, [topProductos]);

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#1C273F" />
        <Text style={styles.loadingText}>Cargando dashboard...</Text>
      </View>
    );
  }

  if (error && !metricas) {
    return (
      <View style={[styles.container, styles.centered, { padding: 32 }]}>
        <Text style={styles.errorTitle}>No se pudo cargar el dashboard</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => loadDashboard()}>
          <Text style={styles.retryButtonText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>Dashboard Admin</Text>
        <TouchableOpacity onPress={() => loadDashboard(false)} disabled={isRefreshing}>
          {isRefreshing ? <ActivityIndicator size="small" color="#1C273F" /> : <RefreshCw size={20} color="#1C273F" />}
        </TouchableOpacity>
      </View>

      {metricas?.periodo_referencia ? <Text style={styles.periodoText}>{metricas.periodo_referencia}</Text> : null}

      <View style={styles.filterRow}>
        {[7, 15, 30].map((days) => (
          <TouchableOpacity
            key={days}
            style={[styles.filterBtn, rangeDays === days ? styles.filterBtnActive : null]}
            onPress={() => setRangeDays(days as 7 | 15 | 30)}
          >
            <Text style={[styles.filterBtnText, rangeDays === days ? styles.filterBtnTextActive : null]}>{days} dias</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.grid}>
        {metricsCards.map((item, index) => (
          <View key={index} style={styles.metricCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.metricTitle}>{item.title}</Text>
              <item.icon size={20} color="#fff" opacity={0.9} />
            </View>
            <Text style={styles.metricValue}>{item.value}</Text>
          </View>
        ))}
      </View>

      <View style={styles.whiteCard}>
        <Text style={styles.sectionTitle}>Top Productos Vendidos</Text>
        <GoogleChartView
          type="BarChart"
          data={topProductosChartData}
          height={250}
          options={{
            backgroundColor: 'transparent',
            legend: { position: 'none' },
            colors: ['#2563EB'],
            bars: 'horizontal',
            chartArea: { left: 140, right: 16, top: 20, bottom: 20, width: '100%', height: '78%' },
            hAxis: { minValue: 0 },
          }}
          emptyMessage="No hay datos para graficar productos."
        />
      </View>

      <View style={styles.whiteCard}>
        <Text style={styles.sectionTitle}>Flujo Mensual</Text>
        <GoogleChartView
          type="LineChart"
          data={flujoChartData}
          height={250}
          options={{
            backgroundColor: 'transparent',
            colors: ['#16A34A', '#DC2626'],
            legend: { position: 'top' },
            curveType: 'function',
            lineWidth: 3,
            pointSize: 4,
            chartArea: { left: 48, right: 16, top: 24, bottom: 36, width: '100%', height: '74%' },
          }}
          emptyMessage="No hay flujo mensual disponible para este periodo."
        />
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 16 },
  centered: { justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: '#6B7280' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, marginTop: 40 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#1C273F' },
  periodoText: { fontSize: 12, color: '#6B7280', marginBottom: 16 },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  filterBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: '#CBD5E1', backgroundColor: '#FFF' },
  filterBtnActive: { backgroundColor: '#1C273F', borderColor: '#1C273F' },
  filterBtnText: { color: '#334155', fontSize: 12, fontWeight: '600' },
  filterBtnTextActive: { color: '#FFF' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  metricCard: { backgroundColor: '#1C273F', width: '48%', padding: 16, borderRadius: 12, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  metricTitle: { color: '#fff', fontSize: 12, opacity: 0.9 },
  metricValue: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  whiteCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#101828', marginBottom: 12 },
  errorTitle: { color: '#991B1B', fontWeight: '700', fontSize: 16, marginBottom: 8, textAlign: 'center' },
  errorMessage: { color: '#7F1D1D', fontSize: 13, textAlign: 'center', marginBottom: 16 },
  retryButton: { backgroundColor: '#1C273F', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  retryButtonText: { color: '#FFF', fontWeight: '600' },
});