import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Dimensions, Alert, ActivityIndicator } from 'react-native';
import { FileText, ChevronRight, RefreshCw, X } from 'lucide-react-native';
import { CommonActions, useNavigation } from '@react-navigation/native';
import { getVentasPeriodo, VentaReciente, VentasPeriodoData } from '../../services/dashboard';
import { ApiError } from '../../services/apiClient';
import { clearToken, getToken, hydrateToken } from '../../services/storage';
import { GoogleChartView } from '../../components/GoogleChartView';
import { exportSaleReceiptPdf } from '../../lib/pdf';
import { useToast } from '../../components/Toast';

const { width } = Dimensions.get('window');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function Ventas() {
  const navigation = useNavigation();
  const { showToast } = useToast();

  // 1. All States
  const [ventas, setVentas] = useState<VentaReciente[]>([]);
  const [ventasPeriodo, setVentasPeriodo] = useState<VentasPeriodoData | null>(null);
  const [selectedVenta, setSelectedVenta] = useState<VentaReciente | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rangeDays, setRangeDays] = useState<7 | 15 | 30>(30);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [displayCount, setDisplayCount] = useState(10);

  // 2. All Callbacks
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

  const loadVentas = useCallback(async (showFullLoader = true, days: 7 | 15 | 30 = rangeDays) => {
    const token = await requireToken();
    if (!token) return;

    if (showFullLoader) setIsLoading(true);
    else setIsRefreshing(true);
    setError(null);

    try {
      const end = new Date();
      const start = new Date(end);
      start.setDate(end.getDate() - days + 1);

      const inicio = start.toISOString().slice(0, 10);
      const fin = end.toISOString().slice(0, 10);

      const data = await getVentasPeriodo(token, { inicio, fin });
      setVentasPeriodo(data);
      setVentas(
        data.ventas.map((venta) => ({
          factura: venta.factura,
          cliente: venta.cliente,
          responsable: venta.responsable,
          monto: venta.monto,
          fecha: venta.fecha,
          metodo_pago: venta.metodo_pago,
        })),
      );
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 401) {
        await clearToken();
        Alert.alert('Sesión expirada', 'Inicia sesión nuevamente.');
        goToLogin();
        return;
      }
      const message = requestError instanceof Error ? requestError.message : 'No se pudo cargar las ventas.';
      setError(message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [goToLogin, rangeDays, requireToken]);

  const exportSelectedVentaPdf = useCallback(async () => {
    if (!selectedVenta || isExportingPdf) {
      return;
    }

    try {
      setIsExportingPdf(true);
      await exportSaleReceiptPdf({
        factura: selectedVenta.factura,
        cliente: selectedVenta.cliente,
        responsable: selectedVenta.responsable,
        monto: selectedVenta.monto,
        fecha: selectedVenta.fecha,
        metodoPago: selectedVenta.metodo_pago || (ventasPeriodo?.series.metodos_pago[0]?.nombre || 'Efectivo'),
        periodo: ventasPeriodo?.periodo_referencia.mes || '',
      });
    } catch (exportError) {
      showToast({ message: exportError instanceof Error ? exportError.message : 'No se pudo exportar el PDF.', type: 'error' });
    } finally {
      setIsExportingPdf(false);
    }
  }, [isExportingPdf, selectedVenta, ventasPeriodo, showToast]);

  const handleLoadMore = useCallback(() => {
    if (displayCount < ventas.length) {
      setDisplayCount((prev) => prev + 10);
    }
  }, [displayCount, ventas.length]);

  // 3. Effects
  useEffect(() => {
    loadVentas().catch(() => { setError('No se pudo cargar las ventas.'); setIsLoading(false); });
  }, [loadVentas]);

  // 4. Memos
  const filteredVentas = useMemo(() => ventas, [ventas]);

  const totalVentas = ventasPeriodo?.totales.ventas ?? filteredVentas.reduce((sum, v) => sum + v.monto, 0);
  const ventasCount = ventasPeriodo?.totales.transacciones ?? filteredVentas.length;
  const promedio = ventasCount > 0 ? totalVentas / ventasCount : 0;

  const ventasPorFechaChartData = useMemo<(string | number)[][]>(() => {
    if (!ventasPeriodo?.series.labels.length) {
      return [['Fecha', 'Monto']];
    }
    return [
      ['Fecha', 'Monto'],
      ...ventasPeriodo.series.labels.map((label, index) => [
        label,
        Number(ventasPeriodo.series.ventas_diarias[index] ?? 0),
      ]),
    ];
  }, [ventasPeriodo]);

  const ventasPorMetodoChartData = useMemo<(string | number)[][]>(() => {
    if (!ventasPeriodo?.series.metodos_pago.length) {
      return [['Método de Pago', 'Total']];
    }
    return [
      ['Método de Pago', 'Total'],
      ...ventasPeriodo.series.metodos_pago.map((item) => [item.nombre, item.total]),
    ];
  }, [ventasPeriodo]);

  const paginatedVentas = useMemo(() => {
    return filteredVentas.slice(0, displayCount);
  }, [filteredVentas, displayCount]);

  // 5. Handlers
  const handleScroll = (event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 100;
    if (isCloseToBottom) {
      handleLoadMore();
    }
  };

  const openDetail = (venta: VentaReciente) => {
    setSelectedVenta(venta);
    setModalVisible(true);
  };

  // 6. Early Returns (ONLY AFTER ALL HOOKS)
  if (isLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#1C273F" />
        <Text style={{ marginTop: 12, color: '#6B7280', fontWeight: '600' }}>Cargando ventas...</Text>
      </View>
    );
  }

  if (error && ventas.length === 0) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: 32 }]}>
        <Text style={{ color: '#991B1B', fontWeight: '800', fontSize: 18, marginBottom: 8 }}>Error al cargar</Text>
        <Text style={{ color: '#6B7280', fontSize: 14, marginBottom: 24, textAlign: 'center' }}>{error}</Text>
        <TouchableOpacity
          style={styles.retryBtn}
          onPress={() => loadVentas()}
        >
          <Text style={{ color: '#FFF', fontWeight: '700' }}>Intentar de nuevo</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // 7. Full Render logic
  const renderSaleItem = (item: VentaReciente, index: number) => (
    <React.Fragment key={item.factura}>
      <TouchableOpacity style={styles.saleItem} onPress={() => openDetail(item)}>
        <View style={styles.saleItemLeft}>
          <View style={styles.iconContainer}>
            <FileText size={20} color="#FFF" />
          </View>
          <View>
            <Text style={styles.saleId}>{item.factura}</Text>
            <Text style={styles.customerText} numberOfLines={1}>{item.responsable}</Text>
            <Text style={styles.dateText}>{formatDate(item.fecha)}</Text>
          </View>
        </View>
        <View style={styles.saleItemRight}>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.amountText}>{formatCurrency(item.monto)}</Text>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>Completado</Text>
            </View>
          </View>
          <ChevronRight size={20} color="#D1D5DB" />
        </View>
      </TouchableOpacity>
      {index < paginatedVentas.length - 1 && <View style={styles.separator} />}
    </React.Fragment>
  );

  return (
    <ScrollView 
      style={styles.container} 
      onScroll={handleScroll} 
      scrollEventThrottle={400}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>Ventas</Text>
        <TouchableOpacity 
          style={styles.refreshBtn}
          onPress={() => loadVentas(false)} 
          disabled={isRefreshing}
        >
          {isRefreshing ? <ActivityIndicator size="small" color="#1C273F" /> : <RefreshCw size={20} color="#1C273F" />}
        </TouchableOpacity>
      </View>

      {ventasPeriodo?.periodo_referencia?.mes && (
        <Text style={styles.periodoText}>{ventasPeriodo.periodo_referencia.mes}</Text>
      )}

      <View style={styles.filterRow}>
        {[7, 15, 30].map((days) => (
          <TouchableOpacity
            key={days}
            style={[styles.filterBtn, rangeDays === days && styles.filterBtnActive]}
            onPress={() => setRangeDays(days as 7 | 15 | 30)}
          >
            <Text style={[styles.filterBtnText, rangeDays === days && styles.filterBtnTextActive]}>{days} d</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total</Text>
          <Text style={styles.summaryValue}>{formatCurrency(totalVentas)}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Ventas</Text>
          <Text style={styles.summaryValue}>{ventasCount}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Promedio</Text>
          <Text style={styles.summaryValue}>{formatCurrency(promedio)}</Text>
        </View>
      </View>

      <View style={styles.chartCard}>
        <Text style={styles.sectionTitle}>Tendencia Diaria</Text>
        <GoogleChartView
          type="ColumnChart"
          data={ventasPorFechaChartData}
          height={220}
          options={{
            backgroundColor: 'transparent',
            colors: ['#1C273F'],
            legend: { position: 'none' },
            chartArea: { left: 40, right: 10, top: 20, bottom: 40, width: '100%', height: '70%' },
            hAxis: { slantedText: true, slantedTextAngle: 45, textStyle: { fontSize: 10 } },
            vAxis: { minValue: 0, textStyle: { fontSize: 10 } },
          }}
          emptyMessage="No hay datos de tendencia."
        />
      </View>

      <View style={styles.chartCard}>
        <Text style={styles.sectionTitle}>Métodos de Pago</Text>
        <GoogleChartView
          type="PieChart"
          data={ventasPorMetodoChartData}
          height={220}
          options={{
            backgroundColor: 'transparent',
            pieHole: 0.5,
            colors: ['#1C273F', '#3B4B6B', '#5A6B8A', '#8E9AAF'],
            legend: { position: 'right', textStyle: { fontSize: 11 } },
            chartArea: { left: 10, right: 10, top: 20, bottom: 20, width: '100%', height: '80%' },
          }}
          emptyMessage="No hay datos de pago."
        />
      </View>

      <View style={styles.listContainer}>
        <Text style={styles.sectionTitle}>Historial Reciente</Text>
        {filteredVentas.length === 0 ? (
          <Text style={styles.emptyText}>Sin registros de ventas.</Text>
        ) : (
          paginatedVentas.map((item, index) => renderSaleItem(item, index))
        )}
        
        {displayCount < filteredVentas.length && (
          <View style={{ paddingVertical: 20, alignItems: 'center' }}>
            <ActivityIndicator size="small" color="#1C273F" />
          </View>
        )}
      </View>

      <View style={{ height: 40 }} />

      {/* Detail Modal */}
      <Modal animationType="slide" transparent visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedVenta && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.modalCloseRow}>
                  <TouchableOpacity onPress={() => setModalVisible(false)}>
                    <X size={24} color="#1F2937" />
                  </TouchableOpacity>
                </View>

                <View style={styles.modalHeader}>
                  <View style={styles.modalIconBadge}><FileText size={32} color="#FFF" /></View>
                  <Text style={styles.modalTitle}>{selectedVenta.factura}</Text>
                  <Text style={styles.modalSubtitle}>{formatDate(selectedVenta.fecha)}</Text>
                </View>

                <View style={styles.detailGrid}>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Vendedor</Text>
                    <Text style={styles.detailValue}>{selectedVenta.responsable}</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Cliente</Text>
                    <Text style={styles.detailValue}>{selectedVenta.cliente}</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Pago</Text>
                    <Text style={styles.detailValue}>{selectedVenta.metodo_pago || 'N/A'}</Text>
                  </View>
                </View>

                <View style={styles.totalSection}>
                  <Text style={styles.totalLabel}>Monto Total</Text>
                  <Text style={styles.totalValue}>{formatCurrency(selectedVenta.monto)}</Text>
                </View>

                <TouchableOpacity 
                  style={[styles.primaryBtn, isExportingPdf && { opacity: 0.7 }]} 
                  onPress={exportSelectedVentaPdf} 
                  disabled={isExportingPdf}
                >
                  {isExportingPdf ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={styles.primaryBtnText}>Descargar Recibo (PDF)</Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6', padding: 16 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 40, marginBottom: 8 },
  headerTitle: { fontSize: 32, fontWeight: '900', color: '#1C273F', letterSpacing: -1 },
  refreshBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  periodoText: { fontSize: 16, color: '#6B7280', fontWeight: '600', marginBottom: 20 },
  filterRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  filterBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 25, backgroundColor: '#FFF', elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 2 },
  filterBtnActive: { backgroundColor: '#1C273F' },
  filterBtnText: { color: '#6B7280', fontWeight: '700', fontSize: 14 },
  filterBtnTextActive: { color: '#FFF' },
  summaryContainer: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  summaryCard: { flex: 1, backgroundColor: '#FFF', padding: 16, borderRadius: 20, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  summaryLabel: { fontSize: 12, color: '#9CA3AF', fontWeight: '700', textTransform: 'uppercase', marginBottom: 4 },
  summaryValue: { fontSize: 16, fontWeight: '800', color: '#111827' },
  chartCard: { backgroundColor: '#FFF', borderRadius: 24, padding: 20, marginBottom: 20, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 15, shadowOffset: { width: 0, height: 5 }, elevation: 3 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 16 },
  listContainer: { backgroundColor: '#FFF', borderRadius: 24, padding: 4, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 15, elevation: 3, marginBottom: 40 },
  saleItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  saleItemLeft: { flexDirection: 'row', gap: 12, alignItems: 'center', flex: 1 },
  iconContainer: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#1C273F', justifyContent: 'center', alignItems: 'center' },
  saleId: { fontSize: 15, fontWeight: '800', color: '#111827' },
  customerText: { fontSize: 13, color: '#6B7280', fontWeight: '500' },
  dateText: { fontSize: 11, color: '#9CA3AF' },
  saleItemRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  amountText: { fontSize: 16, fontWeight: '800', color: '#111827' },
  statusBadge: { backgroundColor: '#DCFCE7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, marginTop: 4 },
  statusText: { fontSize: 10, color: '#15803D', fontWeight: '700' },
  separator: { height: 1, backgroundColor: '#F3F4F6' },
  emptyText: { textAlign: 'center', padding: 40, color: '#9CA3AF', fontWeight: '600' },
  retryBtn: { backgroundColor: '#1C273F', paddingHorizontal: 30, paddingVertical: 15, borderRadius: 15 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, maxHeight: '90%' },
  modalCloseRow: { alignItems: 'flex-end', marginBottom: 8 },
  modalHeader: { alignItems: 'center', marginBottom: 30 },
  modalIconBadge: { width: 80, height: 80, borderRadius: 28, backgroundColor: '#1C273F', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 26, fontWeight: '900', color: '#111827' },
  modalSubtitle: { fontSize: 15, color: '#6B7280', fontWeight: '500' },
  detailGrid: { gap: 12, marginBottom: 30 },
  detailItem: { backgroundColor: '#F9FAFB', padding: 16, borderRadius: 16 },
  detailLabel: { fontSize: 11, color: '#9CA3AF', fontWeight: '800', textTransform: 'uppercase', marginBottom: 4 },
  detailValue: { fontSize: 16, fontWeight: '700', color: '#111827' },
  totalSection: { padding: 20, backgroundColor: '#1C273F', borderRadius: 20, marginBottom: 24, alignItems: 'center' },
  totalLabel: { color: '#9CA3AF', fontSize: 13, fontWeight: '700', textTransform: 'uppercase' },
  totalValue: { color: '#FFF', fontSize: 28, fontWeight: '900' },
  primaryBtn: { backgroundColor: '#1C273F', padding: 20, borderRadius: 20, alignItems: 'center' },
  primaryBtnText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
});