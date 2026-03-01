import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, FlatList, Dimensions } from 'react-native';
import { FileText, ChevronRight, X } from 'lucide-react-native';

const { width } = Dimensions.get('window');

interface Sale {
  id: string;
  date: string;
  customer: string;
  amount: string;
  items: number;
  status: 'Completado' | 'Pendiente' | 'Cancelado';
}

const salesData: Sale[] = [
  { id: '#12345', date: '22 Feb 2026', customer: 'Juan Pérez', amount: '$1,250', items: 3, status: 'Completado' },
  { id: '#12346', date: '22 Feb 2026', customer: 'María García', amount: '$890', items: 2, status: 'Completado' },
  { id: '#12347', date: '21 Feb 2026', customer: 'Carlos López', amount: '$2,340', items: 5, status: 'Pendiente' },
  { id: '#12348', date: '21 Feb 2026', customer: 'Ana Martínez', amount: '$675', items: 1, status: 'Completado' },
  { id: '#12349', date: '20 Feb 2026', customer: 'Luis Rodríguez', amount: '$1,890', items: 4, status: 'Completado' },
  { id: '#12350', date: '20 Feb 2026', customer: 'Sofia González', amount: '$450', items: 2, status: 'Cancelado' },
];

export default function Ventas() {
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const openDetail = (sale: Sale) => {
    setSelectedSale(sale);
    setModalVisible(true);
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'Completado': return { bg: '#DCFCE7', text: '#15803D' };
      case 'Pendiente': return { bg: '#FEF9C3', text: '#A16207' };
      case 'Cancelado': return { bg: '#FEE2E2', text: '#B91C1C' };
      default: return { bg: '#F3F4F6', text: '#374151' };
    }
  };

  const renderSaleItem = ({ item }: { item: Sale }) => {
    const statusColors = getStatusStyle(item.status);
    
    return (
      <TouchableOpacity 
        style={styles.saleItem} 
        onPress={() => openDetail(item)}
      >
        <View style={styles.saleItemLeft}>
          <View style={styles.iconContainer}>
            <FileText size={20} color="#FFF" />
          </View>
          <View>
            <Text style={styles.saleId}>{item.id}</Text>
            <Text style={styles.customerText}>{item.customer}</Text>
            <Text style={styles.dateText}>{item.date}</Text>
          </View>
        </View>
        <View style={styles.saleItemRight}>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.amountText}>{item.amount}</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusColors.bg }]}>
              <Text style={[styles.statusText, { color: statusColors.text }]}>{item.status}</Text>
            </View>
          </View>
          <ChevronRight size={20} color="#9CA3AF" />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>Ventas</Text>

      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total Hoy</Text>
          <Text style={styles.summaryValue}>$4,480</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Ventas</Text>
          <Text style={styles.summaryValue}>15</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Promedio</Text>
          <Text style={styles.summaryValue}>$299</Text>
        </View>
      </View>

      <View style={styles.listContainer}>
        <Text style={styles.sectionTitle}>Transacciones Recientes</Text>
        <FlatList
          data={salesData}
          renderItem={renderSaleItem}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      </View>

      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedSale && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.modalHeader}>
                  <View style={styles.modalIconBadge}>
                    <FileText size={32} color="#FFF" />
                  </View>
                  <Text style={styles.modalTitle}>Factura {selectedSale.id}</Text>
                  <Text style={styles.modalSubtitle}>{selectedSale.date}</Text>
                </View>

                <View style={styles.clientBox}>
                  <Text style={styles.clientLabel}>Cliente</Text>
                  <Text style={styles.clientName}>{selectedSale.customer}</Text>
                </View>

                <View style={styles.itemsList}>
                  <View style={styles.itemRow}>
                    <Text style={styles.itemLabel}>Producto 1</Text>
                    <Text style={styles.itemValue}>$500</Text>
                  </View>
                  <View style={styles.itemRow}>
                    <Text style={styles.itemLabel}>Producto 2</Text>
                    <Text style={styles.itemValue}>$400</Text>
                  </View>
                  <View style={[styles.itemRow, { borderBottomWidth: 0 }]}>
                    <Text style={styles.itemLabel}>Producto 3</Text>
                    <Text style={styles.itemValue}>$350</Text>
                  </View>
                </View>

                <View style={styles.totalsSection}>
                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Subtotal</Text>
                    <Text style={styles.totalValue}>$1,250</Text>
                  </View>
                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>IVA (16%)</Text>
                    <Text style={styles.totalValue}>$200</Text>
                  </View>
                  <View style={[styles.totalRow, { marginTop: 10 }]}>
                    <Text style={styles.grandTotalLabel}>Total</Text>
                    <Text style={styles.grandTotalValue}>{selectedSale.amount}</Text>
                  </View>
                </View>

                <TouchableOpacity style={styles.downloadBtn}>
                  <Text style={styles.downloadBtnText}>Descargar Factura</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.closeBtn} 
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.closeBtnText}>Cerrar</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB', padding: 16 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#1C273F', marginBottom: 20, marginTop: 40 },
  summaryContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  summaryCard: { backgroundColor: '#FFF', width: (width - 48) / 3, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  summaryLabel: { fontSize: 10, color: '#6B7280', marginBottom: 4 },
  summaryValue: { fontSize: 16, fontWeight: 'bold', color: '#101828' },
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
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#FFF', width: '90%', borderRadius: 20, padding: 20, maxHeight: '80%' },
  modalHeader: { alignItems: 'center', marginBottom: 24 },
  modalIconBadge: { width: 64, height: 64, backgroundColor: '#1C273F', borderRadius: 32, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#101828' },
  modalSubtitle: { fontSize: 14, color: '#6B7280' },
  clientBox: { backgroundColor: '#F9FAFB', padding: 12, borderRadius: 10, marginBottom: 16 },
  clientLabel: { fontSize: 11, color: '#6B7280', marginBottom: 2 },
  clientName: { fontSize: 14, fontWeight: '600', color: '#101828' },
  itemsList: { marginBottom: 20 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  itemLabel: { fontSize: 14, color: '#4B5563' },
  itemValue: { fontSize: 14, fontWeight: '500', color: '#101828' },
  totalsSection: { borderTopWidth: 2, borderTopColor: '#E5E7EB', paddingTop: 12, marginBottom: 24 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  totalLabel: { fontSize: 14, color: '#6B7280' },
  totalValue: { fontSize: 14, color: '#101828' },
  grandTotalLabel: { fontSize: 16, fontWeight: 'bold', color: '#101828' },
  grandTotalValue: { fontSize: 18, fontWeight: 'bold', color: '#101828' },
  downloadBtn: { backgroundColor: '#1C273F', padding: 14, borderRadius: 10, alignItems: 'center', marginBottom: 10 },
  downloadBtnText: { color: '#FFF', fontWeight: '600', fontSize: 14 },
  closeBtn: { padding: 14, borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10, alignItems: 'center' },
  closeBtnText: { color: '#101828', fontWeight: '500' }
});