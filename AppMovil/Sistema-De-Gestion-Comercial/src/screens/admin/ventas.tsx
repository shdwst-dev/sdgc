import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Dimensions, Alert, ActivityIndicator } from 'react-native';
import { FileText, ChevronRight, RefreshCw } from 'lucide-react-native';
import { CommonActions, useNavigation } from '@react-navigation/native';
import { getVentasPeriodo, VentaReciente, VentasPeriodoData } from '../../services/dashboard';
import { ApiError } from '../../services/apiClient';
import { clearToken, getToken, hydrateToken } from '../../services/storage';
import { GoogleChartView } from '../../components/GoogleChartView';
import { exportSaleReceiptPdf } from '../../lib/pdf';

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
  const [ventas, setVentas] = useState<VentaReciente[]>([]);
  const [ventasPeriodo, setVentasPeriodo] = useState<VentasPeriodoData | null>(null);
  const [selectedVenta, setSelectedVenta] = useState<VentaReciente | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rangeDays, setRangeDays] = useState<7 | 15 | 30>(30);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

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

  useEffect(() => {
    loadVentas().catch(() => { setError('No se pudo cargar las ventas.'); setIsLoading(false); });
  }, [loadVentas]);

  const openDetail = (venta: VentaReciente) => {
    setSelectedVenta(venta);
    setModalVisible(true);
  };

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
        metodoPago: selectedVenta.metodo_pago || ventasPeriodo?.series.metodos_pago[0]?.nombre,
        periodo: ventasPeriodo?.periodo_referencia.mes,
      });
    } catch (exportError) {
      Alert.alert('Error', exportError instanceof Error ? exportError.message : 'No se pudo exportar el PDF.');
    } finally {
      setIsExportingPdf(false);
    }
  }, [isExportingPdf, selectedVenta, ventasPeriodo]);

  // Métricas derivadas
  const filteredVentas = useMemo(() => {
    return ventas;
  }, [ventas, rangeDays]);

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

  // ─── Render item ─────────────────────────────────────────────────────────

  const renderSaleItem = ({ item }: { item: VentaReciente }) => {
    return (
      <TouchableOpacity style={styles.saleItem} onPress={() => openDetail(item)}>
        <View style={styles.saleItemLeft}>
          <View style={styles.iconContainer}>
            <FileText size={20} color="#FFF" />
          </View>
          <View>
            <Text style={styles.saleId}>{item.factura}</Text>
            <Text style={styles.customerText}>{item.responsable}</Text>
            <Text style={styles.dateText}>{formatDate(item.fecha)}</Text>
          </View>
        </View>
        <View style={styles.saleItemRight}>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.amountText}>{formatCurrency(item.monto)}</Text>
            <View style={[styles.statusBadge, { backgroundColor: '#DCFCE7' }]}>
              <Text style={[styles.statusText, { color: '#15803D' }]}>Completado</Text>
            </View>
          </View>
          <ChevronRight size={20} color="#9CA3AF" />
        </View>
      </TouchableOpacity>
    );
  };

  // ─── Loading / error states ──────────────────────────────────────────────

  if (isLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#1C273F" />
        <Text style={{ marginTop: 12, color: '#6B7280' }}>Cargando ventas...</Text>
      </View>
    );
  }

  if (error && ventas.length === 0) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: 32 }]}>
        <Text style={{ color: '#991B1B', fontWeight: '700', fontSize: 16, marginBottom: 8 }}>No se pudo cargar las ventas</Text>
        <Text style={{ color: '#7F1D1D', fontSize: 13, marginBottom: 16, textAlign: 'center' }}>{error}</Text>
        <TouchableOpacity
          style={{ backgroundColor: '#1C273F', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 }}
          onPress={() => loadVentas()}
        >
          <Text style={{ color: '#FFF', fontWeight: '600' }}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ─── Main render ─────────────────────────────────────────────────────────

  return (
      <ScrollView>
        <View style={styles.container}>
          <View style={styles.headerRow}>
            <Text style={styles.headerTitle}>Ventas</Text>
            <TouchableOpacity onPress={() => loadVentas(false)} disabled={isRefreshing}>
              {isRefreshing ? <ActivityIndicator size="small" color="#1C273F" /> : <RefreshCw size={20} color="#1C273F" />}
            </TouchableOpacity>
          </View>

          {ventasPeriodo?.periodo_referencia?.mes ? (
              <Text style={styles.periodoText}>{ventasPeriodo.periodo_referencia.mes}</Text>
          ) : null}

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
            <Text style={styles.sectionTitle}>Ventas por Fecha</Text>
            <GoogleChartView
                type="ColumnChart"
                data={ventasPorFechaChartData}
                height={240}
                options={{
                  backgroundColor: 'transparent',
                  colors: ['#2563EB'],
                  legend: { position: 'none' },
                  chartArea: { left: 48, right: 16, top: 22, bottom: 46, width: '100%', height: '72%' },
                  hAxis: { slantedText: true, slantedTextAngle: 30 },
                  vAxis: { minValue: 0 },
                }}
                emptyMessage="No hay ventas para graficar."
            />
          </View>

          <View style={styles.chartCard}>
            <Text style={styles.sectionTitle}>Ventas por Método de Pago</Text>
            <GoogleChartView
                type="PieChart"
                data={ventasPorMetodoChartData}
                height={240}
                options={{
                  backgroundColor: 'transparent',
                  pieHole: 0.45,
                  legend: { position: 'right' },
                  chartArea: { left: 20, right: 20, top: 16, bottom: 16, width: '100%', height: '82%' },
                }}
                emptyMessage="Sin registros por método de pago."
            />
          </View>

          <View style={styles.listContainer}>
            <Text style={styles.sectionTitle}>Ventas Recientes</Text>
            {filteredVentas.length === 0 ? (
              <Text style={styles.emptyText}>No hay ventas registradas.</Text>
            ) : (
              filteredVentas.map((item, index) => (
                <React.Fragment key={item.factura}>
                  {renderSaleItem({ item })}
                  {index < filteredVentas.length - 1 ? <View style={styles.separator} /> : null}
                </React.Fragment>
              ))
            )}
          </View>

          {/* Modal de detalle */}
          <Modal animationType="fade" transparent visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                {selectedVenta && (
                    <ScrollView showsVerticalScrollIndicator={false}>
                      <View style={styles.modalHeader}>
                        <View style={styles.modalIconBadge}><FileText size={32} color="#FFF" /></View>
                        <Text style={styles.modalTitle}>{selectedVenta.factura}</Text>
                        <Text style={styles.modalSubtitle}>{formatDate(selectedVenta.fecha)}</Text>
                      </View>

                      <View style={styles.clientBox}>
                        <Text style={styles.clientLabel}>Responsable</Text>
                        <Text style={styles.clientName}>{selectedVenta.responsable}</Text>
                      </View>

                      <View style={styles.clientBox}>
                        <Text style={styles.clientLabel}>Cliente</Text>
                        <Text style={styles.clientName}>{selectedVenta.cliente}</Text>
                      </View>

                      <View style={styles.totalsSection}>
                        <View style={[styles.totalRow, { marginTop: 10 }]}>
                          <Text style={styles.grandTotalLabel}>Total</Text>
                          <Text style={styles.grandTotalValue}>{formatCurrency(selectedVenta.monto)}</Text>
                        </View>
                      </View>

                      <View style={styles.modalActionsRow}>
                        <TouchableOpacity style={styles.exportBtn} onPress={exportSelectedVentaPdf} disabled={isExportingPdf}>
                          {isExportingPdf ? (
                            <ActivityIndicator size="small" color="#FFF" />
                          ) : (
                            <Text style={styles.exportBtnText}>Exportar PDF</Text>
                          )}
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.closeBtn} onPress={() => setModalVisible(false)}>
                          <Text style={styles.closeBtnText}>Cerrar</Text>
                        </TouchableOpacity>
                      </View>
                    </ScrollView>
                )}
              </View>
            </View>
          </Modal>
        </View>
      </ScrollView>

  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB', padding: 16 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, marginTop: 40 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#1C273F' },
  periodoText: { fontSize: 12, color: '#6B7280', marginBottom: 12 },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  filterBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: '#CBD5E1', backgroundColor: '#FFF' },
  filterBtnActive: { backgroundColor: '#1C273F', borderColor: '#1C273F' },
  filterBtnText: { color: '#334155', fontSize: 12, fontWeight: '600' },
  filterBtnTextActive: { color: '#FFF' },
  summaryContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  summaryCard: { backgroundColor: '#FFF', width: (width - 48) / 3, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  summaryLabel: { fontSize: 10, color: '#6B7280', marginBottom: 4 },
  summaryValue: { fontSize: 14, fontWeight: 'bold', color: '#101828' },
  chartCard: { backgroundColor: '#FFF', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 16, padding: 16 },
  listContainer: { backgroundColor: '#FFF', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', flex: 1 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#101828', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  saleItem: { flexDirection: 'row', padding: 16, alignItems: 'center', justifyContent: 'space-between' },
  saleItemLeft: { flexDirection: 'row', alignItems: 'center' },
  iconContainer: { width: 40, height: 40, backgroundColor: '#1C273F', borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  saleId: { fontSize: 14, fontWeight: 'bold', color: '#101828' },
  customerText: { fontSize: 12, color: '#6B7280' },
  dateText: { fontSize: 11, color: '#9CA3AF' },
  saleItemRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  amountText: { fontSize: 14, fontWeight: 'bold', color: '#101828', textAlign: 'right' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, marginTop: 4 },
  statusText: { fontSize: 10, fontWeight: '600' },
  separator: { height: 1, backgroundColor: '#F3F4F6' },
  emptyText: { textAlign: 'center', color: '#6B7280', fontSize: 14, paddingVertical: 20 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#FFF', width: '90%', borderRadius: 20, padding: 20, maxHeight: '80%' },
  modalHeader: { alignItems: 'center', marginBottom: 24 },
  modalIconBadge: { width: 64, height: 64, backgroundColor: '#1C273F', borderRadius: 32, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#101828' },
  modalSubtitle: { fontSize: 14, color: '#6B7280' },
  clientBox: { backgroundColor: '#F9FAFB', padding: 12, borderRadius: 10, marginBottom: 12 },
  clientLabel: { fontSize: 11, color: '#6B7280', marginBottom: 2 },
  clientName: { fontSize: 14, fontWeight: '600', color: '#101828' },
  totalsSection: { borderTopWidth: 2, borderTopColor: '#E5E7EB', paddingTop: 12, marginBottom: 24 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  grandTotalLabel: { fontSize: 16, fontWeight: 'bold', color: '#101828' },
  grandTotalValue: { fontSize: 18, fontWeight: 'bold', color: '#101828' },
  modalActionsRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  exportBtn: { flex: 1, padding: 14, borderRadius: 10, alignItems: 'center', backgroundColor: '#1C273F' },
  exportBtnText: { color: '#FFF', fontWeight: '700' },
  closeBtn: { padding: 14, borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10, alignItems: 'center' },
  closeBtnText: { color: '#101828', fontWeight: '500' },
});