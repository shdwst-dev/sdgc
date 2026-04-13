import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, FlatList, Dimensions, Alert, ActivityIndicator, TextInput, Modal } from 'react-native';
import { Search, X, ShoppingCart, Star, MapPin, Package, RefreshCw, ChevronRight } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { ApiError, getMe } from '../../services/auth';
import { getDashboardCompradorData, ProductoDestacado, addToCarritoLocal, buscarProductos, Producto, getMisPedidos, PedidoResumen } from '../../services/comprador';
import { clearToken, getToken, hydrateToken } from '../../services/storage';
import { useToast } from '../../components/Toast';

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

const banners = [
  { id: 1, image: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800', title: 'Venta de Temporada', subtitle: 'Hasta 50% OFF' },
  { id: 2, image: 'https://images.unsplash.com/photo-1607082350899-7e105aa886ae?w=800', title: 'Tecnología Pro', subtitle: 'Nuevos Gadgets' },
];

const getProductImage = (nombre: string, imagenUrl?: string | null): string => {
  if (imagenUrl && imagenUrl.includes('http')) return imagenUrl;
  return 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800'; // Placeholder genérico
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function Inicio() {
  const navigation = useNavigation<NavigationProp>();
  const { showToast } = useToast();
  const [productos, setProductos] = useState<ProductoDestacado[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSuggestions, setSearchSuggestions] = useState<Producto[]>([]);
  const [ultimoPedido, setUltimoPedido] = useState<PedidoResumen | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);

  const goToLogin = useCallback(() => {
    navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'RoleSelect' as never }] }));
  }, [navigation]);

  const loadDashboardData = useCallback(async () => {
    let token = getToken() || await hydrateToken();
    if (!token) { await clearToken(); goToLogin(); return; }

    try {
      setIsLoading(true);
      const userInfo = await getMe(token);
      const data = await getDashboardCompradorData(token, userInfo);
      setProductos(data.productosDestacados);

      const pedidos = await getMisPedidos(token);
      if (pedidos.length > 0) {
        setUltimoPedido(pedidos[0]);
      }
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        await clearToken();
        goToLogin();
        return;
      }
      showToast({ message: 'Error al cargar productos.', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  }, [goToLogin, showToast]);

  useEffect(() => { loadDashboardData(); }, [loadDashboardData]);

  const handleAddToCart = useCallback(async (product: ProductoDestacado | Producto) => {
    try {
      await addToCarritoLocal(product, 1);
      showToast({ message: `${product.nombre} agregado`, type: 'success' });
    } catch {
      showToast({ message: 'Error al agregar', type: 'error' });
    }
  }, [showToast]);

  const performSearch = useCallback(async (query: string) => {
    if (!query.trim()) { setSearchSuggestions([]); return; }
    let token = getToken() || await hydrateToken();
    if (!token) return;
    try {
      setIsSearching(true);
      const results = await buscarProductos(token, query);
      setSearchSuggestions(results.slice(0, 5));
    } catch {
      setSearchSuggestions([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => performSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery, performSearch]);

  const renderProduct = (item: ProductoDestacado) => (
    <TouchableOpacity 
      key={item.id}
      style={styles.productCard}
      activeOpacity={0.7}
      onPress={() => navigation.navigate('DetalleProducto', { idProducto: item.id })}
    >
      <View style={styles.imageContainer}>
        <Image 
          source={{ uri: getProductImage(item.nombre, item.imagen_url) }} 
          style={styles.productImage} 
        />
      </View>
      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={2}>{item.nombre}</Text>
        <Text style={styles.productCategory}>{item.categoria}</Text>
        <Text style={styles.productPrice}>${item.precio_unitario.toLocaleString('es-MX')}</Text>
        <TouchableOpacity style={styles.addButton} onPress={(e) => { e.stopPropagation(); handleAddToCart(item); }}>
          <Text style={styles.addButtonText}>Agregar</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#0f2f6f" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Search size={20} color="#1C273F" />
          <TextInput
            placeholder="Buscar productos..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onFocus={() => setShowSearchModal(true)}
            style={styles.searchInput}
          />
        </View>
      </View>

      <Modal visible={showSearchModal && searchQuery.length > 0} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.suggestionsContainer}>
            <View style={styles.searchBar}>
              <Search size={20} color="#1C273F" />
              <TextInput autoFocus style={styles.searchInput} value={searchQuery} onChangeText={setSearchQuery} />
              <TouchableOpacity onPress={() => setShowSearchModal(false)}><X size={20} color="#9CA3AF" /></TouchableOpacity>
            </View>
            {isSearching ? <ActivityIndicator style={{ padding: 20 }} /> : searchSuggestions.map(item => (
              <TouchableOpacity key={item.id} style={styles.suggestionItem} onPress={() => { handleAddToCart(item); setShowSearchModal(false); }}>
                <Image source={{ uri: getProductImage(item.nombre, item.imagen_url) }} style={styles.suggestionImage} />
                <View style={styles.suggestionText}>
                  <Text style={styles.suggestionName}>{item.nombre}</Text>
                  <Text style={styles.suggestionPrice}>${item.precio_unitario}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} pagingEnabled style={styles.bannersScroll}>
        {banners.map(banner => (
          <TouchableOpacity key={banner.id} style={styles.bannerContainer}>
            <Image source={{ uri: banner.image }} style={styles.bannerImage} />
            <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={styles.bannerOverlay}>
              <Text style={styles.bannerSubtitle}>{banner.subtitle}</Text>
              <Text style={styles.bannerTitle}>{banner.title}</Text>
            </LinearGradient>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {ultimoPedido && (
        <View style={styles.paddingContainer}>
          <Text style={styles.sectionTitle}>Último Pedido</Text>
          <TouchableOpacity 
            style={styles.orderStatusCard}
            onPress={() => navigation.navigate('DetallePedido', { idVenta: ultimoPedido.id })}
          >
            <View style={styles.orderStatusHeader}>
              <Package size={20} color="#0f2f6f" />
              <Text style={styles.orderNumber}>Orden #{ultimoPedido.id}</Text>
              <View style={[styles.statusBadge, { backgroundColor: ultimoPedido.estado === 'Completado' ? '#D1FAE5' : '#FEF3C7' }]}>
                <Text style={[styles.statusBadgeText, { color: ultimoPedido.estado === 'Completado' ? '#059669' : '#D97706' }]}>
                  {ultimoPedido.estado}
                </Text>
              </View>
            </View>
            <View style={styles.orderStatusFooter}>
              <Text style={styles.orderDate}>
                {ultimoPedido.fecha ? new Date(ultimoPedido.fecha).toLocaleDateString() : 'Procesando...'}
              </Text>
              <View style={styles.viewDetailsBtn}>
                <Text style={styles.viewDetailsText}>Ver Detalle</Text>
                <ChevronRight size={16} color="#0f2f6f" />
              </View>
            </View>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.paddingContainer}>
        <Text style={styles.sectionTitle}>Categorías</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {categories.map((cat, i) => (
            <View key={i} style={styles.categoryItem}>
              <View style={styles.categoryIconCircle}><Text style={{ fontSize: 24 }}>{cat.icon}</Text></View>
              <Text style={styles.categoryName}>{cat.name}</Text>
            </View>
          ))}
        </ScrollView>
      </View>

      <View style={styles.paddingContainer}>
        <Text style={styles.sectionTitle}>Recomendado para Ti</Text>
        <View style={styles.productsGrid}>
          {productos.map(item => renderProduct(item))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { justifyContent: 'center', alignItems: 'center' },
  paddingContainer: { paddingHorizontal: 16, marginBottom: 24 },
  searchSection: { padding: 16, marginTop: 40 },
  searchBar: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#cfdaea', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  searchInput: { flex: 1, fontSize: 14, color: '#1C3A5C' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', paddingTop: 50 },
  suggestionsContainer: { backgroundColor: '#fff', marginHorizontal: 16, borderRadius: 12, padding: 12 },
  suggestionItem: { flexDirection: 'row', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#cfdaea', alignItems: 'center', gap: 10 },
  suggestionImage: { width: 50, height: 50, borderRadius: 6 },
  suggestionText: { flex: 1 },
  suggestionName: { fontSize: 13, color: '#1C3A5C' },
  suggestionPrice: { fontSize: 12, color: '#0f2f6f', fontWeight: 'bold' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1C3A5C', marginBottom: 15 },
  categoryItem: { alignItems: 'center', marginRight: 20 },
  categoryIconCircle: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#f3f7ff', justifyContent: 'center', alignItems: 'center', marginBottom: 5 },
  categoryName: { fontSize: 12, color: '#1C3A5C' },
  productsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  productCard: { width: columnWidth, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e8ecf0', marginBottom: 16, overflow: 'hidden' },
  imageContainer: { width: '100%', height: 120, backgroundColor: '#f3f7ff' },
  productImage: { width: '100%', height: '100%' },
  productInfo: { padding: 10 },
  productName: { fontSize: 13, color: '#1C3A5C', height: 35 },
  productCategory: { fontSize: 11, color: '#7a8ba5' },
  productPrice: { fontSize: 15, fontWeight: 'bold', color: '#1C3A5C', marginVertical: 8 },
  addButton: { backgroundColor: '#0f2f6f', padding: 8, borderRadius: 6, alignItems: 'center' },
  addButtonText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  bannersScroll: { marginVertical: 10, paddingHorizontal: 16 },
  bannerContainer: { width: width - 32, height: 180, marginRight: 15, borderRadius: 24, overflow: 'hidden' },
  bannerImage: { width: '100%', height: '100%', position: 'absolute' },
  bannerOverlay: { flex: 1, padding: 20, justifyContent: 'flex-end' },
  bannerTitle: { color: '#FFF', fontSize: 24, fontWeight: '900' },
  bannerSubtitle: { color: '#FFF', fontSize: 14 },
  orderStatusCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#cfdaea' },
  orderStatusHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 },
  orderNumber: { flex: 1, fontSize: 16, fontWeight: '700', color: '#1C3A5C' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusBadgeText: { fontSize: 12, fontWeight: '600' },
  orderStatusFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#f3f7ff', paddingTop: 12 },
  orderDate: { fontSize: 14, color: '#64748B' },
  viewDetailsBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  viewDetailsText: { fontSize: 14, fontWeight: '600', color: '#0f2f6f' },
});