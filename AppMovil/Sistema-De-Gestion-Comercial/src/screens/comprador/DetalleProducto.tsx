import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions, Alert, Platform } from 'react-native';
import { ChevronLeft, ShoppingCart, Star, ShieldCheck, Truck, ArrowRight } from 'lucide-react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { getProductoById } from '../../services/inventario';
import { addToCarritoLocal, Producto } from '../../services/comprador';
import { getToken, hydrateToken } from '../../services/storage';
import { useToast } from '../../components/Toast';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

type DetalleProductoRouteProp = RouteProp<RootStackParamList, 'DetalleProducto'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function DetalleProducto() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<DetalleProductoRouteProp>();
  const { idProducto } = route.params;
  const { showToast } = useToast();

  const [producto, setProducto] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);

  const loadProducto = useCallback(async () => {
    let token = getToken();
    if (!token) token = await hydrateToken();
    if (!token) {
      navigation.navigate('RoleSelect');
      return;
    }

    try {
      setIsLoading(true);
      const data = await getProductoById(token, idProducto);
      setProducto(data);
    } catch (error) {
      showToast({ message: 'No se pudo cargar la información del producto.', type: 'error' });
      navigation.goBack();
    } finally {
      setIsLoading(false);
    }
  }, [idProducto, navigation]);

  useEffect(() => {
    loadProducto();
  }, [loadProducto]);

  const handleAddToCart = async () => {
    if (!producto || isAdding) return;
    try {
      setIsAdding(true);
      // Mapear de InventarioProducto a Producto de comprador
      const compradorProd: Producto = {
        id: producto.id,
        nombre: producto.nombre,
        imagen_url: producto.imagenUrl,
        precio_unitario: producto.precioUnitario,
        categoria: producto.categoria,
        stock_actual: producto.stockActual,
      };
      await addToCarritoLocal(compradorProd, 1);
      showToast({ message: '¡Agregado al carrito!', type: 'success' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al agregar.';
      showToast({ message, type: 'error' });
    } finally {
      setIsAdding(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1C273F" />
      </View>
    );
  }

  if (!producto) return null;

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Gallery/Image Container */}
        <View style={styles.imageContainer}>
          <Image 
            source={{ uri: producto.imagenUrl || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800' }} 
            style={styles.mainImage} 
            resizeMode="cover"
          />
          <LinearGradient
            colors={['rgba(0,0,0,0.5)', 'transparent']}
            style={styles.imageOverlay}
          >
            <TouchableOpacity style={styles.iconButton} onPress={() => navigation.goBack()}>
              <ChevronLeft size={24} color="#FFF" />
            </TouchableOpacity>
          </LinearGradient>
        </View>

        {/* Content */}
        <View style={styles.content}>
          <View style={styles.categoryRow}>
            <Text style={styles.categoryBadge}>{producto.categoria}</Text>
            <View style={styles.ratingRow}>
              <Star size={16} color="#FBBF24" fill="#FBBF24" />
              <Text style={styles.ratingText}>4.8 (120 reseñas)</Text>
            </View>
          </View>

          <Text style={styles.productName}>{producto.nombre}</Text>
          <Text style={styles.productPrice}>${producto.precioUnitario.toLocaleString('es-MX')}</Text>

          <View style={styles.divider} />

          {/* Benefits */}
          <View style={styles.benefitsRow}>
            <View style={styles.benefitItem}>
              <View style={[styles.benefitIcon, { backgroundColor: '#F0FDF4' }]}>
                <ShieldCheck size={20} color="#10B981" />
              </View>
              <Text style={styles.benefitText}>Garantía SDGC</Text>
            </View>
            <View style={styles.benefitItem}>
              <View style={[styles.benefitIcon, { backgroundColor: '#EFF6FF' }]}>
                <Truck size={20} color="#3B82F6" />
              </View>
              <Text style={styles.benefitText}>Envío Rápido</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Descripción</Text>
          <Text style={styles.description}>
            Este {producto.nombre} es parte de nuestro catálogo de alta calidad. 
            Contamos con {producto.stockActual} unidades disponibles en stock para envío inmediato. 
            Ideal para satisfacer todas tus necesidades comerciales con la garantía y respaldo de nuestro sistema.
          </Text>

          {/* Extra Info */}
          <View style={styles.infoCard}>
            <View style={styles.infoLine}>
              <Text style={styles.infoLabel}>Disponibilidad:</Text>
              <Text style={[styles.infoVal, { color: producto.stockActual > 0 ? '#10B981' : '#EF4444' }]}>
                {producto.stockActual > 0 ? 'En Stock' : 'Agotado'}
              </Text>
            </View>
            <View style={styles.infoLine}>
              <Text style={styles.infoLabel}>Código SKU:</Text>
              <Text style={styles.infoVal}>{producto.sku || 'N/A'}</Text>
            </View>
          </View>

          <View style={{ height: 100 }} />
        </View>
      </ScrollView>

      {/* Floating Footer */}
      <View style={styles.footer}>
        <View style={styles.footerPriceCol}>
          <Text style={styles.footerPriceLabel}>Precio Total</Text>
          <Text style={styles.footerPrice}>${producto.precioUnitario.toLocaleString('es-MX')}</Text>
        </View>
        <TouchableOpacity 
          style={[styles.buyButton, producto.stockActual <= 0 && styles.disabledButton]} 
          onPress={handleAddToCart}
          disabled={producto.stockActual <= 0 || isAdding}
        >
          {isAdding ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Text style={styles.buyButtonText}>Añadir al Carrito</Text>
              <ShoppingCart size={20} color="#FFF" style={{ marginLeft: 8 }} />
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  imageContainer: { width: width, height: width * 1.1, backgroundColor: '#F1F5F9' },
  mainImage: { width: '100%', height: '100%' },
  imageOverlay: { 
    position: 'absolute', 
    top: 0, 
    left: 0, 
    right: 0, 
    height: 120, 
    paddingTop: 60, 
    paddingHorizontal: 20 
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 24,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    marginTop: -32,
    backgroundColor: '#FFF',
  },
  categoryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  categoryBadge: { 
    backgroundColor: '#F1F5F9', 
    color: '#1C273F', 
    paddingHorizontal: 12, 
    paddingVertical: 4, 
    borderRadius: 8, 
    fontSize: 13, 
    fontWeight: '600' 
  },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ratingText: { color: '#64748B', fontSize: 13 },
  productName: { color: '#1C273F', fontSize: 26, fontWeight: '800', marginBottom: 8 },
  productPrice: { fontSize: 28, fontWeight: '900', color: '#10B981' },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 20 },
  benefitsRow: { flexDirection: 'row', gap: 16, marginBottom: 24 },
  benefitItem: { 
    flex: 1, 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 12, 
    backgroundColor: '#F8FAFC', 
    padding: 12, 
    borderRadius: 16 
  },
  benefitIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  benefitText: { color: '#1C273F', fontSize: 13, fontWeight: '600' },
  sectionTitle: { color: '#1C273F', fontSize: 18, fontWeight: '700', marginBottom: 12 },
  description: { color: '#64748B', fontSize: 15, lineHeight: 24, marginBottom: 24 },
  infoCard: { backgroundColor: '#F8FAFC', padding: 20, borderRadius: 20 },
  infoLine: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  infoLabel: { color: '#64748B', fontSize: 14 },
  infoVal: { color: '#1C273F', fontSize: 14, fontWeight: '700' },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 20,
  },
  footerPriceCol: { flex: 1 },
  footerPriceLabel: { color: '#64748B', fontSize: 13 },
  footerPrice: { color: '#1C273F', fontSize: 22, fontWeight: '800' },
  buyButton: {
    flex: 1.5,
    backgroundColor: '#1C273F',
    height: 56,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#1C273F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  buyButtonText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  disabledButton: { backgroundColor: '#94A3B8' },
});
