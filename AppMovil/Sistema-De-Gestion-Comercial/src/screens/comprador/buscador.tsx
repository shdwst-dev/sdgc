import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList, Dimensions, Alert, ActivityIndicator, ScrollView, StatusBar, Platform } from 'react-native';
import { Search, SlidersHorizontal, X, ChevronRight, ShoppingCart, Filter } from 'lucide-react-native';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { Image } from 'react-native';
import { ApiError } from '../../services/auth';
import { buscarProductos, Producto, addToCarritoLocal } from '../../services/comprador';
import { clearToken, getToken, hydrateToken } from '../../services/storage';
import { useToast } from '../../components/Toast';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');
const columnWidth = (width - 48) / 2;

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

const getProductImage = (nombre: string, imagenUrl?: string | null): string => {
  if (imagenUrl && imagenUrl.includes('http')) return imagenUrl;
  return 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800';
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function Buscar({ route }: { route?: any }) {
  const navigation = useNavigation<NavigationProp>();
  const { showToast } = useToast();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [productos, setProductos] = useState<Producto[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState('relevance');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    if (route?.params?.query) {
      setSearchQuery(route.params.query);
      navigation.setParams({ query: undefined } as any);
    }
  }, [route?.params?.query, navigation]);

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
        else if (!selectedCategory) setProductos([]);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, selectedCategory, sortBy, performSearch]);

  const renderProduct = ({ item }: { item: Producto }) => (
    <TouchableOpacity 
      style={styles.productCard}
      activeOpacity={0.9}
      onPress={() => navigation.navigate('DetalleProducto', { idProducto: item.id })}
    >
      <View style={styles.imageContainer}>
        <Image source={{ uri: getProductImage(item.nombre, item.imagen_url) }} style={styles.productImage} />
        <View style={styles.priceTag}>
          <Text style={styles.priceTagText}>${item.precio_unitario.toLocaleString()}</Text>
        </View>
      </View>
      <View style={styles.productContent}>
        <Text style={styles.productName} numberOfLines={2}>{item.nombre}</Text>
        <Text style={styles.productCategory}>{item.categoria}</Text>
        <TouchableOpacity 
          style={styles.productAddBtn}
          onPress={async (e) => {
            e.stopPropagation();
            try {
              await addToCarritoLocal(item, 1);
              showToast({ message: `📦 ${item.nombre} añadido`, type: 'success' });
            } catch {
              showToast({ message: 'Error', type: 'error' });
            }
          }}
        >
          <ShoppingCart size={14} color="#FFF" />
          <Text style={styles.productAddText}>Añadir</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Premium Header Search */}
      <View style={styles.header}>
        <View style={styles.searchBarWrapper}>
          <Search size={20} color="#64748B" />
          <TextInput
            placeholder="Encuentra lo que buscas..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
            placeholderTextColor="#94A3B8"
            autoCapitalize="sentences"
            returnKeyType="search"
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={{ padding: 4, backgroundColor: '#E2E8F0', borderRadius: 12 }}>
              <X size={14} color="#64748B" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Control Bar */}
      <View style={styles.controlBar}>
        <TouchableOpacity 
          style={[styles.controlBtn, showFilters && styles.controlBtnActive]} 
          onPress={() => setShowFilters(!showFilters)}
        >
          <Filter size={18} color={showFilters ? "#FFF" : "#0f2f6f"} />
          <Text style={[styles.controlBtnText, showFilters && { color: "#FFF" }]}>Filtros</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.sortBtn} onPress={() => {
            Alert.alert("Ordenar por", "", [
                { text: "💎 Relevancia", onPress: () => setSortBy('relevance') },
                { text: "📈 Menor Precio", onPress: () => setSortBy('price-low') },
                { text: "📉 Mayor Precio", onPress: () => setSortBy('price-high') },
                { text: "Cerrar", style: "cancel" }
            ]);
        }}>
          <Text style={styles.sortBtnText}>
            {sortBy === 'relevance' ? 'Relevancia' : sortBy === 'price-low' ? 'Menor Precio' : 'Mayor Precio'}
          </Text>
          <ChevronRight size={16} color="#0f2f6f" style={{ transform: [{ rotate: '90deg' }] }} />
        </TouchableOpacity>
      </View>

      {/* Categories Horizontal Shell */}
      <View style={styles.catsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
          {categories.map((cat, i) => (
            <TouchableOpacity 
              key={i} 
              style={[styles.catChip, selectedCategory === cat.name && styles.catChipActive]} 
              onPress={() => setSelectedCategory(selectedCategory === cat.name ? null : cat.name)}
            >
              <Text style={styles.catIcon}>{cat.icon}</Text>
              <Text style={[styles.catLabel, selectedCategory === cat.name && { color: '#FFF' }]}>{cat.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Content */}
      <View style={styles.resultArea}>
        {isLoading ? (
          <View style={styles.center}><ActivityIndicator size="large" color="#0f2f6f" /></View>
        ) : (
          <FlatList
            data={productos}
            renderItem={renderProduct}
            keyExtractor={item => item.id.toString()}
            numColumns={2}
            contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
            columnWrapperStyle={{ justifyContent: 'space-between' }}
            ListEmptyComponent={
              <View style={styles.emptyResults}>
                <View style={styles.emptyCircle}>
                  <Search size={40} color="#CBD5E1" />
                </View>
                <Text style={styles.emptyTitle}>
                  {searchQuery ? 'Sin coincidencias' : 'Explora productos'}
                </Text>
                <Text style={styles.emptySub}>
                  {searchQuery ? 'Intenta con otro término o categoría' : 'Busca por nombre o filtra por categoría'}
                </Text>
              </View>
            }
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { 
    backgroundColor: '#FFF', 
    paddingTop: Platform.OS === 'ios' ? 70 : 50, 
    paddingHorizontal: 16, 
    paddingBottom: 16 
  },
  searchBarWrapper: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#F1F5F9', 
    borderRadius: 18, 
    paddingHorizontal: 16, 
    height: 52,
    gap: 12
  },
  searchInput: { flex: 1, fontSize: 15, color: '#1E293B', fontWeight: '500' },
  controlBar: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  controlBtn: { 
    flex: 1, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    backgroundColor: '#FFF',
    borderWidth: 1, 
    borderColor: '#E2E8F0', 
    borderRadius: 14, 
    paddingVertical: 12, 
    gap: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5
  },
  controlBtnActive: { backgroundColor: '#0f2f6f', borderColor: '#0f2f6f' },
  controlBtnText: { fontSize: 13, color: '#0f2f6f', fontWeight: '700' },
  sortBtn: { 
    flex: 1, 
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderWidth: 1, 
    borderColor: '#E2E8F0', 
    borderRadius: 14, 
    justifyContent: 'center', 
    alignItems: 'center', 
    paddingVertical: 12,
    gap: 6
  },
  sortBtnText: { fontSize: 13, color: '#0f2f6f', fontWeight: '700' },
  catsContainer: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', backgroundColor: '#FFF' },
  catChip: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#F1F5F9', 
    paddingHorizontal: 14, 
    paddingVertical: 8, 
    borderRadius: 12, 
    marginRight: 10,
    gap: 6
  },
  catChipActive: { backgroundColor: '#0f2f6f' },
  catIcon: { fontSize: 16 },
  catLabel: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  resultArea: { flex: 1 },
  productCard: { width: columnWidth, backgroundColor: '#FFF', borderRadius: 24, marginBottom: 20, elevation: 4, shadowColor: '#0F172A', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 12, overflow: 'hidden' },
  imageContainer: { width: '100%', height: 160, position: 'relative' },
  productImage: { width: '100%', height: '100%' },
  priceTag: { position: 'absolute', bottom: 12, right: 12, backgroundColor: 'rgba(15, 47, 111, 0.9)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  priceTagText: { color: '#FFF', fontSize: 13, fontWeight: '800' },
  productContent: { padding: 14 },
  productName: { fontSize: 14, fontWeight: '700', color: '#1E293B', height: 40 },
  productCategory: { fontSize: 11, color: '#94A3B8', marginTop: 2, marginBottom: 12 },
  productAddBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f2f6f', paddingVertical: 8, borderRadius: 10, gap: 6 },
  productAddText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  emptyResults: { flex: 1, marginTop: 100, alignItems: 'center', paddingHorizontal: 40 },
  emptyCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: '#1E293B' },
  emptySub: { fontSize: 14, color: '#94A3B8', textAlign: 'center', marginTop: 10, lineHeight: 20 }
});