import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Image, FlatList, Dimensions, Alert } from 'react-native';
import { Search, SlidersHorizontal, X } from 'lucide-react-native';

const { width } = Dimensions.get('window');
const columnWidth = (width - 40) / 2;

const categories = [
  { name: 'Ropa', icon: '👕' },
  { name: 'Electrónica', icon: '📱' },
  { name: 'Hogar', icon: '🏠' },
  { name: 'Belleza', icon: '💄' },
];

const productsData = [
  { id: 1, name: 'Vestido Elegante de Verano', price: 1299, category: 'Ropa', image: 'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=500' },
  { id: 2, name: 'Audífonos Inalámbricos Premium', price: 2499, category: 'Electrónica', image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500' },
  { id: 3, name: 'Smartphone Pro Max', price: 18500, category: 'Electrónica', image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=500' },
  { id: 4, name: 'Tenis Deportivos', price: 1800, category: 'Ropa', image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500' },
  { id: 5, name: 'Silla Ergonómica', price: 3500, category: 'Hogar', image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500' },
];

export default function Buscar() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [sortBy, setSortBy] = useState('relevance');
  const [showFilters, setShowFilters] = useState(false);

  const filteredProducts = useMemo(() => {
    let filtered = productsData;

    if (searchQuery) {
      filtered = filtered.filter((p) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (selectedCategory !== 'Todas') {
      filtered = filtered.filter((p) => p.category === selectedCategory);
    }

    if (sortBy === 'price-low') {
      filtered = [...filtered].sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price-high') {
      filtered = [...filtered].sort((a, b) => b.price - a.price);
    }

    return filtered;
  }, [searchQuery, selectedCategory, sortBy]);

  const handleSortPress = () => {
    Alert.alert(
      "Ordenar por",
      "Selecciona una opción",
      [
        { text: "Relevancia", onPress: () => setSortBy('relevance') },
        { text: "Precio: Menor a Mayor", onPress: () => setSortBy('price-low') },
        { text: "Precio: Mayor a Menor", onPress: () => setSortBy('price-high') },
        { text: "Cancelar", style: "cancel" }
      ]
    );
  };

  const renderProduct = ({ item }: { item: any }) => (
    <View style={styles.productCard}>
      <View style={styles.imageContainer}>
        <Image source={{ uri: item.image }} style={styles.productImage} />
      </View>
      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
        <Text style={styles.productPrice}>${item.price.toLocaleString('es-MX')}</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => Alert.alert("Carrito", `${item.name} agregado`)}
        >
          <Text style={styles.addButtonText}>Agregar al Carrito</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchHeader}>
        <View style={styles.searchBar}>
          <Search size={20} color="#9CA3AF" />
          <TextInput
            placeholder="Buscar productos, marcas..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
            placeholderTextColor="#9CA3AF"
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={20} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.controlBar}>
        <TouchableOpacity 
          style={[styles.controlBtn, showFilters && styles.controlBtnActive]}
          onPress={() => setShowFilters(!showFilters)}
        >
          <SlidersHorizontal size={18} color={showFilters ? "#FFF" : "#101828"} />
          <Text style={[styles.controlBtnText, showFilters && { color: "#FFF" }]}>Filtros</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.sortBtn} onPress={handleSortPress}>
          <Text style={styles.sortBtnText}>
            {sortBy === 'relevance' ? 'Relevancia' : sortBy === 'price-low' ? 'Precio ↓' : 'Precio ↑'}
          </Text>
        </TouchableOpacity>
      </View>

      {showFilters && (
        <View style={styles.filtersPanel}>
          <Text style={styles.filterTitle}>Categorías</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catList}>
            <TouchableOpacity 
              style={[styles.catBtn, selectedCategory === 'Todas' && styles.catBtnActive]}
              onPress={() => setSelectedCategory('Todas')}
            >
              <Text style={[styles.catBtnText, selectedCategory === 'Todas' && { color: "#FFF" }]}>Todas</Text>
            </TouchableOpacity>
            {categories.map((cat, i) => (
              <TouchableOpacity 
                key={i}
                style={[styles.catBtn, selectedCategory === cat.name && styles.catBtnActive]}
                onPress={() => setSelectedCategory(cat.name)}
              >
                <Text style={[styles.catBtnText, selectedCategory === cat.name && { color: "#FFF" }]}>
                  {cat.icon} {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <View style={styles.resultsHeader}>
        <Text style={styles.resultsCount}>{filteredProducts.length} productos encontrados</Text>
      </View>

      <FlatList
        data={filteredProducts}
        renderItem={renderProduct}
        keyExtractor={(item) => item.id.toString()}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listPadding}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No se encontraron productos</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  searchHeader: { padding: 16, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB', paddingTop: 50 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 10, paddingHorizontal: 12, height: 48 },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 14, color: '#101828' },
  controlBar: { flexDirection: 'row', padding: 16, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB', gap: 10 },
  controlBtn: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, paddingHorizontal: 15, height: 40, gap: 8 },
  controlBtnActive: { backgroundColor: '#1C273F', borderColor: '#1C273F' },
  controlBtnText: { fontSize: 14, fontWeight: '500', color: '#101828' },
  sortBtn: { flex: 1, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, height: 40 },
  sortBtnText: { fontSize: 14, fontWeight: '500', color: '#101828' },
  filtersPanel: { padding: 16, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  filterTitle: { fontSize: 14, fontWeight: 'bold', color: '#101828', marginBottom: 12 },
  catList: { flexDirection: 'row' },
  catBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F3F4F6', marginRight: 8 },
  catBtnActive: { backgroundColor: '#1C273F' },
  catBtnText: { fontSize: 13, fontWeight: '500', color: '#101828' },
  resultsHeader: { paddingHorizontal: 16, paddingVertical: 12 },
  resultsCount: { fontSize: 12, color: '#6B7280' },
  listPadding: { paddingHorizontal: 16, paddingBottom: 20 },
  row: { justifyContent: 'space-between' },
  productCard: { width: columnWidth, backgroundColor: '#FFF', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 16, overflow: 'hidden' },
  imageContainer: { width: '100%', height: 120, backgroundColor: '#F3F4F6' },
  productImage: { width: '100%', height: '100%' },
  productInfo: { padding: 10 },
  productName: { fontSize: 13, color: '#101828', height: 35 },
  productPrice: { fontSize: 15, fontWeight: 'bold', color: '#101828', marginVertical: 8 },
  addButton: { backgroundColor: '#1C273F', padding: 8, borderRadius: 6, alignItems: 'center' },
  addButtonText: { color: '#FFF', fontSize: 11, fontWeight: '600' },
  emptyContainer: { alignItems: 'center', marginTop: 50 },
  emptyText: { color: '#6B7280', fontSize: 14 }
});