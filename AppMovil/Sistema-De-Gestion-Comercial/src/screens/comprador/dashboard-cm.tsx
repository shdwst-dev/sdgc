import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, FlatList, Dimensions, Alert } from 'react-native';
import { Search } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');
const columnWidth = (width - 40) / 2;

const categories = [
  { name: 'Ropa', icon: '👕' },
  { name: 'Electrónica', icon: '📱' },
  { name: 'Hogar', icon: '🏠' },
  { name: 'Belleza', icon: '💄' },
];

const products = [
  { 
    id: 1, 
    name: 'Vestido Elegante de Verano', 
    price: 1299, 
    image: 'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=500' 
  },
  { 
    id: 2, 
    name: 'Audífonos Inalámbricos Premium', 
    price: 2499, 
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500' 
  },
  { 
    id: 3, 
    name: 'Smartphone Pro Max', 
    price: 18500, 
    image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=500' 
  },
  { 
    id: 4, 
    name: 'Tenis Deportivos', 
    price: 1800, 
    image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500' 
  },
];

export default function Inicio() {
  const navigation = useNavigation();

  const handleAddToCart = (productName: string) => {
    Alert.alert("Carrito", `${productName} se agregó (simulación)`);
  };

  const renderProduct = ({ item }: { item: any }) => (
    <View style={styles.productCard}>
      <View style={styles.imageContainer}>
        <Image source={{ uri: item.image }} style={styles.productImage} />
      </View>
      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
        <Text style={styles.productPrice}>${item.price.toLocaleString('es-MX')}</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => handleAddToCart(item.name)}
        >
          <Text style={styles.addButtonText}>Agregar al Carrito</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

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
          <Text style={styles.bannerTitle}>¡Hasta 50% OFF!</Text>
          <Text style={styles.bannerSubtitle}>En productos seleccionados</Text>
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
        <FlatList
          data={products}
          renderItem={renderProduct}
          keyExtractor={(item) => item.id.toString()}
          numColumns={2}
          scrollEnabled={false}
          columnWrapperStyle={{ justifyContent: 'space-between' }}
        />
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
  productPrice: { fontSize: 15, fontWeight: 'bold', color: '#101828', marginVertical: 8 },
  addButton: { backgroundColor: '#1C273F', padding: 8, borderRadius: 6, alignItems: 'center' },
  addButtonText: { color: '#fff', fontSize: 11, fontWeight: '600' },
});