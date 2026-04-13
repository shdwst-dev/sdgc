import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions, Alert, Platform, StatusBar } from 'react-native';
import { ChevronLeft, ShoppingCart, Star, ShieldCheck, Truck, ArrowRight, Share2, Heart, Info } from 'lucide-react-native';
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
  const [isFavorite, setIsFavorite] = useState(false);

  const loadProducto = useCallback(async () => {
    let token = getToken() || await hydrateToken();
    if (!token) { navigation.navigate('RoleSelect'); return; }

    try {
      setIsLoading(true);
      const data = await getProductoById(token, idProducto);
      setProducto(data);
    } catch (error) {
      showToast({ message: 'Error cargando producto', type: 'error' });
      navigation.goBack();
    } finally {
      setIsLoading(false);
    }
  }, [idProducto, navigation, showToast]);

  useEffect(() => { loadProducto(); }, [loadProducto]);

  const handleAddToCart = async () => {
    if (!producto || isAdding) return;
    try {
      setIsAdding(true);
      const compradorProd: Producto = {
        id: producto.id,
        nombre: producto.nombre,
        imagen_url: producto.imagenUrl,
        precio_unitario: producto.precioUnitario,
        categoria: producto.categoria,
        stock_actual: producto.stockActual,
      };
      await addToCarritoLocal(compradorProd, 1);
      showToast({ message: `📦 ${producto.nombre} añadido`, type: 'success' });
    } catch (error) {
      showToast({ message: 'No se pudo agregar', type: 'error' });
    } finally {
      setIsAdding(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0f2f6f" />
      </View>
    );
  }

  if (!producto) return null;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Visual Header / Image Gallery */}
        <View style={styles.imageContainer}>
          <Image 
            source={{ uri: producto.imagenUrl || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800' }} 
            style={styles.mainImage} 
            resizeMode="cover"
          />
          <LinearGradient
            colors={['rgba(0,0,0,0.6)', 'transparent']}
            style={styles.imageHeaderOverlay}
          >
            <TouchableOpacity style={styles.navBtn} onPress={() => navigation.goBack()}>
              <ChevronLeft size={24} color="#FFF" />
            </TouchableOpacity>
            <View style={styles.rightHeaderActions}>
              <TouchableOpacity style={styles.navBtn} onPress={() => setIsFavorite(!isFavorite)}>
                <Heart size={22} color={isFavorite ? "#FB7185" : "#FFF"} fill={isFavorite ? "#FB7185" : "transparent"} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.navBtn}>
                <Share2 size={22} color="#FFF" />
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>

        {/* Product Details Section */}
        <View style={styles.detailsContent}>
          <View style={styles.categoryBadgeRow}>
            <View style={styles.catBadge}>
              <Text style={styles.catText}>{producto.categoria || 'General'}</Text>
            </View>
            <View style={styles.ratingRow}>
              <Star size={18} color="#FBBF24" fill="#FBBF24" />
              <Star size={18} color="#FBBF24" fill="#FBBF24" />
              <Star size={18} color="#FBBF24" fill="#FBBF24" />
              <Star size={18} color="#FBBF24" fill="#FBBF24" />
              <Star size={18} color="#E2E8F0" fill="#E2E8F0" />
              <Text style={styles.ratingCount}>(4.0)</Text>
            </View>
          </View>

          <Text style={styles.productTitle}>{producto.nombre}</Text>
          
          <View style={styles.priceContainer}>
            <Text style={styles.priceLabel}>Precio Unitario</Text>
            <Text style={styles.priceValue}>${producto.precioUnitario.toLocaleString()}</Text>
          </View>

          <View style={styles.premiumDivider} />

          {/* Value Props */}
          <View style={styles.valuePropsGrid}>
            <View style={styles.propItem}>
              <View style={[styles.propIcon, { backgroundColor: '#ECFDF5' }]}>
                <ShieldCheck size={22} color="#10B981" />
              </View>
              <Text style={styles.propTtl}>Garantía</Text>
              <Text style={styles.propSub}>Tienda Oficial</Text>
            </View>
            <View style={styles.propItem}>
              <View style={[styles.propIcon, { backgroundColor: '#EFF6FF' }]}>
                <Truck size={22} color="#3B82F6" />
              </View>
              <Text style={styles.propTtl}>Envío Gratis</Text>
              <Text style={styles.propSub}>Llega hoy</Text>
            </View>
          </View>

          {/* Description Section */}
          <View style={styles.descSection}>
            <View style={styles.descHeader}>
              <Info size={18} color="#0f2f6f" />
              <Text style={styles.descTtl}>Descripción del Producto</Text>
            </View>
            <Text style={styles.descText}>
              Este **{producto.nombre}** representa la excelencia en calidad de nuestro inventario. 
              Diseñado para ofrecer un rendimiento superior, es la opción ideal para usuarios exigentes. 
              {"\n\n"}Contamos con **{producto.stockActual} unidades** disponibles para envío inmediato.
            </Text>
          </View>

          {/* Technical Info Card */}
          <View style={styles.techCard}>
            <View style={styles.techRow}>
               <Text style={styles.techLabel}>Identificador SKU</Text>
               <Text style={styles.techVal}>{producto.sku || 'SDGC-0912'}</Text>
            </View>
            <View style={styles.techRow}>
               <Text style={styles.techLabel}>Stock Disponible</Text>
               <Text style={[styles.techVal, { color: '#10B981' }]}>{producto.stockActual} piezas</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Premium Buy Footer */}
      <View style={styles.bottomFooter}>
        <LinearGradient
          colors={['#0f2f6f', '#1c3a5c']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.buyBtnGradient}
        >
          <TouchableOpacity 
            style={styles.buyActionBtn}
            onPress={handleAddToCart}
            disabled={isAdding || producto.stockActual <= 0}
          >
            {isAdding ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Text style={styles.buyBtnText}>
                  {producto.stockActual > 0 ? 'Agregar a mi Bolsa' : 'Agotado'}
                </Text>
                <ShoppingCart size={22} color="#FFF" />
              </>
            )}
          </TouchableOpacity>
        </LinearGradient>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  imageContainer: { width: width, height: 420, backgroundColor: '#F1F5F9' },
  mainImage: { width: '100%', height: '100%' },
  imageHeaderOverlay: { 
    position: 'absolute', 
    top: 0, 
    left: 0, 
    right: 0, 
    height: 120, 
    paddingTop: Platform.OS === 'ios' ? 70 : 50, 
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  navBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
  rightHeaderActions: { flexDirection: 'row', gap: 12 },
  detailsContent: { 
    padding: 24, 
    marginTop: -30, 
    backgroundColor: '#FFF', 
    borderTopLeftRadius: 36, 
    borderTopRightRadius: 36,
    elevation: 20,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 20 
  },
  categoryBadgeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  catBadge: { backgroundColor: 'rgba(15, 47, 111, 0.08)', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 12 },
  catText: { color: '#0f2f6f', fontSize: 13, fontWeight: '800', textTransform: 'uppercase' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingCount: { marginLeft: 6, color: '#94A3B8', fontSize: 13, fontWeight: '600' },
  productTitle: { fontSize: 28, fontWeight: '900', color: '#1E293B', lineHeight: 34, marginBottom: 16 },
  priceContainer: { marginBottom: 24 },
  priceLabel: { fontSize: 14, color: '#94A3B8', fontWeight: '600', marginBottom: 4 },
  priceValue: { fontSize: 32, fontWeight: '900', color: '#0f2f6f' },
  premiumDivider: { height: 1.5, backgroundColor: '#F1F5F9', marginBottom: 28 },
  valuePropsGrid: { flexDirection: 'row', gap: 16, marginBottom: 32 },
  propItem: { flex: 1, padding: 16, backgroundColor: '#F8FAFC', borderRadius: 24, alignItems: 'center' },
  propIcon: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  propTtl: { fontSize: 14, fontWeight: '800', color: '#334155' },
  propSub: { fontSize: 11, color: '#94A3B8', marginTop: 2, fontWeight: '600' },
  descSection: { marginBottom: 32 },
  descHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  descTtl: { fontSize: 17, fontWeight: '800', color: '#1E293B' },
  descText: { fontSize: 15, color: '#64748B', lineHeight: 26 },
  techCard: { backgroundColor: '#F1F5F9', borderRadius: 24, padding: 20, gap: 14 },
  techRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  techLabel: { fontSize: 14, color: '#64748B', fontWeight: '600' },
  techVal: { fontSize: 14, color: '#1E293B', fontWeight: '800' },
  bottomFooter: { 
    position: 'absolute', 
    bottom: 0, 
    left: 0, 
    right: 0, 
    backgroundColor: '#FFF', 
    paddingHorizontal: 24, 
    paddingTop: 16, 
    paddingBottom: Platform.OS === 'ios' ? 40 : 25,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9'
  },
  buyBtnGradient: { borderRadius: 22 },
  buyActionBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    height: 60, 
    gap: 12 
  },
  buyBtnText: { color: '#FFF', fontSize: 17, fontWeight: '800' }
});
