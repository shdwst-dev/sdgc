import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList, Dimensions, Alert, ActivityIndicator } from 'react-native';
import { Search, SlidersHorizontal, X } from 'lucide-react-native';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { Image } from 'react-native';
import { ApiError, getMe } from '../../services/auth';
import { buscarProductos, Producto, addToCarritoLocal } from '../../services/comprador';
import { clearToken, getToken, hydrateToken } from '../../services/storage';

const { width } = Dimensions.get('window');
const columnWidth = (width - 40) / 2;

const categories = [
  { name: 'Ropa', icon: '👕' },
  { name: 'Electrónica', icon: '📱' },
  { name: 'Hogar', icon: '🏠' },
  { name: 'Belleza', icon: '💄' },
];

export default function Buscar() {
  const navigation = useNavigation();
  const [searchQuery, setSearchQuery] = useState('');
  const [productos, setProductos] = useState<Producto[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState('relevance');

  const goToLogin = useCallback(() => {
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'InicioSesion' as never }],
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
      const results = await buscarProductos(token, query);
      let sortedResults = [...results];

      if (sortBy === 'price-low') {
        sortedResults.sort((a, b) => a.precio_unitario - b.precio_unitario);
      } else if (sortBy === 'price-high') {
        sortedResults.sort((a, b) => b.precio_unitario - a.precio_unitario);
      }

      setProductos(sortedResults);
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
      
      Alert.alert('Error', message);
    } finally {
      setIsLoading(false);
    }
  }, [goToLogin, sortBy]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim().length > 0) {
        performSearch(searchQuery);
      } else {
        setProductos([]);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery, performSearch]);

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

  const renderProduct = ({ item }: { item: Producto }) => (
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
          onPress={async () => {
            try {
              await addToCarritoLocal(item, 1);
              Alert.alert("¡Éxito!", `${item.nombre} agregado al carrito`);
            } catch (error) {
              Alert.alert("Error", "No se pudo agregar al carrito");
            }
          }}
        >
          <Text style={styles.addButtonText}>Agregar</Text>
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
                style={styles.catBtn}
                onPress={() => Alert.alert('Info', `Filtro por ${cat.name} (próximamente)`)}
              >
                <Text style={styles.catBtnText}>{cat.icon} {cat.name}</Text>
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
              data={productos}
              renderItem={renderProduct}
              keyExtractor={(item) => item.id.toString()}
              numColumns={2}
              columnWrapperStyle={{ justifyContent: 'space-between' }}
              scrollEnabled={true}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  searchHeader: { padding: 16, backgroundColor: '#fff', marginTop: 20, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  searchBar: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  searchInput: { flex: 1, marginHorizontal: 8, fontSize: 14, color: '#101828' },
  controlBar: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, gap: 10 },
  controlBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, paddingVertical: 10, gap: 6 },
  controlBtnActive: { backgroundColor: '#1C273F', borderColor: '#1C273F' },
  controlBtnText: { fontSize: 14, color: '#101828', fontWeight: '600' },
  sortBtn: { flex: 1, borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, justifyContent: 'center', alignItems: 'center', paddingVertical: 10 },
  sortBtnText: { fontSize: 14, color: '#101828', fontWeight: '600' },
  filtersPanel: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#F9FAFB', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  filterTitle: { fontSize: 14, fontWeight: '600', color: '#101828', marginBottom: 10 },
  catList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catBtn: { paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 6 },
  catBtnText: { fontSize: 12, color: '#101828' },
  resultsHeader: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  resultsCount: { fontSize: 14, color: '#6B7280', fontWeight: '600' },
  productCard: { width: columnWidth, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#eee', marginHorizontal: 8, marginBottom: 16, overflow: 'hidden' },
  imageContainer: { width: '100%', height: 120, backgroundColor: '#F3F4F6' },
  productImage: { width: '100%', height: '100%' },
  productInfo: { padding: 10 },
  productName: { fontSize: 13, color: '#101828', height: 35 },
  productCategory: { fontSize: 11, color: '#9CA3AF', marginBottom: 4 },
  productPrice: { fontSize: 15, fontWeight: 'bold', color: '#101828', marginVertical: 8 },
  addButton: { backgroundColor: '#1C273F', padding: 8, borderRadius: 6, alignItems: 'center' },
  addButtonText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
});