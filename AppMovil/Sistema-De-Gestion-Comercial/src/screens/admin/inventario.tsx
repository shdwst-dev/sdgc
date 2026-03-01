import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, FlatList, Alert } from 'react-native';
import { Plus, Search, Filter, Edit, Trash2, X } from 'lucide-react-native';

interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  stock: number;
  price: string;
}

const productsData: Product[] = [
  { id: '1', sku: 'LPT-001', name: 'Laptop Dell XPS 15', category: 'Electrónica', stock: 15, price: '$1,299' },
  { id: '2', sku: 'PHN-002', name: 'iPhone 14 Pro', category: 'Electrónica', stock: 8, price: '$999' },
  { id: '3', sku: 'TV-003', name: 'Samsung 4K TV 55"', category: 'Electrónica', stock: 12, price: '$799' },
  { id: '4', sku: 'CHR-004', name: 'Silla Oficina Ergonómica', category: 'Muebles', stock: 25, price: '$249' },
  { id: '5', sku: 'DSK-005', name: 'Escritorio Ejecutivo', category: 'Muebles', stock: 5, price: '$399' },
  { id: '6', sku: 'HDH-006', name: 'Auriculares Sony WH-1000XM5', category: 'Audio', stock: 30, price: '$349' },
];

export default function Inventario() {
  const [products] = useState<Product[]>(productsData);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);

  const handleEdit = (product: Product) => {
    setSelectedProduct(product);
    setIsModalVisible(true);
  };

  const handleDelete = (name: string) => {
    Alert.alert("Eliminar", `¿Estás seguro de eliminar ${name}?`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Eliminar", style: "destructive" }
    ]);
  };

  const renderProductItem = ({ item }: { item: Product }) => (
    <TouchableOpacity 
      style={styles.productRow} 
      onPress={() => handleEdit(item)}
    >
      <View style={styles.skuCol}>
        <Text style={styles.cellText}>{item.sku}</Text>
      </View>
      <View style={styles.nameCol}>
        <Text style={styles.productNameText}>{item.name}</Text>
        <Text style={styles.categoryText}>{item.category}</Text>
      </View>
      <View style={styles.stockCol}>
        <View style={[
          styles.badge, 
          { backgroundColor: item.stock < 10 ? '#FEE2E2' : '#DCFCE7' }
        ]}>
          <Text style={[
            styles.badgeText, 
            { color: item.stock < 10 ? '#B91C1C' : '#15803D' }
          ]}>
            {item.stock}
          </Text>
        </View>
      </View>
      <View style={styles.actionsCol}>
        <TouchableOpacity onPress={() => handleDelete(item.name)}>
          <Trash2 size={18} color="#EF4444" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>Inventario</Text>

      <View style={styles.headerActions}>
        <View style={styles.searchBar}>
          <Search size={18} color="#9CA3AF" />
          <TextInput 
            placeholder="Buscar producto..." 
            style={styles.searchInput}
          />
        </View>
        <TouchableOpacity style={styles.filterBtn}>
          <Filter size={20} color="#101828" />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.addBtn}>
        <Plus size={20} color="#FFF" />
        <Text style={styles.addBtnText}>Agregar Nuevo Producto</Text>
      </TouchableOpacity>

      <View style={styles.tableCard}>
        <View style={styles.tableHeader}>
          <Text style={styles.headerTextCol}>SKU</Text>
          <Text style={[styles.headerTextCol, { flex: 2 }]}>Producto</Text>
          <Text style={styles.headerTextCol}>Stock</Text>
          <Text style={styles.headerTextCol}>Acción</Text>
        </View>
        <FlatList
          data={products}
          renderItem={renderProductItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      </View>

      <Modal
        animationType="slide"
        transparent={true}
        visible={isModalVisible}
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Detalles del Producto</Text>
              <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                <X size={24} color="#101828" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalForm}>
              <Text style={styles.label}>SKU</Text>
              <TextInput style={styles.inputDisabled} value={selectedProduct?.sku} editable={false} />
              
              <Text style={styles.label}>Nombre del Producto</Text>
              <TextInput style={styles.input} defaultValue={selectedProduct?.name} />
              
              <Text style={styles.label}>Categoría</Text>
              <TextInput style={styles.input} defaultValue={selectedProduct?.category} />

              <View style={styles.rowInputs}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.label}>Stock</Text>
                  <TextInput style={styles.input} keyboardType="numeric" defaultValue={selectedProduct?.stock.toString()} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Precio</Text>
                  <TextInput style={styles.input} defaultValue={selectedProduct?.price} />
                </View>
              </View>

              <View style={styles.modalFooter}>
                <TouchableOpacity 
                  style={styles.cancelBtn} 
                  onPress={() => setIsModalVisible(false)}
                >
                  <Text style={styles.cancelBtnText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn}>
                  <Text style={styles.saveBtnText}>Guardar Cambios</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB', padding: 16 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#1C273F', marginBottom: 20, marginTop: 40 },
  headerActions: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  searchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, paddingHorizontal: 12 },
  searchInput: { flex: 1, height: 40, marginLeft: 8, fontSize: 14 },
  filterBtn: { padding: 10, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8 },
  addBtn: { backgroundColor: '#1C273F', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 12, borderRadius: 8, marginBottom: 16, gap: 8 },
  addBtnText: { color: '#FFF', fontWeight: '600' },
  tableCard: { backgroundColor: '#FFF', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', flex: 1, overflow: 'hidden' },
  tableHeader: { flexDirection: 'row', backgroundColor: '#1C273F', padding: 12 },
  headerTextCol: { flex: 1, color: '#FFF', fontSize: 12, fontWeight: 'bold', textAlign: 'center' },
  productRow: { flexDirection: 'row', padding: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', alignItems: 'center' },
  skuCol: { flex: 1, alignItems: 'center' },
  nameCol: { flex: 2, paddingHorizontal: 4 },
  stockCol: { flex: 1, alignItems: 'center' },
  actionsCol: { flex: 1, alignItems: 'center' },
  cellText: { fontSize: 11, color: '#101828' },
  productNameText: { fontSize: 12, fontWeight: 'bold', color: '#101828' },
  categoryText: { fontSize: 10, color: '#6B7280' },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 10, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#FFF', width: '90%', borderRadius: 16, padding: 20, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#101828' },
  modalForm: { marginBottom: 10 },
  label: { fontSize: 12, color: '#6B7280', marginBottom: 4 },
  input: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 6, padding: 10, fontSize: 14, marginBottom: 12, color: '#101828' },
  inputDisabled: { backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 6, padding: 10, fontSize: 14, marginBottom: 12, color: '#9CA3AF' },
  rowInputs: { flexDirection: 'row' },
  modalFooter: { flexDirection: 'row', gap: 10, marginTop: 10 },
  cancelBtn: { flex: 1, padding: 12, borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, alignItems: 'center' },
  cancelBtnText: { color: '#101828', fontWeight: '500' },
  saveBtn: { flex: 1, padding: 12, backgroundColor: '#1C273F', borderRadius: 8, alignItems: 'center' },
  saveBtnText: { color: '#FFF', fontWeight: '600' }
});