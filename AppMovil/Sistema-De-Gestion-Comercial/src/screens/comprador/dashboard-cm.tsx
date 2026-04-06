import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, FlatList, Dimensions, Alert, ActivityIndicator } from 'react-native';
import { Search } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { ApiError, getMe } from '../../services/auth';
import { getDashboardCompradorData, ProductoDestacado, addToCarritoLocal } from '../../services/comprador';
import { clearToken, getToken, hydrateToken } from '../../services/storage';

const { width } = Dimensions.get('window');
const columnWidth = (width - 40) / 2;

const categories = [
  { name: 'Ropa', icon: '👕' },
  { name: 'Electrónica', icon: '📱' },
  { name: 'Hogar', icon: '🏠' },
  { name: 'Belleza', icon: '💄' },
];

export default function Inicio() {
  const navigation = useNavigation();
  const [productos, setProductos] = useState<ProductoDestacado[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      setError(null);

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
      
      setError(message);
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

  const renderProduct = ({ item }: { item: ProductoDestacado }) => (
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
          <Text style={styles.searchPlaceholder}>Buscar productos, marcas...</Text>
        </View>
      </View>

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
          <FlatList
            data={productos}
            renderItem={renderProduct}
            keyExtractor={(item) => item.id.toString()}
            numColumns={2}
            scrollEnabled={false}
            columnWrapperStyle={{ justifyContent: 'space-between' }}
          />
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
  searchBar: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 12, padding: 12 },
  searchPlaceholder: { marginLeft: 10, color: '#9CA3AF' },
  banner: { height: 160, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  bannerTitle: { color: '#fff', fontSize: 26, fontWeight: 'bold' },
  bannerSubtitle: { color: '#fff', fontSize: 14, opacity: 0.9 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#101828', marginBottom: 15 },
  viewAll: { color: '#1C273F', fontSize: 14 },
  categoryItem: { alignItems: 'center', marginRight: 20 },
  categoryIconCircle: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#1C273F', justifyContent: 'center', alignItems: 'center', marginBottom: 5 },
  categoryName: { fontSize: 12, color: '#101828' },
  productCard: { width: columnWidth, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#eee', marginBottom: 16, overflow: 'hidden' },
  imageContainer: { width: '100%', height: 120, backgroundColor: '#F3F4F6' },
  productImage: { width: '100%', height: '100%' },
  productInfo: { padding: 10 },
  productName: { fontSize: 13, color: '#101828', height: 35 },
  productCategory: { fontSize: 11, color: '#9CA3AF', marginBottom: 4 },
  productPrice: { fontSize: 15, fontWeight: 'bold', color: '#101828', marginVertical: 8 },
  addButton: { backgroundColor: '#1C273F', padding: 8, borderRadius: 6, alignItems: 'center' },
  addButtonText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  retryButton: { backgroundColor: '#1C273F', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 6 },
  retryButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
});