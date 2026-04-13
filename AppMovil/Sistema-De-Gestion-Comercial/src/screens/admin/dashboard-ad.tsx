import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Dimensions } from 'react-native';
import { DollarSign, TrendingUp, TrendingDown, ShoppingCart, RefreshCw } from 'lucide-react-native';
import { CommonActions, useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  DashboardMetricas,
  TopProducto,
  getDashboardData,
  getTopProductos,
} from '../../services/dashboard';
import { ApiError } from '../../services/apiClient';
import { clearToken, getToken, hydrateToken } from '../../services/storage';
import { GoogleChartView } from '../../components/GoogleChartView';

const { width } = Dimensions.get('window');

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
        routes: [{ name: 'RoleSelect' as never }],
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
        { title: 'Hoy', icon: DollarSign, value: formatCurrency(metricas.ingresos_hoy), colors: ['#1E293B', '#334155'] },
        { title: `Ingresos ${rangeDays}d`, icon: TrendingUp, value: formatCurrency(ingresosPeriodo), colors: ['#065F46', '#059669'] },
        { title: `Gastos ${rangeDays}d`, icon: TrendingDown, value: formatCurrency(gastosPeriodo), colors: ['#991B1B', '#DC2626'] },
        { title: `Ganancia ${rangeDays}d`, icon: ShoppingCart, value: formatCurrency(gananciaPeriodo), colors: ['#92400E', '#D97706'] },
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
        <Text style={styles.errorTitle}>Error de conexión</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => loadDashboard()}>
          <Text style={styles.retryButtonText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.headerTitle}>Resumen</Text>
          <Text style={styles.headerSubtitle}>Administradora</Text>
        </View>
        <TouchableOpacity 
          style={styles.refreshBtn}
          onPress={() => loadDashboard(false)} 
          disabled={isRefreshing}
        >
          {isRefreshing ? <ActivityIndicator size="small" color="#1C273F" /> : <RefreshCw size={20} color="#1C273F" />}
        </TouchableOpacity>
      </View>

      <View style={styles.filterRow}>
        {[7, 15, 30].map((days) => (
          <TouchableOpacity
            key={days}
            style={[styles.filterBtn, rangeDays === days && styles.filterBtnActive]}
            onPress={() => setRangeDays(days as 7 | 15 | 30)}
          >
            <Text style={[styles.filterBtnText, rangeDays === days && styles.filterBtnTextActive]}>{days} días</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.grid}>
        {metricsCards.map((item, index) => (
          <LinearGradient
            key={index}
            colors={item.colors as any}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.metricCard}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.metricTitle}>{item.title}</Text>
              <item.icon size={18} color="#fff" opacity={0.7} />
            </View>
            <Text style={styles.metricValue}>{item.value}</Text>
          </LinearGradient>
        ))}
      </View>

      <View style={styles.whiteCard}>
        <Text style={styles.sectionTitle}>Top Productos Vendidos</Text>
        <GoogleChartView
          type="BarChart"
          data={topProductosChartData}
          height={240}
          options={{
            backgroundColor: 'transparent',
            legend: { position: 'none' },
            colors: ['#3B82F6'],
            bars: 'horizontal',
            chartArea: { left: 100, right: 10, top: 10, bottom: 20, width: '100%', height: '85%' },
            hAxis: { minValue: 0, textStyle: { fontSize: 10, color: '#94A3B8' } },
            vAxis: { textStyle: { fontSize: 10, color: '#475569', fontWeight: '500' } },
          }}
          emptyMessage="No hay datos de productos."
        />
      </View>

      <View style={styles.whiteCard}>
        <Text style={styles.sectionTitle}>Flujo de Capital</Text>
        <GoogleChartView
          type="LineChart"
          data={flujoChartData}
          height={240}
          options={{
            backgroundColor: 'transparent',
            colors: ['#10B981', '#EF4444'],
            legend: { position: 'top', textStyle: { fontSize: 11, color: '#64748B' } },
            curveType: 'function',
            lineWidth: 3,
            pointSize: 4,
            chartArea: { left: 40, right: 10, top: 40, bottom: 30, width: '100%', height: '70%' },
            hAxis: { textStyle: { fontSize: 9, color: '#94A3B8' } },
            vAxis: { textStyle: { fontSize: 9, color: '#94A3B8' } },
          }}
          emptyMessage="Sin flujo de capital disponible."
        />
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9', padding: 16 },
  centered: { justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: '#64748B', fontWeight: '600' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 40, marginBottom: 20 },
  headerTitle: { fontSize: 32, fontWeight: '900', color: '#1E293B', letterSpacing: -1 },
  headerSubtitle: { fontSize: 14, color: '#64748B', fontWeight: '500', marginTop: -4 },
  refreshBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  filterRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  filterBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#E2E8F0' },
  filterBtnActive: { backgroundColor: '#1E293B' },
  filterBtnText: { color: '#64748B', fontSize: 13, fontWeight: '700' },
  filterBtnTextActive: { color: '#FFF' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12, marginBottom: 24 },
  metricCard: { width: (width - 44) / 2, padding: 20, borderRadius: 24, minHeight: 110, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 4 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  metricTitle: { color: '#fff', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', opacity: 0.8 },
  metricValue: { color: '#fff', fontSize: 22, fontWeight: '900' },
  whiteCard: { backgroundColor: '#fff', borderRadius: 28, padding: 20, marginBottom: 20, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 15, elevation: 3 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#1E293B', marginBottom: 16 },
  errorTitle: { color: '#991B1B', fontWeight: '800', fontSize: 18, marginBottom: 8, textAlign: 'center' },
  errorMessage: { color: '#64748B', fontSize: 14, textAlign: 'center', marginBottom: 24 },
  retryButton: { backgroundColor: '#1E293B', paddingHorizontal: 30, paddingVertical: 15, borderRadius: 16 },
  retryButtonText: { color: '#FFF', fontWeight: '700' },
});