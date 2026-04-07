import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert, ActivityIndicator, Modal } from 'react-native';
import { Minus, Plus, Trash2, ShoppingBag, X } from 'lucide-react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { getCarritoLocal, saveCarritoLocal, CartItem, checkout } from '../../services/comprador';
import { ApiError } from '../../services/auth';
import { getToken, hydrateToken, clearToken } from '../../services/storage';

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

const getProductImage = (nombre: string): string => {
  return imageMap[nombre] || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200';
};

export default function Carrito() {
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<CartItem | null>(null);
  const [productQuantity, setProductQuantity] = useState(1);

  const goToLogin = useCallback(() => {
    navigation.reset({ index: 0, routes: [{ name: 'InicioSesion' as never }] });
  }, [navigation]);

  useEffect(() => {
    if (isFocused) {
      loadCart();
    }
  }, [isFocused]);

  const loadCart = async () => {
    try {
      setIsLoading(true);
      const carritoData = await getCarritoLocal();
      setCart(carritoData);
    } catch (error) {
      Alert.alert('Error', 'No se pudo cargar el carrito');
    } finally {
      setIsLoading(false);
    }
  };

  const updateQuantity = useCallback(async (id: number, newQty: number) => {
    if (newQty < 1) return;
    
    const updatedCart = cart.map(item =>
      item.id === id ? { ...item, cantidad: newQty } : item
    );
    setCart(updatedCart);
    await saveCarritoLocal(updatedCart);
  }, [cart]);

  const removeFromCart = useCallback((id: number) => {
    Alert.alert('Eliminar', '¿Quitar este producto del carrito?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Quitar',
        style: 'destructive',
        onPress: async () => {
          const updatedCart = cart.filter(item => item.id !== id);
          setCart(updatedCart);
          await saveCarritoLocal(updatedCart);
        }
      }
    ]);
  }, [cart]);

  const getCartTotal = () => 
    cart.reduce((acc, item) => acc + (item.precio_unitario * item.cantidad), 0);

  const performCheckout = useCallback(async () => {
    try {
      const token = getToken() || await hydrateToken();
      if (!token) {
        await clearToken();
        goToLogin();
        return;
      }

      setIsCheckingOut(true);
      await checkout(token, cart);
      
      await saveCarritoLocal([]);
      setCart([]);
      
      Alert.alert('¡Éxito!', 'Tu compra ha sido procesada correctamente', [
        {
          text: 'OK',
          onPress: () => navigation.navigate('InicioTab' as never)
        }
      ]);
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 401) {
          await clearToken();
          goToLogin();
          return;
        }
      }
      Alert.alert('Error', error instanceof Error ? error.message : 'Error al procesar el pago');
    } finally {
      setIsCheckingOut(false);
    }
  }, [cart, goToLogin, navigation]);

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#1C273F" />
      </View>
    );
  }

  if (cart.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <ShoppingBag size={80} color="#D1D5DB" />
        <Text style={styles.emptyTitle}>Tu carrito está vacío</Text>
        <Text style={styles.emptySubtitle}>Agrega productos para comenzar tu compra</Text>
        <TouchableOpacity 
          style={styles.primaryBtn}
          onPress={() => navigation.navigate('InicioTab' as never)}
        >
          <Text style={styles.primaryBtnText}>Ir a Comprar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.mainContainer}>
      <ScrollView style={styles.scrollContainer} contentContainerStyle={{ paddingBottom: 100 }}>
        <Text style={styles.headerTitle}>Mi Carrito ({cart.length})</Text>

        <View style={styles.itemsList}>
          {cart.map((item) => (
            <TouchableOpacity 
              key={item.id} 
              style={styles.cartCard}
              activeOpacity={0.7}
              onPress={() => {
                setSelectedProduct(item);
                setProductQuantity(1);
                setShowProductModal(true);
              }}
            >
              <View style={styles.productRow}>
                {getProductImage(item.nombre) ? (
                  <Image source={{ uri: getProductImage(item.nombre) }} style={styles.productImage} />
                ) : (
                  <View style={[styles.productImage, { backgroundColor: '#f3f7ff', justifyContent: 'center', alignItems: 'center' }]}>
                    <ShoppingBag size={32} color="#b5c4d1" />
                  </View>
                )}
                <View style={styles.productDetails}>
                  <Text style={styles.productName} numberOfLines={2}>{item.nombre}</Text>
                  <Text style={styles.productPrice}>${item.precio_unitario.toLocaleString('es-MX')}</Text>
                  
                  <View style={styles.controlsRow}>
                    <View style={styles.quantitySelector}>
                      <TouchableOpacity 
                        onPress={() => updateQuantity(item.id, item.cantidad - 1)}
                        style={styles.qtyBtn}
                      >
                        <Minus size={16} color="#101828" />
                      </TouchableOpacity>
                      <Text style={styles.qtyText}>{item.cantidad}</Text>
                      <TouchableOpacity 
                        onPress={() => updateQuantity(item.id, item.cantidad + 1)}
                        style={styles.qtyBtn}
                      >
                        <Plus size={16} color="#101828" />
                      </TouchableOpacity>
                    </View>
                    
                    <TouchableOpacity onPress={() => removeFromCart(item.id)}>
                      <Trash2 size={20} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <View style={styles.summaryFooter}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Subtotal</Text>
          <Text style={styles.summaryValue}>${getCartTotal().toLocaleString('es-MX')}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Envío</Text>
          <Text style={[styles.summaryValue, { color: '#10B981' }]}>Gratis</Text>
        </View>
        <View style={[styles.summaryRow, styles.totalBorder]}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>${getCartTotal().toLocaleString('es-MX')}</Text>
        </View>

        <TouchableOpacity 
          style={[styles.checkoutBtn, isCheckingOut && styles.checkoutBtnDisabled]}
          onPress={performCheckout}
          disabled={isCheckingOut}
        >
          {isCheckingOut ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.checkoutBtnText}>Proceder al Pago</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Product Detail Modal */}
      <Modal
        visible={showProductModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowProductModal(false)}
      >
        <View style={styles.productDetailContainer}>
          <TouchableOpacity 
            style={styles.closeButton} 
            onPress={() => setShowProductModal(false)}
          >
            <X size={24} color="#1C3A5C" />
          </TouchableOpacity>

          {selectedProduct && (
            <ScrollView 
              style={styles.detailContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Product Image */}
              <View style={styles.detailImageContainer}>
                {getProductImage(selectedProduct.nombre) ? (
                  <Image 
                    source={{ uri: getProductImage(selectedProduct.nombre) }} 
                    style={styles.detailImage} 
                  />
                ) : (
                  <View style={[styles.detailImage, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#f3f7ff' }]}>
                    <Text style={{ fontSize: 60 }}>📦</Text>
                  </View>
                )}
              </View>

              {/* Product Info */}
              <View style={styles.detailInfo}>
                <Text style={styles.detailName}>{selectedProduct.nombre}</Text>

                {/* Price */}
                <View style={styles.priceContainer}>
                  <Text style={styles.detailPrice}>
                    ${selectedProduct.precio_unitario.toLocaleString('es-MX')}
                  </Text>
                </View>

                {/* Current Quantity in Cart */}
                <View style={styles.detailSection}>
                  <Text style={styles.sectionTitle}>En tu carrito</Text>
                  <View style={styles.sectionContent}>
                    <Text style={styles.sectionText}>
                      Cantidad actual: {selectedProduct.cantidad} unidad{selectedProduct.cantidad > 1 ? 'es' : ''}
                    </Text>
                  </View>
                </View>

                {/* Summary */}
                <View style={[styles.detailSection, { borderBottomWidth: 0 }]}>
                  <Text style={styles.sectionTitle}>Subtotal</Text>
                  <View style={styles.sectionContent}>
                    <Text style={styles.sectionText}>
                      ${(selectedProduct.precio_unitario * selectedProduct.cantidad).toLocaleString('es-MX')}
                    </Text>
                  </View>
                </View>
              </View>
            </ScrollView>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: '#e6f3fb' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#e6f3fb' },
  scrollContainer: { flex: 1, padding: 16 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#1C3A5C', marginBottom: 20, marginTop: 40 },
  itemsList: { gap: 16 },
  cartCard: { backgroundColor: '#FFF', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#cfdaea', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 },
  productRow: { flexDirection: 'row', gap: 12 },
  productImage: { width: 80, height: 80, borderRadius: 8, backgroundColor: '#f3f7ff' },
  productDetails: { flex: 1 },
  productName: { fontSize: 14, fontWeight: '500', color: '#1C3A5C', marginBottom: 4 },
  productPrice: { fontSize: 16, fontWeight: 'bold', color: '#0f2f6f', marginBottom: 12 },
  controlsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  quantitySelector: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#cfdaea', borderRadius: 8, overflow: 'hidden' },
  qtyBtn: { padding: 8, backgroundColor: '#f3f7ff' },
  qtyText: { paddingHorizontal: 12, fontSize: 14, fontWeight: '600', color: '#1C3A5C' },
  summaryFooter: { backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#cfdaea', padding: 16, paddingBottom: 24 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  summaryLabel: { fontSize: 14, color: '#5e728f' },
  summaryValue: { fontSize: 14, fontWeight: '600', color: '#1C3A5C' },
  totalBorder: { borderTopWidth: 1, borderTopColor: '#f3f7ff', paddingTop: 12, marginTop: 4 },
  totalLabel: { fontSize: 16, fontWeight: 'bold', color: '#1C3A5C' },
  totalValue: { fontSize: 20, fontWeight: 'bold', color: '#0f2f6f' },
  checkoutBtn: { backgroundColor: '#0f2f6f', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 16 },
  checkoutBtnDisabled: { backgroundColor: '#7a8ba5' },
  checkoutBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', color: '#1C3A5C', marginTop: 20 },
  emptySubtitle: { fontSize: 14, color: '#5e728f', textAlign: 'center', marginTop: 8, marginBottom: 24 },
  primaryBtn: { backgroundColor: '#0f2f6f', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12 },
  primaryBtnText: { color: '#FFF', fontSize: 16, fontWeight: '600' },

  // Product Detail Modal Styles
  productDetailContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingTop: 40,
  },
  closeButton: {
    position: 'absolute',
    top: 45,
    right: 16,
    zIndex: 10,
    padding: 8,
  },
  detailContent: {
    flex: 1,
    paddingTop: 32,
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  detailImageContainer: {
    width: '100%',
    height: 300,
    backgroundColor: '#f3f7ff',
    borderRadius: 12,
    marginBottom: 20,
    overflow: 'hidden',
  },
  detailImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  detailInfo: {
    paddingBottom: 20,
  },
  detailName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1C3A5C',
    marginBottom: 12,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  detailPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f2f6f',
  },
  detailSection: {
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#cfdaea',
    paddingBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C3A5C',
    marginBottom: 10,
  },
  sectionContent: {
    paddingHorizontal: 8,
  },
  sectionText: {
    fontSize: 13,
    color: '#5e728f',
    lineHeight: 20,
  }
});