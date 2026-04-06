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

export default function Inicio() {
  const navigation = useNavigation();
  const [productos, setProductos] = useState<ProductoDestacado[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSuggestions, setSearchSuggestions] = useState<Producto[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);

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
    <View style={styles.productCard}>
      <View style={styles.imageContainer}>
        {item.imagen_url ? (
          <Image source={{ uri: item.imagen_url }} style={styles.productImage} />
        ) : (
          <View style={[styles.productImage, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#F3F4F6' }]}>
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
          onPress={() => handleAddToCart(item)}
        >
          <Text style={styles.addButtonText}>Agregar al Carrito</Text>
        </TouchableOpacity>
      </View>
    </View>
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
                    {item.imagen_url && (
                      <Image source={{ uri: item.imagen_url }} style={styles.suggestionImage} />
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
});