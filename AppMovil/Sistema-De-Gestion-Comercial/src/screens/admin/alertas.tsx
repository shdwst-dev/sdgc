import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, StatusBar, ActivityIndicator } from 'react-native';
import { AlertTriangle, Package, RefreshCw } from 'lucide-react-native';
import { CommonActions, useNavigation } from '@react-navigation/native';
import { getAlertasStock, AlertaStock } from '../../services/dashboard';
import { ApiError } from '../../services/apiClient';
import { clearToken, getToken, hydrateToken } from '../../services/storage';

// ─── Component ───────────────────────────────────────────────────────────────

export default function Alertas() {
  const navigation = useNavigation();
  const [alertas, setAlertas] = useState<AlertaStock[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const goToLogin = useCallback(() => {
    navigation.dispatch(
      CommonActions.reset({ index: 0, routes: [{ name: 'InicioSesion' as never }] }),
    );
  }, [navigation]);

  const requireToken = useCallback(async (): Promise<string | null> => {
    let token = getToken();
    if (!token) token = await hydrateToken();
    if (!token) { await clearToken(); goToLogin(); return null; }
    return token;
  }, [goToLogin]);

  const loadAlertas = useCallback(async (showFullLoader = true) => {
    const token = await requireToken();
    if (!token) return;

    if (showFullLoader) setIsLoading(true);
    else setIsRefreshing(true);
    setError(null);

    try {
      const data = await getAlertasStock(token);
      setAlertas(data);
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 401) {
        await clearToken();
        Alert.alert('Sesión expirada', 'Inicia sesión nuevamente.');
        goToLogin();
        return;
      }
      const message = requestError instanceof Error ? requestError.message : 'No se pudo cargar las alertas.';
      setError(message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [goToLogin, requireToken]);

  useEffect(() => {
    loadAlertas().catch(() => { setError('No se pudo cargar las alertas.'); setIsLoading(false); });
  }, [loadAlertas]);

  // Backend type: { sku, producto, actual, minimo }
  // Clasificar: Sin stock (actual === 0), Crítico (<= 50% mínimo), Bajo (<= mínimo)
  const sinStock = alertas.filter((a) => a.actual <= 0);
  const critico = alertas.filter((a) => a.actual > 0 && a.actual <= Math.max(a.minimo * 0.5, 1));
  const bajo = alertas.filter((a) => a.actual > Math.max(a.minimo * 0.5, 1));

  // ─── Loading ─────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#1C273F" />
        <Text style={{ marginTop: 12, color: '#6B7280' }}>Cargando alertas...</Text>
      </View>
    );
  }

  if (error && alertas.length === 0) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: 32 }]}>
        <Text style={{ color: '#991B1B', fontWeight: '700', fontSize: 16, marginBottom: 8 }}>No se pudo cargar las alertas</Text>
        <Text style={{ color: '#7F1D1D', fontSize: 13, marginBottom: 16, textAlign: 'center' }}>{error}</Text>
        <TouchableOpacity
          style={{ backgroundColor: '#1C273F', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 }}
          onPress={() => loadAlertas()}
        >
          <Text style={{ color: '#FFF', fontWeight: '600' }}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ─── Render alert card ─────────────────────────────────────────────────────

  const renderAlertCard = (alerta: AlertaStock) => {
    const pct = alerta.minimo > 0 ? Math.min((alerta.actual / alerta.minimo) * 100, 100) : 0;
    const barColor = alerta.actual <= 0 ? '#EF4444' : '#F59E0B';

    return (
      <View key={alerta.sku || alerta.producto} style={styles.alertCard}>
        <View style={styles.alertCardHeader}>
          <View style={[styles.iconContainer, {
            backgroundColor: alerta.actual <= 0 ? '#FEE2E2' : '#FEF3C7',
          }]}>
            {alerta.actual <= 0
              ? <AlertTriangle size={20} color="#DC2626" />
              : <Package size={20} color="#D97706" />
            }
          </View>
          <View style={styles.textContent}>
            <Text style={styles.alertTitle}>
              {alerta.actual <= 0 ? 'Sin Stock' : 'Stock Bajo'}: {alerta.producto}
            </Text>
            <Text style={styles.alertDescription}>
              Stock: {alerta.actual} / Mínimo: {alerta.minimo}
            </Text>
            {alerta.sku ? (
              <Text style={styles.alertSku}>SKU: {alerta.sku}</Text>
            ) : null}
          </View>
        </View>

        <View style={styles.stockBar}>
          <View style={[styles.stockBarFill, { width: `${pct}%`, backgroundColor: barColor }]} />
        </View>
      </View>
    );
  };

  // ─── Main render ────────────────────────────────────────────────────────

  return (
    <ScrollView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>Alertas de Stock</Text>
        <TouchableOpacity onPress={() => loadAlertas(false)} disabled={isRefreshing}>
          {isRefreshing ? <ActivityIndicator size="small" color="#1C273F" /> : <RefreshCw size={20} color="#1C273F" />}
        </TouchableOpacity>
      </View>

      <View style={styles.summaryCard}>
        <View style={styles.summaryTop}>
          <Text style={styles.summaryLabel}>Productos con Stock Bajo</Text>
          <AlertTriangle size={20} color="#FFF" />
        </View>
        <Text style={styles.summaryValue}>{alertas.length}</Text>
        <Text style={styles.summaryDetail}>
          {sinStock.length} sin stock • {critico.length} críticos • {bajo.length} bajos
        </Text>
      </View>

      {alertas.length === 0 ? (
        <View style={styles.emptyCard}>
          <Package size={40} color="#9CA3AF" />
          <Text style={styles.emptyTitle}>¡Todo en orden!</Text>
          <Text style={styles.emptyText}>No hay productos con stock bajo en este momento.</Text>
        </View>
      ) : null}

      {sinStock.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.dot, { backgroundColor: '#EF4444' }]} />
            <Text style={styles.sectionTitle}>Sin Stock ({sinStock.length})</Text>
          </View>
          {sinStock.map(renderAlertCard)}
        </View>
      )}

      {critico.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.dot, { backgroundColor: '#F59E0B' }]} />
            <Text style={styles.sectionTitle}>Stock Crítico ({critico.length})</Text>
          </View>
          {critico.map(renderAlertCard)}
        </View>
      )}

      {bajo.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.dot, { backgroundColor: '#3B82F6' }]} />
            <Text style={styles.sectionTitle}>Stock Bajo ({bajo.length})</Text>
          </View>
          {bajo.map(renderAlertCard)}
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB', padding: 16 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, marginTop: 40 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#1C273F' },
  summaryCard: { backgroundColor: '#1C273F', borderRadius: 12, padding: 16, marginBottom: 24 },
  summaryTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  summaryLabel: { color: '#FFF', fontSize: 14, opacity: 0.9 },
  summaryValue: { color: '#FFF', fontSize: 32, fontWeight: 'bold' },
  summaryDetail: { color: '#FFF', fontSize: 12, opacity: 0.75, marginTop: 4 },
  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: '#101828' },
  alertCard: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 12 },
  alertCardHeader: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  iconContainer: { width: 40, height: 40, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  textContent: { flex: 1 },
  alertTitle: { fontSize: 14, fontWeight: '600', color: '#101828', marginBottom: 4 },
  alertDescription: { fontSize: 12, color: '#6B7280' },
  alertSku: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  stockBar: { height: 6, backgroundColor: '#F3F4F6', borderRadius: 3, overflow: 'hidden' },
  stockBarFill: { height: '100%', borderRadius: 3 },
  emptyCard: { backgroundColor: '#FFF', borderRadius: 12, padding: 32, borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center', marginBottom: 24 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#101828', marginTop: 12, marginBottom: 4 },
  emptyText: { fontSize: 13, color: '#6B7280', textAlign: 'center' },
});