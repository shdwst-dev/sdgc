import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList, Dimensions, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { Search, SlidersHorizontal, X } from 'lucide-react-native';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
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

const getProductImage = (nombre: string, imagenUrl?: string | null): string => {
  if (imagenUrl && imagenUrl.includes('http')) return imagenUrl;
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

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function Buscar() {
  const navigation = useNavigation<NavigationProp>();
  const { showToast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [productos, setProductos] = useState<Producto[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState('relevance');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [displayCount, setDisplayCount] = useState(20);

  const goToLogin = useCallback(() => {
    navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'RoleSelect' as never }] }));
  }, [navigation]);

  const performSearch = useCallback(async (query: string) => {
    let token = getToken() || await hydrateToken();
    if (!token) { await clearToken(); goToLogin(); return; }

    try {
      setIsLoading(true);
      const results = await buscarProductos(token, query);
      let filteredResults = [...results];

      if (selectedCategory) {
        filteredResults = filteredResults.filter(p => p.categoria.toLowerCase() === selectedCategory.toLowerCase());
      }

      if (sortBy === 'price-low') filteredResults.sort((a, b) => a.precio_unitario - b.precio_unitario);
      else if (sortBy === 'price-high') filteredResults.sort((a, b) => b.precio_unitario - a.precio_unitario);

      setProductos(filteredResults);
    } catch {
      showToast({ message: 'Error en la búsqueda.', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  }, [goToLogin, sortBy, selectedCategory, showToast]);

  useEffect(() => {
    const timer = setTimeout(() => {
        if (searchQuery.trim() || selectedCategory) performSearch(searchQuery);
        else setProductos([]);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery, selectedCategory, sortBy, performSearch]);

  const renderProduct = ({ item }: { item: Producto }) => (
    <TouchableOpacity 
      style={styles.productCard}
      activeOpacity={0.7}
      onPress={() => navigation.navigate('DetalleProducto', { idProducto: item.id })}
    >
      <View style={styles.imageContainer}>
        <Image source={{ uri: getProductImage(item.nombre, item.imagen_url) }} style={styles.productImage} />
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
              showToast({ message: `${item.nombre} agregado`, type: 'success' });
            } catch {
              showToast({ message: 'Error', type: 'error' });
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
            placeholder="Buscar productos..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
            placeholderTextColor="#9CA3AF"
          />
          {searchQuery !== '' && <TouchableOpacity onPress={() => setSearchQuery('')}><X size={20} color="#9CA3AF" /></TouchableOpacity>}
        </View>
      </View>

      <View style={styles.controlBar}>
        <TouchableOpacity style={[styles.controlBtn, showFilters && styles.controlBtnActive]} onPress={() => setShowFilters(!showFilters)}>
          <SlidersHorizontal size={18} color={showFilters ? "#FFF" : "#101828"} />
          <Text style={[styles.controlBtnText, showFilters && { color: "#FFF" }]}>Filtros</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.sortBtn} onPress={() => {
            Alert.alert("Ordenar", "Selecciona una opción", [
                { text: "Relevancia", onPress: () => setSortBy('relevance') },
                { text: "Precio ↓", onPress: () => setSortBy('price-low') },
                { text: "Precio ↑", onPress: () => setSortBy('price-high') },
                { text: "Cancelar", style: "cancel" }
            ]);
        }}>
          <Text style={styles.sortBtnText}>{sortBy === 'relevance' ? 'Relevancia' : sortBy === 'price-low' ? 'Precio ↓' : 'Precio ↑'}</Text>
        </TouchableOpacity>
      </View>

      {showFilters && (
        <View style={styles.filtersPanel}>
          <View style={styles.catList}>
            {categories.map((cat, i) => (
              <TouchableOpacity key={i} style={[styles.catBtn, selectedCategory === cat.name && styles.catBtnActive]} onPress={() => setSelectedCategory(selectedCategory === cat.name ? null : cat.name)}>
                <Text style={[styles.catBtnText, selectedCategory === cat.name && { color: '#FFF' }]}>{cat.icon} {cat.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#0f2f6f" /></View>
      ) : (
        <FlatList
          data={productos}
          renderItem={renderProduct}
          keyExtractor={item => item.id.toString()}
          numColumns={2}
          contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={<View style={styles.center}><Text style={{ color: '#9CA3AF' }}>{searchQuery ? 'Sin resultados' : 'Escribe para buscar'}</Text></View>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  searchHeader: { padding: 16, marginTop: 40, borderBottomWidth: 1, borderBottomColor: '#f3f7ff' },
  searchBar: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#cfdaea', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  searchInput: { flex: 1, marginHorizontal: 8, fontSize: 14, color: '#1C3A5C' },
  controlBar: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, gap: 10 },
  controlBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#cfdaea', borderRadius: 8, paddingVertical: 10, gap: 6 },
  controlBtnActive: { backgroundColor: '#0f2f6f', borderColor: '#0f2f6f' },
  controlBtnText: { fontSize: 14, color: '#1C3A5C', fontWeight: '600' },
  sortBtn: { flex: 1, borderWidth: 1, borderColor: '#cfdaea', borderRadius: 8, justifyContent: 'center', alignItems: 'center', paddingVertical: 10 },
  sortBtnText: { fontSize: 14, color: '#1C3A5C', fontWeight: '600' },
  filtersPanel: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#f3f7ff' },
  catList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catBtn: { paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: '#cfdaea', borderRadius: 6 },
  catBtnActive: { backgroundColor: '#0f2f6f', borderColor: '#0f2f6f' },
  catBtnText: { fontSize: 12, color: '#1C3A5C' },
  productCard: { width: columnWidth, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#f3f7ff', marginBottom: 16, overflow: 'hidden' },
  imageContainer: { width: '100%', height: 120, backgroundColor: '#f3f7ff' },
  productImage: { width: '100%', height: '100%' },
  productInfo: { padding: 10 },
  productName: { fontSize: 13, color: '#1C3A5C', height: 35 },
  productCategory: { fontSize: 11, color: '#7a8ba5', marginBottom: 4 },
  productPrice: { fontSize: 15, fontWeight: 'bold', color: '#1C3A5C', marginVertical: 8 },
  addButton: { backgroundColor: '#0f2f6f', padding: 8, borderRadius: 6, alignItems: 'center' },
  addButtonText: { color: '#fff', fontSize: 11, fontWeight: '600' },
});