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
  const [searchQuery, setSearchQuery] = useState('');
  const [productos, setProductos] = useState<Producto[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState('relevance');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

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
      
      Alert.alert('Error', message);
    } finally {
      setIsLoading(false);
    }
  }, [goToLogin, sortBy, selectedCategory]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim().length > 0 || selectedCategory) {
        performSearch(searchQuery);
      } else {
        setProductos([]);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery, performSearch, selectedCategory]);

  useEffect(() => {
    if ((searchQuery.trim().length > 0 || selectedCategory) && productos.length > 0) {
      performSearch(searchQuery);
    }
  }, [sortBy]);

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
});