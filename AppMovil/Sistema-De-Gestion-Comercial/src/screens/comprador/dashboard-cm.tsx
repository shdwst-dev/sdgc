import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, FlatList, Dimensions, Alert, ActivityIndicator, TextInput, Modal, StatusBar, Platform } from 'react-native';
import { Search, X, ShoppingCart, Star, MapPin, Package, RefreshCw, ChevronRight, Bell, Gift } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { ApiError, getMe } from '../../services/auth';
import { getDashboardCompradorData, ProductoDestacado, addToCarritoLocal, buscarProductos, Producto, getMisPedidos, PedidoResumen } from '../../services/comprador';
import { clearToken, getToken, hydrateToken } from '../../services/storage';
import { useToast } from '../../components/Toast';

const { width } = Dimensions.get('window');
const columnWidth = (width - 48) / 2;


const banners = [
  { id: 1, image: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800', title: 'Venta de Temporada', subtitle: 'Hasta 50% OFF', color: '#4F46E5' },
  { id: 2, image: 'https://images.unsplash.com/photo-1607082350899-7e105aa886ae?w=800', title: 'Tecnología Pro', subtitle: 'Nuevos Gadgets', color: '#0F172A' },
];

const getProductImage = (nombre: string, imagenUrl?: string | null): string => {
  if (imagenUrl && imagenUrl.includes('http')) return imagenUrl;
  return 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800';
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
  const [userName, setUserName] = useState('Comprador');

  const goToLogin = useCallback(() => {
    navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'RoleSelect' as never }] }));
  }, [navigation]);

  const loadDashboardData = useCallback(async () => {
    let token = getToken() || await hydrateToken();
    if (!token) { await clearToken(); goToLogin(); return; }

    try {
      setIsLoading(true);
      const userInfo = await getMe(token);
      setUserName(userInfo.persona?.nombre || 'Comprador');

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
      showToast({ message: `🎁 ${product.nombre} añadido`, type: 'success' });
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
      activeOpacity={0.9}
      onPress={() => navigation.navigate('DetalleProducto', { idProducto: item.id })}
    >
      <View style={styles.imageContainer}>
        <Image 
          source={{ uri: getProductImage(item.nombre, item.imagen_url) }} 
          style={styles.productImage} 
          resizeMode="cover"
        />
        <View style={styles.priceTag}>
          <Text style={styles.priceTagText}>${item.precio_unitario.toLocaleString()}</Text>
        </View>
      </View>
      <View style={styles.productContent}>
        <Text style={styles.productName} numberOfLines={2}>{item.nombre}</Text>
        <Text style={styles.productCategory}>{item.categoria}</Text>
        <TouchableOpacity 
          style={styles.productAddBtn} 
          onPress={(e) => { e.stopPropagation(); handleAddToCart(item); }}
        >
          <ShoppingCart size={16} color="#FFF" />
          <Text style={styles.productAddText}>Añadir</Text>
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
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        
        {/* Premium Header */}
        <LinearGradient
          colors={['#0f2f6f', '#1c3a5c', '#2c5282']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.welcomeText}>Hola, {userName} 👋</Text>
              <Text style={styles.appName}>Tienda Departamental</Text>
            </View>
            <TouchableOpacity style={styles.notificationBtn}>
              <Bell size={22} color="#FFF" />
              <View style={styles.notificationBadge} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={styles.searchBarPremium}
            onPress={() => setShowSearchModal(true)}
            activeOpacity={0.9}
          >
            <Search size={20} color="#64748B" />
            <Text style={styles.searchPlaceholder}>¿Qué estás buscando hoy?</Text>
          </TouchableOpacity>
        </LinearGradient>

        <View style={styles.contentBody}>
          {/* Banners */}
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            pagingEnabled 
            style={styles.bannersSection}
          >
            {banners.map(banner => (
              <View key={banner.id} style={styles.bannerWrapper}>
                <Image source={{ uri: banner.image }} style={styles.bannerImg} />
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.8)']}
                  style={styles.bannerTextOverlay}
                >
                  <Text style={styles.bannerSub}>{banner.subtitle}</Text>
                  <Text style={styles.bannerTtl}>{banner.title}</Text>
                </LinearGradient>
              </View>
            ))}
          </ScrollView>

          {/* Último Pedido - Estilo Dinámico */}
          {ultimoPedido && (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTtl}>Seguimiento de Pedido</Text>
              <TouchableOpacity onPress={() => navigation.navigate('MisPedidos' as never)}>
                <Text style={styles.viewMoreText}>Ver todos</Text>
              </TouchableOpacity>
            </View>
          )}

          {ultimoPedido && (
            <TouchableOpacity 
              style={styles.orderTrackingCard}
              onPress={() => navigation.navigate('DetallePedido', { idVenta: ultimoPedido.id })}
            >
              <View style={styles.orderIconBox}>
                <Package size={24} color="#0f2f6f" />
              </View>
              <View style={styles.orderMainInfo}>
                <Text style={styles.orderId}>Pedido #{ultimoPedido.id}</Text>
                <Text style={styles.orderSts}>{ultimoPedido.estado}</Text>
              </View>
              <View style={styles.orderRight}>
                <ChevronRight size={20} color="#94A3B8" />
              </View>
            </TouchableOpacity>
          )}


          {/* Recomendados con Grid Moderno */}
          <View style={styles.recommendedSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTtl}>Recomendados para ti</Text>
              <Gift size={20} color="#4F46E5" />
            </View>
            <View style={styles.grid}>
              {productos.map(item => renderProduct(item))}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Search Modal Refactorizado */}
      <Modal visible={showSearchModal} transparent animationType="slide">
        <View style={styles.searchModalContainer}>
          <View style={styles.searchModalHeader}>
            <View style={styles.searchModalInputWrapper}>
              <Search size={20} color="#64748B" />
              <TextInput 
                autoFocus 
                style={styles.searchModalInput} 
                placeholder="Buscar en la tienda..."
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              <TouchableOpacity onPress={() => setShowSearchModal(false)}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>
          </View>
          
          <ScrollView style={styles.searchModalResults}>
            {isSearching ? (
              <ActivityIndicator style={{ marginTop: 40 }} color="#0f2f6f" />
            ) : searchSuggestions.length > 0 ? (
              searchSuggestions.map(item => (
                <TouchableOpacity 
                  key={item.id} 
                  style={styles.searchResultItem}
                  onPress={() => {
                    navigation.navigate('DetalleProducto', { idProducto: item.id });
                    setShowSearchModal(false);
                  }}
                >
                  <Image source={{ uri: getProductImage(item.nombre, item.imagen_url) }} style={styles.searchResultImg} />
                  <View style={styles.searchResultInfo}>
                    <Text style={styles.searchResultName}>{item.nombre}</Text>
                    <Text style={styles.searchResultPrice}>${item.precio_unitario.toLocaleString()}</Text>
                  </View>
                  <ChevronRight size={18} color="#CBD5E1" />
                </TouchableOpacity>
              ))
            ) : searchQuery.length > 0 ? (
              <View style={styles.noResults}>
                <Text style={styles.noResultsText}>No encontramos resultados para "{searchQuery}"</Text>
              </View>
            ) : null}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  center: { justifyContent: 'center', alignItems: 'center' },
  headerGradient: {
    paddingTop: Platform.OS === 'ios' ? 70 : 50,
    paddingBottom: 30,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  welcomeText: { color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: '500' },
  appName: { color: '#FFF', fontSize: 22, fontWeight: '800' },
  notificationBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  notificationBadge: { position: 'absolute', top: 12, right: 12, width: 8, height: 8, borderRadius: 4, backgroundColor: '#F87171', borderWidth: 1.5, borderColor: '#1c3a5c' },
  searchBarPremium: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 16, paddingHorizontal: 16, height: 50, gap: 12, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8 },
  searchPlaceholder: { color: '#94A3B8', fontSize: 14 },
  contentBody: { paddingHorizontal: 20, paddingTop: 24 },
  bannersSection: { marginBottom: 28 },
  bannerWrapper: { width: width - 40, height: 200, marginRight: 16, borderRadius: 24, overflow: 'hidden', elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.15, shadowRadius: 10 },
  bannerImg: { width: '100%', height: '100%', position: 'absolute' },
  bannerTextOverlay: { flex: 1, padding: 24, justifyContent: 'flex-end' },
  bannerTtl: { color: '#FFF', fontSize: 26, fontWeight: '900' },
  bannerSub: { color: 'rgba(255,255,255,0.9)', fontSize: 14, fontWeight: '600' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTtl: { fontSize: 18, fontWeight: '800', color: '#1E293B', marginBottom: 16 },
  viewMoreText: { color: '#0f2f6f', fontWeight: '700', fontSize: 13 },
  orderTrackingCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 20, padding: 16, marginBottom: 28, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, borderWidth: 1, borderColor: '#F1F5F9' },
  orderIconBox: { width: 50, height: 50, borderRadius: 15, backgroundColor: 'rgba(15, 47, 111, 0.08)', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  orderMainInfo: { flex: 1 },
  orderId: { fontSize: 15, fontWeight: '700', color: '#334155' },
  orderSts: { fontSize: 13, color: '#64748B', marginTop: 2 },
  orderRight: { marginLeft: 10 },
  catScroll: { marginBottom: 32 },
  catItem: { alignItems: 'center', marginRight: 22 },
  catCircle: { width: 70, height: 70, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  catLabel: { fontSize: 13, fontWeight: '600', color: '#475569' },
  recommendedSection: { },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  productCard: { width: columnWidth, backgroundColor: '#FFF', borderRadius: 24, marginBottom: 20, elevation: 4, shadowColor: '#0F172A', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 12, overflow: 'hidden', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  imageContainer: { width: '100%', height: 160, position: 'relative' },
  productImage: { width: '100%', height: '100%' },
  priceTag: { position: 'absolute', bottom: 12, right: 12, backgroundColor: 'rgba(15, 47, 111, 0.9)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  priceTagText: { color: '#FFF', fontSize: 14, fontWeight: '800' },
  productContent: { padding: 16 },
  productName: { fontSize: 14, fontWeight: '700', color: '#1E293B', height: 40 },
  productCategory: { fontSize: 12, color: '#94A3B8', marginTop: 4, marginBottom: 14 },
  productAddBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f2f6f', paddingVertical: 10, borderRadius: 12, gap: 8 },
  productAddText: { color: '#FFF', fontSize: 13, fontWeight: '700' },
  searchModalContainer: { flex: 1, backgroundColor: '#FFF' },
  searchModalHeader: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  searchModalInputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 16, paddingHorizontal: 16, height: 52, gap: 12 },
  searchModalInput: { flex: 1, fontSize: 16, color: '#1E293B' },
  searchModalResults: { flex: 1, padding: 20 },
  searchResultItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', gap: 16 },
  searchResultImg: { width: 56, height: 56, borderRadius: 12 },
  searchResultInfo: { flex: 1 },
  searchResultName: { fontSize: 15, fontWeight: '600', color: '#1E293B' },
  searchResultPrice: { fontSize: 14, color: '#0f2f6f', fontWeight: '800', marginTop: 2 },
  noResults: { marginTop: 60, alignItems: 'center' },
  noResultsText: { color: '#94A3B8', fontSize: 15, textAlign: 'center' }
});