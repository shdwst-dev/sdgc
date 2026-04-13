import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList, Dimensions, Alert, ActivityIndicator, ScrollView, Modal } from 'react-native';
import { Search, SlidersHorizontal, X, Minus, Plus } from 'lucide-react-native';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { Image } from 'react-native';
import { ApiError } from '../../services/auth';
import { buscarProductos, Producto, addToCarritoLocal } from '../../services/comprador';
import { clearToken, getToken, hydrateToken } from '../../services/storage';
import { useToast } from '../../components/Toast';

const { width } = Dimensions.get('window');
const columnWidth = (width - 40) / 2;

const imageMap: { [key: string]: string } = {
  'Smartphone Samsung Galaxy A54': 'https://i.postimg.cc/Snz3Kn0D/A54.png',
  'Laptop HP Pavilion 15': 'https://i.postimg.cc/PLscvdTG/HP.png',
  'Audífonos Bluetooth JBL': 'https://i.postimg.cc/v83LYzZ9/Whats-App-Image-2026-04-06-at-6-27-52-PM.jpg',
  'Manzanas Red Delicious': 'https://i.postimg.cc/06R3K9Pk/Manzana.png',
  'Lechuga Romana': 'https://i.postimg.cc/8FQ3fTNT/Lechuga.png',
  'Coca Cola 2L': 'https://i.postimg.cc/xXbhdXDV/Coca-cola.png',
  'Jugo Jumex Naranja 1L': 'https://i.postimg.cc/XZShBn40/Jumex.png',
  'Detergente Ariel 1kg': 'https://i.postimg.cc/XrymvrSn/Ariel.png',
  'Escritorio de Oficina': 'https://i.postimg.cc/mPFJrPx0/Escritorio.png',
  'Cuaderno Profesional 100 hojas': 'https://i.postimg.cc/tsVwgs0K/Cuaderno.png',
};

const getProductImage = (nombre: string): string => {
  return imageMap[nombre] || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200';
};

const categories = [
  { name: 'Electrónica', icon: '📱' },
  { name: 'Alimentos', icon: '🍎' },
  { name: 'Bebidas', icon: '🥤' },
  { name: 'Limpieza', icon: '🧹' },
  { name: 'Hogar', icon: '🏠' },
  { name: 'Papelería', icon: '📝' },
  { name: 'Ropa', icon: '👕' },
  { name: 'Deportes', icon: '⚽' },
];

export default function Buscar() {
  const navigation = useNavigation();
  const { showToast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [productos, setProductos] = useState<Producto[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState('relevance');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Producto | null>(null);
  const [productQuantity, setProductQuantity] = useState(1);
  const [displayCount, setDisplayCount] = useState(20);

  const goToLogin = useCallback(() => {
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'RoleSelect' as never }],
      }),
    );
  }, [navigation]);

  const performSearch = useCallback(async (query: string) => {
    let token = getToken();

    if (!token) {
      token = await hydrateToken();
    }

    if (!token) {
      await clearToken();
      goToLogin();
      return;
    }

    try {
      setIsLoading(true);
      setDisplayCount(20);
      const results = await buscarProductos(token, query);
      let filteredResults = [...results];

      // Filtrar por categoría si está seleccionada
      if (selectedCategory) {
        filteredResults = filteredResults.filter(
          product => product.categoria.toLowerCase() === selectedCategory.toLowerCase()
        );
      }

      // Ordenar resultados
      if (sortBy === 'price-low') {
        filteredResults.sort((a, b) => a.precio_unitario - b.precio_unitario);
      } else if (sortBy === 'price-high') {
        filteredResults.sort((a, b) => b.precio_unitario - a.precio_unitario);
      }

      setProductos(filteredResults);
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 401) {
        await clearToken();
        Alert.alert('Sesión expirada', 'Inicia sesión nuevamente.');
        goToLogin();
        return;
      }

      const message = requestError instanceof Error
        ? requestError.message
        : 'Error en la búsqueda.';
      
      showToast({ message, type: 'error' });
    } finally {
      setIsLoading(false);
    }
  }, [goToLogin, sortBy, selectedCategory]);

  // Búsqueda con debounce para evitar llamadas duplicadas
  useEffect(() => {
    const term = searchQuery.trim();
    // Siempre disparamos la búsqueda si hay término o categoría seleccionada
    const timer = setTimeout(() => {
      if (term.length > 0 || selectedCategory) {
        performSearch(term);
      } else {
        setProductos([]);
      }
    }, 400); // 400ms debounce

    return () => clearTimeout(timer);
  }, [searchQuery, selectedCategory, sortBy, performSearch]);

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

  const paginatedProductos = useMemo(() => {
    return productos.slice(0, displayCount);
  }, [productos, displayCount]);

  const handleLoadMore = useCallback(() => {
    if (displayCount < productos.length) {
      setDisplayCount((prev) => prev + 20);
    }
  }, [displayCount, productos.length]);

  const renderProduct = ({ item }: { item: Producto }) => (
    <TouchableOpacity 
      style={styles.productCard}
      activeOpacity={0.7}
      onPress={() => {
        setSelectedProduct(item);
        setProductQuantity(1);
        setShowProductModal(true);
      }}
    >
      <View style={styles.imageContainer}>
        {getProductImage(item.nombre) ? (
          <Image source={{ uri: getProductImage(item.nombre) }} style={styles.productImage} />
        ) : (
          <View style={[styles.productImage, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#f3f7ff' }]}>
            <Text style={{ fontSize: 24 }}>📦</Text>
          </View>
        )}
      </View>
      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={2}>{item.nombre}</Text>
        <Text style={styles.productCategory}>{item.categoria}</Text>
        <Text style={styles.productPrice}>${item.precio_unitario.toLocaleString('es-MX')}</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={async (e) => {
            e.stopPropagation();
            try {
              await addToCarritoLocal(item, 1);
              showToast({ message: `${item.nombre} agregado al carrito`, type: 'success' });
            } catch (error) {
              showToast({ message: 'No se pudo agregar al carrito', type: 'error' });
            }
          }}
        >
          <Text style={styles.addButtonText}>Agregar</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchHeader}>
        <View style={styles.searchBar}>
          <Search size={20} color="#9CA3AF" />
          <TextInput
            placeholder="Buscar en la BD..."
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
          <View style={styles.catList}>
            {categories.map((cat, i) => (
              <TouchableOpacity 
                key={i}
                style={[
                  styles.catBtn,
                  selectedCategory === cat.name && styles.catBtnActive
                ]}
                onPress={() => {
                  const newCategory = selectedCategory === cat.name ? null : cat.name;
                  setSelectedCategory(newCategory);
                }}
              >
                <Text style={[
                  styles.catBtnText,
                  selectedCategory === cat.name && styles.catBtnTextActive
                ]}>
                  {cat.icon} {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {isLoading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#1C273F" />
          <Text style={{ marginTop: 10, color: '#6B7280' }}>Buscando...</Text>
        </View>
      ) : (
        <>
          <View style={styles.resultsHeader}>
            <Text style={styles.resultsCount}>{productos.length} productos encontrados</Text>
          </View>

          {productos.length > 0 ? (
            <FlatList
              data={paginatedProductos}
              renderItem={renderProduct}
              keyExtractor={(item) => item.id.toString()}
              numColumns={2}
              columnWrapperStyle={{ justifyContent: 'space-between' }}
              scrollEnabled={true}
              onEndReached={handleLoadMore}
              onEndReachedThreshold={0.3}
              ListFooterComponent={
                displayCount < productos.length ? (
                  <View style={{ paddingVertical: 12, alignItems: 'center' }}>
                    <ActivityIndicator size="small" color="#1C273F" />
                  </View>
                ) : null
              }
            />
          ) : searchQuery.trim().length > 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={{ fontSize: 18, color: '#6B7280', marginBottom: 10 }}>No se encontraron resultados</Text>
              <Text style={{ color: '#9CA3AF' }}>Intenta con otras palabras clave</Text>
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={{ fontSize: 18, color: '#6B7280', marginBottom: 10 }}>Escribe para buscar</Text>
              <Text style={{ color: '#9CA3AF' }}>Conectado a la base de datos</Text>
            </View>
          )}
        </>
      )}

      {/* Product Detail Modal */}
      <Modal
        visible={showProductModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowProductModal(false)}
      >
        <View style={styles.productDetailContainer}>
          <TouchableOpacity 
            style={styles.closeButton} 
            onPress={() => setShowProductModal(false)}
          >
            <X size={24} color="#1C3A5C" />
          </TouchableOpacity>

          {selectedProduct && (
            <ScrollView 
              style={styles.detailContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Product Image */}
              <View style={styles.detailImageContainer}>
                {getProductImage(selectedProduct.nombre) ? (
                  <Image 
                    source={{ uri: getProductImage(selectedProduct.nombre) }} 
                    style={styles.detailImage} 
                  />
                ) : (
                  <View style={[styles.detailImage, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#f3f7ff' }]}>
                    <Text style={{ fontSize: 60 }}>📦</Text>
                  </View>
                )}
              </View>

              {/* Product Info */}
              <View style={styles.detailInfo}>
                <Text style={styles.detailCategory}>{selectedProduct.categoria}</Text>
                <Text style={styles.detailName}>{selectedProduct.nombre}</Text>

                {/* Price */}
                <View style={styles.priceContainer}>
                  <Text style={styles.detailPrice}>
                    ${selectedProduct.precio_unitario.toLocaleString('es-MX')}
                  </Text>
                  
                  {/* Stock Badge */}
                  <View style={[
                    styles.stockBadge,
                    {
                      backgroundColor: selectedProduct.stock_actual > 10 
                        ? '#d4edda' 
                        : selectedProduct.stock_actual > 0 
                        ? '#fff3cd' 
                        : '#f8d7da'
                    }
                  ]}>
                    <Text style={[
                      styles.stockText,
                      {
                        color: selectedProduct.stock_actual > 10 
                          ? '#155724' 
                          : selectedProduct.stock_actual > 0 
                          ? '#856404' 
                          : '#721c24'
                      }
                    ]}>
                      {selectedProduct.stock_actual > 0 
                        ? `Stock: ${selectedProduct.stock_actual}` 
                        : 'Agotado'}
                    </Text>
                  </View>
                </View>

                {/* Availability Section */}
                <View style={styles.detailSection}>
                  <Text style={styles.sectionTitle}>Disponibilidad</Text>
                  <View style={styles.sectionContent}>
                    <Text style={styles.sectionText}>
                      {selectedProduct.stock_actual > 10 
                        ? '✓ Disponible - Entrega rápida' 
                        : selectedProduct.stock_actual > 0 
                        ? `⚠ Solo ${selectedProduct.stock_actual} disponibles` 
                        : '✗ Sin stock actualmente'}
                    </Text>
                  </View>
                </View>

                {/* Quantity Section */}
                <View style={styles.detailSection}>
                  <Text style={styles.sectionTitle}>Cantidad</Text>
                  <View style={styles.quantitySelector}>
                    <TouchableOpacity 
                      style={styles.qtySelectorBtn}
                      onPress={() => setProductQuantity(Math.max(1, productQuantity - 1))}
                      disabled={selectedProduct.stock_actual === 0}
                    >
                      <Minus size={18} color={selectedProduct.stock_actual === 0 ? '#ccc' : '#1C3A5C'} />
                    </TouchableOpacity>
                    <Text style={styles.qtyDisplay}>{productQuantity}</Text>
                    <TouchableOpacity 
                      style={styles.qtySelectorBtn}
                      onPress={() => setProductQuantity(
                        Math.min(selectedProduct.stock_actual, productQuantity + 1)
                      )}
                      disabled={productQuantity >= selectedProduct.stock_actual}
                    >
                      <Plus size={18} color={productQuantity >= selectedProduct.stock_actual ? '#ccc' : '#1C3A5C'} />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Add to Cart Button */}
                <TouchableOpacity 
                  style={[
                    styles.detailAddButton,
                    selectedProduct.stock_actual === 0 && styles.detailAddButtonDisabled
                  ]}
                  onPress={async () => {
                    if (selectedProduct.stock_actual === 0) return;
                    
                    try {
                      for (let i = 0; i < productQuantity; i++) {
                        await addToCarritoLocal(selectedProduct, 1);
                      }
                      showToast({ message: `${productQuantity} × ${selectedProduct.nombre} agregado al carrito`, type: 'success' });
                      setShowProductModal(false);
                      setProductQuantity(1);
                    } catch (error) {
                      showToast({ message: 'No se pudo agregar al carrito', type: 'error' });
                    }
                  }}
                  disabled={selectedProduct.stock_actual === 0}
                >
                  <Text style={styles.detailAddButtonText}>
                    {selectedProduct.stock_actual === 0 ? 'Sin stock' : 'Agregar al Carrito'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  searchHeader: { padding: 16, backgroundColor: '#fff', marginTop: 20, borderBottomWidth: 1, borderBottomColor: '#cfdaea' },
  searchBar: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#cfdaea', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  searchInput: { flex: 1, marginHorizontal: 8, fontSize: 14, color: '#1C3A5C' },
  controlBar: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, gap: 10 },
  controlBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#cfdaea', borderRadius: 8, paddingVertical: 10, gap: 6 },
  controlBtnActive: { backgroundColor: '#0f2f6f', borderColor: '#0f2f6f' },
  controlBtnText: { fontSize: 14, color: '#1C3A5C', fontWeight: '600' },
  sortBtn: { flex: 1, borderWidth: 1, borderColor: '#cfdaea', borderRadius: 8, justifyContent: 'center', alignItems: 'center', paddingVertical: 10 },
  sortBtnText: { fontSize: 14, color: '#1C3A5C', fontWeight: '600' },
  filtersPanel: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#f3f7ff', borderBottomWidth: 1, borderBottomColor: '#cfdaea' },
  filterTitle: { fontSize: 14, fontWeight: '600', color: '#1C3A5C', marginBottom: 10 },
  catList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catBtn: { paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: '#cfdaea', borderRadius: 6 },
  catBtnActive: { backgroundColor: '#0f2f6f', borderColor: '#0f2f6f' },
  catBtnText: { fontSize: 12, color: '#1C3A5C' },
  catBtnTextActive: { color: '#FFF' },
  resultsHeader: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#cfdaea' },
  resultsCount: { fontSize: 14, color: '#5e728f', fontWeight: '600' },
  productCard: { width: columnWidth, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e8ecf0', marginHorizontal: 8, marginBottom: 16, overflow: 'hidden' },
  imageContainer: { width: '100%', height: 120, backgroundColor: '#f3f7ff' },
  productImage: { width: '100%', height: '100%' },
  productInfo: { padding: 10 },
  productName: { fontSize: 13, color: '#1C3A5C', height: 35 },
  productCategory: { fontSize: 11, color: '#7a8ba5', marginBottom: 4 },
  productPrice: { fontSize: 15, fontWeight: 'bold', color: '#1C3A5C', marginVertical: 8 },
  addButton: { backgroundColor: '#0f2f6f', padding: 8, borderRadius: 6, alignItems: 'center' },
  addButtonText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },

  // Product Detail Modal Styles
  productDetailContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingTop: 40,
  },
  closeButton: {
    position: 'absolute',
    top: 45,
    right: 16,
    zIndex: 10,
    padding: 8,
  },
  detailContent: {
    flex: 1,
    paddingTop: 32,
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  detailImageContainer: {
    width: '100%',
    height: 300,
    backgroundColor: '#f3f7ff',
    borderRadius: 12,
    marginBottom: 20,
    overflow: 'hidden',
  },
  detailImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  detailInfo: {
    paddingBottom: 20,
  },
  detailCategory: {
    fontSize: 12,
    color: '#7a8ba5',
    marginBottom: 8,
    fontWeight: '500',
  },
  detailName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1C3A5C',
    marginBottom: 12,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  detailPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f2f6f',
  },
  stockBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  stockText: {
    fontSize: 12,
    fontWeight: '600',
  },
  detailSection: {
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#cfdaea',
    paddingBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C3A5C',
    marginBottom: 10,
  },
  sectionContent: {
    paddingHorizontal: 8,
  },
  sectionText: {
    fontSize: 13,
    color: '#5e728f',
    lineHeight: 20,
  },
  quantitySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f3f7ff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  qtySelectorBtn: {
    padding: 8,
  },
  qtyDisplay: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1C3A5C',
    minWidth: 40,
    textAlign: 'center',
  },
  detailAddButton: {
    backgroundColor: '#0f2f6f',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  detailAddButtonDisabled: {
    backgroundColor: '#ccc',
  },
  detailAddButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});