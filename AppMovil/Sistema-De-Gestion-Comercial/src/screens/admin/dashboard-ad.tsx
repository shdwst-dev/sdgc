import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { DollarSign, TrendingUp, TrendingDown, ShoppingCart, Package, RefreshCw } from 'lucide-react-native';
import { CommonActions, useNavigation } from '@react-navigation/native';
import {
  DashboardMetricas,
  TopProducto,
  getDashboardData,
  getTopProductos,
} from '../../services/dashboard';
import { ApiError } from '../../services/apiClient';
import { clearToken, getToken, hydrateToken } from '../../services/storage';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(value);
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function DashboardAdmin() {
  const navigation = useNavigation();
  const [metricas, setMetricas] = useState<DashboardMetricas | null>(null);
  const [topProductos, setTopProductos] = useState<TopProducto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        Alert.alert('Sesión expirada', 'Inicia sesión nuevamente.');
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

  // Tarjetas de métricas derivadas del backend
  const metricsCards = metricas
    ? [
        {
          title: 'Ingresos Hoy',
          icon: DollarSign,
          value: formatCurrency(metricas.ingresos_hoy),
        },
        {
          title: 'Ingresos Mes',
          icon: TrendingUp,
          value: formatCurrency(metricas.ingresos_mes),
        },
        {
          title: 'Gastos Mes',
          icon: TrendingDown,
          value: formatCurrency(metricas.gastos_mes),
        },
        {
          title: 'Ganancia',
          icon: ShoppingCart,
          value: formatCurrency(metricas.ganancia_mes),
        },
      ]
    : [];

  // ─── Loading state ─────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#1C273F" />
        <Text style={{ marginTop: 12, color: '#6B7280' }}>Cargando dashboard...</Text>
      </View>
    );
  }

  // ─── Error state ───────────────────────────────────────────────────────────

  if (error && !metricas) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: 32 }]}>
        <Text style={{ color: '#991B1B', fontWeight: '700', fontSize: 16, marginBottom: 8, textAlign: 'center' }}>
          No se pudo cargar el dashboard
        </Text>
        <Text style={{ color: '#7F1D1D', fontSize: 13, textAlign: 'center', marginBottom: 16 }}>{error}</Text>
        <TouchableOpacity
          style={{ backgroundColor: '#1C273F', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 }}
          onPress={() => loadDashboard()}
        >
          <Text style={{ color: '#FFF', fontWeight: '600' }}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <ScrollView style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>Dashboard Admin</Text>
        <TouchableOpacity onPress={() => loadDashboard(false)} disabled={isRefreshing}>
          {isRefreshing ? (
            <ActivityIndicator size="small" color="#1C273F" />
          ) : (
            <RefreshCw size={20} color="#1C273F" />
          )}
        </TouchableOpacity>
      </View>

      {metricas?.periodo_referencia ? (
        <Text style={styles.periodoText}>{metricas.periodo_referencia}</Text>
      ) : null}

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
        {topProductos.length > 0 ? (
          topProductos.map((product, index) => (
            <View key={index} style={styles.productRow}>
              <View style={styles.productIconContainer}>
                <Package size={20} color="#fff" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.productName}>{product.nombre}</Text>
                <Text style={styles.productUnits}>{product.cantidad} unidades vendidas</Text>
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>No hay datos de ventas en este período.</Text>
        )}
      </View>

      {/* Flujo mensual */}
      {metricas?.flujo_mensual && metricas.flujo_mensual.labels.length > 0 ? (
        <View style={styles.whiteCard}>
          <Text style={styles.sectionTitle}>Flujo Mensual</Text>
          {metricas.flujo_mensual.labels.slice(-7).map((label, i) => {
            const startIdx = Math.max(metricas.flujo_mensual.labels.length - 7, 0);
            const ingreso = metricas.flujo_mensual.ingresos[startIdx + i] ?? 0;
            const gasto = metricas.flujo_mensual.gastos[startIdx + i] ?? 0;

            return (
              <View key={i} style={styles.flujoRow}>
                <Text style={styles.flujoFecha}>{label}</Text>
                <Text style={[styles.flujoMonto, { color: '#15803D' }]}>
                  +{formatCurrency(ingreso)}
                </Text>
                <Text style={[styles.flujoMonto, { color: '#B91C1C' }]}>
                  -{formatCurrency(gasto)}
                </Text>
              </View>
            );
          })}
        </View>
      ) : null}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    marginTop: 40,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1C273F',
  },
  periodoText: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  metricCard: {
    backgroundColor: '#1C273F',
    width: '48%',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  metricTitle: {
    color: '#fff',
    fontSize: 12,
    opacity: 0.9,
  },
  metricValue: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  whiteCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#101828',
    marginBottom: 12,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  productIconContainer: {
    width: 40,
    height: 40,
    backgroundColor: '#1C273F',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#101828',
  },
  productUnits: {
    fontSize: 12,
    color: '#64748b',
  },
  emptyText: {
    textAlign: 'center',
    color: '#6B7280',
    fontSize: 14,
    paddingVertical: 20,
  },
  flujoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  flujoFecha: {
    fontSize: 12,
    color: '#6B7280',
    flex: 1,
  },
  flujoMonto: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 12,
  },
});