import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, FlatList, Dimensions, Alert, ActivityIndicator, TextInput, Modal } from 'react-native';
import { Search, X } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { ApiError, getMe } from '../../services/auth';
import { getDashboardCompradorData, ProductoDestacado, addToCarritoLocal, buscarProductos, Producto } from '../../services/comprador';
import { clearToken, getToken, hydrateToken } from '../../services/storage';

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

const getProductImage = (nombre: string): string => {
  return imageMap[nombre] || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200';
};

export default function Inicio() {
  const navigation = useNavigation();
  const [productos, setProductos] = useState<ProductoDestacado[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSuggestions, setSearchSuggestions] = useState<Producto[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductoDestacado | null>(null);
  const [productQuantity, setProductQuantity] = useState(1);

  const goToLogin = useCallback(() => {
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'InicioSesion' as never }],
      }),
    );
  }, [navigation]);

  const loadDashboardData = useCallback(async () => {
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

      const userInfo = await getMe(token);
      const dashboardData = await getDashboardCompradorData(token, userInfo);
      
      setProductos(dashboardData.productosDestacados);
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 401) {
        await clearToken();
        Alert.alert('Sesión expirada', 'Inicia sesión nuevamente.');
        goToLogin();
        return;
      }

      const message = requestError instanceof Error
        ? requestError.message
        : 'No se pudo cargar los datos del dashboard.';

      Alert.alert('Error', message);
    } finally {
      setIsLoading(false);
    }
  }, [goToLogin]);

  useEffect(() => {
    loadDashboardData().catch(() => {
      setIsLoading(false);
    });
  }, [loadDashboardData]);

  const handleAddToCart = useCallback(async (product: ProductoDestacado) => {
    try {
      await addToCarritoLocal(product, 1);
      Alert.alert("¡Éxito!", `${product.nombre} agregado al carrito`);
    } catch (error) {
      Alert.alert("Error", "No se pudo agregar al carrito");
    }
  }, []);

  const performSearch = useCallback(async (query: string) => {
    if (query.trim().length === 0) {
      setSearchSuggestions([]);
      return;
    }

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
      setIsSearching(true);
      const results = await buscarProductos(token, query);
      setSearchSuggestions(results.slice(0, 5)); // Mostrar solo 5 sugerencias
    } catch (error) {
      console.error('Error en búsqueda:', error);
      setSearchSuggestions([]);
    } finally {
      setIsSearching(false);
    }
  }, [goToLogin]);

  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, performSearch]);

  const handleSelectSuggestion = async (product: Producto) => {
    await handleAddToCart(product);
    setSearchQuery('');
    setSearchSuggestions([]);
  };

  const renderProduct = (item: ProductoDestacado) => (
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
          onPress={(e) => {
            e.stopPropagation();
            addToCarritoLocal(item, 1);
          }}
        >
          <Text style={styles.addButtonText}>Agregar al Carrito</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#1C273F" />
        <Text style={{ marginTop: 10, color: '#6B7280' }}>Cargando productos...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>

      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Search size={20} color="#1C273F" />
          <TextInput
            placeholder="Buscar productos, marcas..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onFocus={() => setShowSearchModal(true)}
            style={styles.searchInput}
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => {
              setSearchQuery('');
              setSearchSuggestions([]);
            }}>
              <X size={20} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <Modal
        visible={showSearchModal && searchQuery.length > 0}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSearchModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.suggestionsContainer}>
            <View style={styles.searchBar}>
              <Search size={20} color="#1C273F" />
              <TextInput
                placeholder="Buscar productos..."
                placeholderTextColor="#9CA3AF"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
                style={styles.searchInput}
              />
              {searchQuery !== '' && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <X size={20} color="#9CA3AF" />
                </TouchableOpacity>
              )}
            </View>

            {isSearching ? (
              <View style={styles.loadingCenter}>
                <ActivityIndicator size="large" color="#1C273F" />
              </View>
            ) : searchSuggestions.length > 0 ? (
              <FlatList
                data={searchSuggestions}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.suggestionItem}
                    onPress={() => {
                      handleSelectSuggestion(item);
                      setShowSearchModal(false);
                    }}
                  >
                    {getProductImage(item.nombre) && (
                      <Image source={{ uri: getProductImage(item.nombre) }} style={styles.suggestionImage} />
                    )}
                    <View style={styles.suggestionText}>
                      <Text style={styles.suggestionName} numberOfLines={1}>{item.nombre}</Text>
                      <Text style={styles.suggestionPrice}>${item.precio_unitario.toLocaleString('es-MX')}</Text>
                    </View>
                  </TouchableOpacity>
                )}
                keyExtractor={(item) => item.id.toString()}
                scrollEnabled={false}
              />
            ) : searchQuery.length > 0 ? (
              <View style={styles.emptySearch}>
                <Text style={styles.emptySearchText}>No se encontraron productos</Text>
              </View>
            ) : null}
          </View>
        </View>
      </Modal>

      <View style={styles.paddingContainer}>
        <LinearGradient
          colors={['#3B82F6', '#9333EA']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.banner}
        >
          <Text style={styles.bannerTitle}>¡Descubre Productos!</Text>
          <Text style={styles.bannerSubtitle}>Conectado a la base de datos</Text>
        </LinearGradient>
      </View>

      <View style={styles.paddingContainer}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Categorías</Text>
          <Text style={styles.viewAll}>Ver Todas</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {categories.map((cat, i) => (
            <View key={i} style={styles.categoryItem}>
              <View style={styles.categoryIconCircle}>
                <Text style={{ fontSize: 24 }}>{cat.icon}</Text>
              </View>
              <Text style={styles.categoryName}>{cat.name}</Text>
            </View>
          ))}
        </ScrollView>
      </View>

      <View style={styles.paddingContainer}>
        <Text style={styles.sectionTitle}>Recomendado para Ti</Text>
        {productos.length > 0 ? (
          <View style={styles.productsGrid}>
            {productos.map((item) => (
              <React.Fragment key={item.id.toString()}>
                {renderProduct(item)}
              </React.Fragment>
            ))}
          </View>
        ) : (
          <View style={{ paddingVertical: 20, alignItems: 'center' }}>
            <Text style={{ color: '#6B7280', marginBottom: 10 }}>No hay productos disponibles</Text>
            <TouchableOpacity style={styles.retryButton} onPress={loadDashboardData}>
              <Text style={styles.retryButtonText}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Modal Detalle del Producto */}
      <Modal
        visible={showProductModal}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowProductModal(false)}
      >
        {selectedProduct && (
          <View style={styles.productDetailContainer}>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowProductModal(false)}
            >
              <X size={28} color="#1C3A5C" />
            </TouchableOpacity>

            <ScrollView style={styles.detailContent} showsVerticalScrollIndicator={false}>
              <View style={styles.detailImageContainer}>
                <Image 
                  source={{ uri: getProductImage(selectedProduct.nombre) }} 
                  style={styles.detailImage}
                />
              </View>

              <View style={styles.detailInfo}>
                <Text style={styles.detailCategory}>{selectedProduct.categoria}</Text>
                <Text style={styles.detailName}>{selectedProduct.nombre}</Text>
                
                <View style={styles.priceContainer}>
                  <Text style={styles.detailPrice}>
                    ${selectedProduct.precio_unitario.toLocaleString('es-MX')}
                  </Text>
                  <View style={styles.stockBadge}>
                    <Text style={styles.stockText}>
                      {selectedProduct.stock_actual > 0 ? `${selectedProduct.stock_actual} en stock` : 'Sin stock'}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.sectionTitle}>Disponibilidad</Text>
                  <Text style={[styles.sectionContent, {
                    color: selectedProduct.stock_actual > 10 ? '#1C7F4A' : selectedProduct.stock_actual > 0 ? '#D97706' : '#DC2626'
                  }]}>
                    {selectedProduct.stock_actual > 10 
                      ? 'En stock - Entrega rápida'
                      : selectedProduct.stock_actual > 0
                      ? `Solo ${selectedProduct.stock_actual} disponibles`
                      : 'Producto agotado'
                    }
                  </Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.sectionTitle}>Cantidad</Text>
                  <View style={styles.quantitySelector}>
                    <TouchableOpacity 
                      style={styles.qtySelectorBtn}
                      onPress={() => productQuantity > 1 && setProductQuantity(productQuantity - 1)}
                    >
                      <Text style={styles.qtySelectorText}>−</Text>
                    </TouchableOpacity>
                    <Text style={styles.qtyDisplay}>{productQuantity}</Text>
                    <TouchableOpacity 
                      style={styles.qtySelectorBtn}
                      onPress={() => productQuantity < selectedProduct.stock_actual && setProductQuantity(productQuantity + 1)}
                    >
                      <Text style={styles.qtySelectorText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <TouchableOpacity 
                  style={[styles.detailAddButton, selectedProduct.stock_actual === 0 && styles.detailAddButtonDisabled]}
                  onPress={async () => {
                    try {
                      for (let i = 0; i < productQuantity; i++) {
                        await addToCarritoLocal(selectedProduct, 1);
                      }
                      Alert.alert("¡Éxito!", `${productQuantity} × ${selectedProduct.nombre} agregado al carrito`);
                      setShowProductModal(false);
                      setProductQuantity(1);
                    } catch (error) {
                      Alert.alert("Error", "No se pudo agregar al carrito");
                    }
                  }}
                  disabled={selectedProduct.stock_actual === 0}
                >
                  <Text style={styles.detailAddButtonText}>
                    Agregar al Carrito
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        )}
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  paddingContainer: { paddingHorizontal: 16, marginBottom: 24 },
  searchSection: { padding: 16, backgroundColor: '#fff', marginTop: 40 },
  searchBar: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#cfdaea', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  searchInput: { flex: 1, fontSize: 14, color: '#1C3A5C' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-start', paddingTop: 50 },
  suggestionsContainer: { backgroundColor: '#fff', marginHorizontal: 16, borderRadius: 12, maxHeight: 400, padding: 12, gap: 8 },
  loadingCenter: { justifyContent: 'center', alignItems: 'center', paddingVertical: 20 },
  suggestionItem: { flexDirection: 'row', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#cfdaea', alignItems: 'center', gap: 10 },
  suggestionImage: { width: 50, height: 50, borderRadius: 6, backgroundColor: '#f3f7ff' },
  suggestionText: { flex: 1 },
  suggestionName: { fontSize: 13, color: '#1C3A5C', fontWeight: '500' },
  suggestionPrice: { fontSize: 12, color: '#0f2f6f', fontWeight: 'bold', marginTop: 2 },
  emptySearch: { paddingVertical: 20, alignItems: 'center' },
  emptySearchText: { color: '#5e728f', fontSize: 14 },
  banner: { height: 160, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  bannerTitle: { color: '#fff', fontSize: 26, fontWeight: 'bold' },
  bannerSubtitle: { color: '#fff', fontSize: 14, opacity: 0.9 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1C3A5C', marginBottom: 15 },
  viewAll: { color: '#0f2f6f', fontSize: 14 },
  categoryItem: { alignItems: 'center', marginRight: 20 },
  categoryIconCircle: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#0f2f6f', justifyContent: 'center', alignItems: 'center', marginBottom: 5 },
  categoryName: { fontSize: 12, color: '#1C3A5C' },
  productsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  productCard: { width: columnWidth, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e8ecf0', marginBottom: 16, overflow: 'hidden' },
  imageContainer: { width: '100%', height: 120, backgroundColor: '#f3f7ff' },
  productImage: { width: '100%', height: '100%' },
  productInfo: { padding: 10 },
  productName: { fontSize: 13, color: '#1C3A5C', height: 35 },
  productCategory: { fontSize: 11, color: '#7a8ba5', marginBottom: 4 },
  productPrice: { fontSize: 15, fontWeight: 'bold', color: '#1C3A5C', marginVertical: 8 },
  addButton: { backgroundColor: '#0f2f6f', padding: 8, borderRadius: 6, alignItems: 'center' },
  addButtonText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  retryButton: { backgroundColor: '#0f2f6f', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 6 },
  retryButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  // Product Detail Modal Styles
  productDetailContainer: { 
    flex: 1, 
    backgroundColor: '#e6f3fb',
    paddingTop: 20 
  },
  closeButton: {
    position: 'absolute',
    top: 20,
    right: 16,
    zIndex: 10,
    padding: 8,
    backgroundColor: '#FFF',
    borderRadius: 20,
  },
  detailContent: {
    flex: 1,
    paddingTop: 16,
  },
  detailImageContainer: {
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  detailImage: {
    width: '100%',
    height: 300,
    borderRadius: 12,
    backgroundColor: '#f3f7ff',
  },
  detailInfo: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  detailCategory: {
    fontSize: 12,
    color: '#5e728f',
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1C3A5C',
    marginBottom: 16,
    lineHeight: 28,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  detailPrice: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0f2f6f',
  },
  stockBadge: {
    backgroundColor: '#f3f7ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#cfdaea',
  },
  stockText: {
    fontSize: 11,
    color: '#1C3A5C',
    fontWeight: '600',
  },
  detailSection: {
    marginBottom: 24,
  },
  sectionContent: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  quantitySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#cfdaea',
    borderRadius: 8,
    overflow: 'hidden',
    width: 120,
  },
  qtySelectorBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3f7ff',
  },
  qtySelectorText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f2f6f',
  },
  qtyDisplay: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    color: '#1C3A5C',
  },
  detailAddButton: {
    backgroundColor: '#0f2f6f',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  detailAddButtonDisabled: {
    backgroundColor: '#7a8ba5',
  },
  detailAddButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});