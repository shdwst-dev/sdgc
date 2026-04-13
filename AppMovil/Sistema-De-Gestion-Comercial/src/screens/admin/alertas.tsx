import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, ActivityIndicator } from 'react-native';
import { AlertTriangle, Package, RefreshCw, ChevronRight } from 'lucide-react-native';
import { CommonActions, useNavigation, useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { getAlertasStock, AlertaStock } from '../../services/dashboard';
import { ApiError } from '../../services/apiClient';
import { clearToken, getToken, hydrateToken } from '../../services/storage';
import { useToast } from '../../components/Toast';

export default function Alertas() {
  const navigation = useNavigation();
  const { showToast } = useToast();
  const [alertas, setAlertas] = useState<AlertaStock[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const goToLogin = useCallback(() => {
    navigation.dispatch(
      CommonActions.reset({ index: 0, routes: [{ name: 'RoleSelect' as never }] }),
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
      // Pedimos hasta 50 alertas
      const data = await getAlertasStock(token, 50);
      setAlertas(data);
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 401) {
        await clearToken();
        showToast({ message: 'Sesión expirada', type: 'error' });
        goToLogin();
        return;
      }
      const message = requestError instanceof Error ? requestError.message : 'No se pudo cargar las alertas.';
      setError(message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [goToLogin, requireToken, showToast]);

  // Actualizar cada vez que la pantalla gana el foco (vuelve del inventario)
  useFocusEffect(
    useCallback(() => {
      loadAlertas().catch(() => { setError('Error al sincronizar alertas.'); setIsLoading(false); });
    }, [loadAlertas])
  );

  const sinStock = alertas.filter((a) => a.actual <= 0);
  const critico = alertas.filter((a) => a.actual > 0 && a.actual <= Math.max(a.minimo * 0.5, 1));
  const bajo = alertas.filter((a) => a.actual > Math.max(a.minimo * 0.5, 1));

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#1C273F" />
        <Text style={styles.loadingText}>Verificando inventario...</Text>
      </View>
    );
  }

  if (error && alertas.length === 0) {
    return (
      <View style={[styles.container, styles.centered, { padding: 32 }]}>
        <AlertTriangle size={48} color="#EF4444" style={{ marginBottom: 16 }} />
        <Text style={styles.errorTitle}>Error al sincronizar</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => loadAlertas()}>
          <Text style={styles.retryBtnText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const renderAlertCard = (alerta: AlertaStock) => {
    const isCritical = alerta.actual <= Math.max(alerta.minimo * 0.5, 1);
    const isSinStock = alerta.actual <= 0;
    
    let statusLabel = 'Stock Bajo';
    let statusColor = '#D97706';
    let bgColor = '#FEF3C7';
    let iconColor = '#D97706';

    if (isSinStock) {
      statusLabel = 'Agotado';
      statusColor = '#DC2626';
      bgColor = '#FEE2E2';
      iconColor = '#DC2626';
    } else if (isCritical) {
      statusLabel = 'Crítico';
      statusColor = '#EA580C';
      bgColor = '#FFEDD5';
      iconColor = '#EA580C';
    }

    const pct = alerta.minimo > 0 ? Math.min((alerta.actual / alerta.minimo) * 100, 100) : 0;

    return (
      <TouchableOpacity 
        key={alerta.sku || alerta.producto} 
        style={styles.alertCard}
        onPress={() => (navigation as any).navigate('InventarioTab', { search: alerta.sku || alerta.producto })}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.iconContainer, { backgroundColor: bgColor }]}>
            {isSinStock ? <AlertTriangle size={20} color={iconColor} /> : <Package size={20} color={iconColor} />}
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.titleRow}>
              <Text style={styles.alertTitle} numberOfLines={1}>{alerta.producto}</Text>
              <View style={[styles.badge, { backgroundColor: bgColor }]}>
                <Text style={[styles.badgeText, { color: statusColor }]}>{statusLabel}</Text>
              </View>
            </View>
            <Text style={styles.alertSku}>SKU: {alerta.sku || 'N/A'}</Text>
          </View>
          <ChevronRight size={18} color="#D1D5DB" />
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Actual</Text>
            <Text style={[styles.statValue, { color: statusColor }]}>{alerta.actual}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Mínimo</Text>
            <Text style={styles.statValue}>{alerta.minimo}</Text>
          </View>
        </View>

        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${pct}%`, backgroundColor: statusColor }]} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.headerRow}>
        <View>
          <Text style={styles.headerTitle}>Alertas</Text>
          <Text style={styles.headerSubtitle}>Gestión de Reposición</Text>
        </View>
        <TouchableOpacity 
          style={styles.refreshBtn}
          onPress={() => loadAlertas(false)} 
          disabled={isRefreshing}
        >
          {isRefreshing ? <ActivityIndicator size="small" color="#1C273F" /> : <RefreshCw size={20} color="#1C273F" />}
        </TouchableOpacity>
      </View>

      <LinearGradient
        colors={['#1C273F', '#2D3748']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.summaryCard}
      >
        <View style={styles.summaryContent}>
          <View>
            <Text style={styles.summaryLabel}>Total Incidencias</Text>
            <Text style={styles.summaryValue}>{alertas.length}</Text>
          </View>
          <View style={styles.summaryIcon}>
            <AlertTriangle size={36} color="rgba(255,255,255,0.2)" />
          </View>
        </View>
        <View style={styles.summaryFooter}>
          <Text style={styles.footerDetail}>
            {sinStock.length} Agotados • {critico.length} Críticos • {bajo.length} Bajos
          </Text>
        </View>
      </LinearGradient>

      {alertas.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconContainer}>
            <Package size={48} color="#10B981" />
          </View>
          <Text style={styles.emptyTitle}>¡Inventario Saludable!</Text>
          <Text style={styles.emptyText}>No hay productos por debajo del mínimo establecido.</Text>
          <TouchableOpacity 
            style={styles.emptyRefreshBtn}
            onPress={() => loadAlertas()}
          >
            <Text style={styles.emptyRefreshText}>Sincronizar ahora</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.listSection}>
          {sinStock.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Nivel Agotado</Text>
              {sinStock.map(renderAlertCard)}
            </View>
          )}

          {critico.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Nivel Crítico</Text>
              {critico.map(renderAlertCard)}
            </View>
          )}

          {bajo.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Nivel Bajo</Text>
              {bajo.map(renderAlertCard)}
            </View>
          )}
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6', padding: 16 },
  centered: { justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: '#64748B', fontWeight: '600' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 40, marginBottom: 24 },
  headerTitle: { fontSize: 32, fontWeight: '900', color: '#1C273F', letterSpacing: -1 },
  headerSubtitle: { fontSize: 14, color: '#6B7280', fontWeight: '500', marginTop: -4 },
  refreshBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10 },
  summaryCard: { borderRadius: 24, padding: 24, marginBottom: 24, elevation: 4, shadowColor: '#1C273F', shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 8 } },
  summaryContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  summaryValue: { color: '#FFF', fontSize: 48, fontWeight: '900', marginTop: 2 },
  summaryIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  summaryFooter: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' },
  footerDetail: { color: '#FFF', fontSize: 13, fontWeight: '600', opacity: 0.9 },
  listSection: { gap: 8 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#1E293B', marginBottom: 12, marginLeft: 4, textTransform: 'uppercase', letterSpacing: 1 },
  alertCard: { backgroundColor: '#FFF', borderRadius: 24, padding: 20, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  cardHeader: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  iconContainer: { width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  alertTitle: { fontSize: 16, fontWeight: '800', color: '#111827', flex: 1 },
  alertSku: { fontSize: 12, color: '#9CA3AF', fontWeight: '600', marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  statsRow: { flexDirection: 'row', gap: 32, marginVertical: 16, paddingLeft: 62 },
  statBox: { gap: 2 },
  statLabel: { fontSize: 11, color: '#9CA3AF', fontWeight: '700', textTransform: 'uppercase' },
  statValue: { fontSize: 18, fontWeight: '800', color: '#111827' },
  progressBarBg: { height: 6, backgroundColor: '#F1F5F9', borderRadius: 3, overflow: 'hidden', marginLeft: 62 },
  progressBarFill: { height: '100%', borderRadius: 3 },
  emptyState: { backgroundColor: '#FFF', borderRadius: 32, padding: 40, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 20, elevation: 2 },
  emptyIconContainer: { width: 96, height: 96, borderRadius: 48, backgroundColor: '#ECFDF5', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  emptyTitle: { fontSize: 20, fontWeight: '900', color: '#111827', marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  emptyRefreshBtn: { backgroundColor: '#F1F5F9', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 16 },
  emptyRefreshText: { color: '#1C273F', fontWeight: '700', fontSize: 14 },
  errorTitle: { fontSize: 20, fontWeight: '900', color: '#111827', marginBottom: 8 },
  errorMessage: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 24 },
  retryBtn: { backgroundColor: '#1C273F', paddingHorizontal: 30, paddingVertical: 15, borderRadius: 16 },
  retryBtnText: { color: '#FFF', fontWeight: '700' },
});