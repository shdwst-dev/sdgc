import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert, ActivityIndicator, Modal, StatusBar, Platform } from 'react-native';
import { Minus, Plus, Trash2, ShoppingBag, X, ChevronRight, MapPin, CreditCard, CheckCircle2 } from 'lucide-react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  getCarritoLocal, 
  saveCarritoLocal, 
  CartItem, 
  checkout, 
  getDireccionesLocal, 
  getDireccionesCloud,
  getMetodosPagoLocal, 
  getFavoritePaymentMethodLocal,
  Direccion,
  MetodoPago
} from '../../services/comprador';
import { ApiError } from '../../services/auth';
import { getToken, hydrateToken, clearToken } from '../../services/storage';
import { useToast } from '../../components/Toast';

const getProductImage = (nombre: string, imagenUrl?: string | null): string => {
  if (imagenUrl && imagenUrl.includes('http')) return imagenUrl;
  return 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800';
};

export default function Carrito() {
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const { showToast } = useToast();
  
  // States
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  
  // Modal States
  const [showProductModal, setShowProductModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<CartItem | null>(null);
  const [productQuantity, setProductQuantity] = useState(1);
  
  // Checkout Summary States
  const [showSummary, setShowSummary] = useState(false);
  const [direcciones, setDirecciones] = useState<Direccion[]>([]);
  const [metodosPago, setMetodosPago] = useState<MetodoPago[]>([]);
  const [selectedDir, setSelectedDir] = useState<Direccion | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<MetodoPago | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const getStockMaxSafe = useCallback((item: CartItem) => {
    const stock = Number(item.stock_maximo ?? item.cantidad);
    return Number.isFinite(stock) && stock > 0 ? stock : item.cantidad;
  }, []);

  const goToLogin = useCallback(() => {
    navigation.reset({ index: 0, routes: [{ name: 'RoleSelect' as never }] });
  }, [navigation]);

  const loadCart = async () => {
    try {
      setIsLoading(true);
      const carritoData = await getCarritoLocal();
      setCart(carritoData);
    } catch (error) {
      showToast({ message: 'No se pudo cargar el carrito', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const loadCheckoutData = async () => {
    try {
      const token = getToken() || await hydrateToken();
      const [dirs, methods, favId] = await Promise.all([
        token ? getDireccionesCloud(token) : getDireccionesLocal(),
        getMetodosPagoLocal(),
        getFavoritePaymentMethodLocal()
      ]);
      setDirecciones(dirs);
      setMetodosPago(methods);
      
      if (dirs.length > 0) setSelectedDir(dirs[0]);
      if (methods.length > 0) {
        const fav = methods.find(m => m.id === favId) || methods[0];
        setSelectedMethod(fav);
      }
    } catch (error) {
      console.error('Error loading checkout data:', error);
    }
  };

  useEffect(() => {
    if (isFocused) {
      loadCart();
    }
  }, [isFocused]);

  const updateQuantity = useCallback(async (id: number, newQty: number, stockMax: number) => {
    if (newQty < 1) return;
    if (newQty > stockMax) {
      showToast({ message: `Límite de stock: ${stockMax}`, type: 'error' });
      return;
    }
    
    const updatedCart = cart.map(item =>
      item.id === id ? { ...item, cantidad: newQty } : item
    );
    setCart(updatedCart);
    await saveCarritoLocal(updatedCart);
  }, [cart, showToast]);

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

  const handleProcederAlPago = () => {
    loadCheckoutData();
    setShowSummary(true);
  };

  const confirmCheckout = useCallback(async () => {
    if (!selectedDir) {
      showToast({ message: 'Por favor selecciona una dirección', type: 'error' });
      return;
    }
    if (!selectedMethod) {
      showToast({ message: 'Por favor selecciona un método de pago', type: 'error' });
      return;
    }

    try {
      const token = getToken() || await hydrateToken();
      if (!token) {
        await clearToken();
        goToLogin();
        return;
      }

      setIsCheckingOut(true);
      
      // Final Stock Validation
      const invalidItem = cart.find((item) => item.cantidad > getStockMaxSafe(item));
      if (invalidItem) {
        Alert.alert('Stock insuficiente', `Solo quedan ${getStockMaxSafe(invalidItem)} unidades de ${invalidItem.nombre}`);
        setShowSummary(false);
        return;
      }

      await checkout(token, cart, selectedMethod.id);
      
      // Success flow
      await saveCarritoLocal([]);
      setCart([]);
      setIsSuccess(true);
      
      setTimeout(() => {
        setIsSuccess(false);
        setShowSummary(false);
        navigation.navigate('MisPedidos' as never);
        showToast({ message: '¡Pedido realizado con éxito!', type: 'success' });
      }, 2500);

    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        await clearToken();
        goToLogin();
        return;
      }
      const msg = error instanceof Error ? error.message : 'Error al procesar orden';
      // Alerta visible sobre modal
      Alert.alert('Error', msg);
    } finally {
      setIsCheckingOut(false);
    }
  }, [cart, selectedDir, selectedMethod, getStockMaxSafe, goToLogin, navigation, showToast]);

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0f2f6f" />
      </View>
    );
  }

  if (cart.length === 0 && !isSuccess) {
    return (
      <View style={styles.emptyContainer}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.emptyIconCircle}>
          <ShoppingBag size={64} color="#CBD5E1" />
        </View>
        <Text style={styles.emptyTitle}>Tu carrito está vacío</Text>
        <Text style={styles.emptySubtitle}>Parece que aún no has añadido nada a tu bolsa de compras.</Text>
        <TouchableOpacity 
          style={styles.exploreBtn}
          onPress={() => navigation.navigate('InicioTab' as never)}
        >
          <Text style={styles.exploreBtnText}>Ir a la Tienda</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.mainContainer}>
      <StatusBar barStyle="dark-content" />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mi Bolsa</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{cart.length} artículos</Text>
        </View>
      </View>

      <ScrollView 
        style={styles.scrollContainer} 
        contentContainerStyle={{ paddingBottom: 260 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.itemsList}>
          {cart.map((item) => (
            <View key={item.id} style={styles.cartCard}>
              <TouchableOpacity 
                style={styles.itemImageWrapper}
                onPress={() => {
                  setSelectedProduct(item);
                  setProductQuantity(item.cantidad);
                  setShowProductModal(true);
                }}
              >
                <Image 
                  source={{ uri: getProductImage(item.nombre, item.imagen_url) }} 
                  style={styles.productImage} 
                />
              </TouchableOpacity>
              
              <View style={styles.productDetails}>
                <View style={styles.detailHeader}>
                  <Text style={styles.productName} numberOfLines={1}>{item.nombre}</Text>
                  <TouchableOpacity onPress={() => removeFromCart(item.id)}>
                    <Trash2 size={18} color="#F87171" />
                  </TouchableOpacity>
                </View>
                
                <Text style={styles.productCategory}>{item.categoria || 'Producto'}</Text>
                
                <View style={styles.priceRow}>
                  <Text style={styles.productPrice}>${item.precio_unitario.toLocaleString()}</Text>
                  
                  <View style={styles.qtyContainer}>
                    <TouchableOpacity 
                      onPress={() => updateQuantity(item.id, item.cantidad - 1, getStockMaxSafe(item))}
                      style={styles.qtyAction}
                    >
                      <Minus size={14} color="#64748B" />
                    </TouchableOpacity>
                    <Text style={styles.qtyDisplay}>{item.cantidad}</Text>
                    <TouchableOpacity 
                      onPress={() => updateQuantity(item.id, item.cantidad + 1, getStockMaxSafe(item))}
                      style={styles.qtyAction}
                    >
                      <Plus size={14} color="#64748B" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Floating Footer Summary */}
      <View style={styles.floatingFooter}>
        <View style={styles.totalSection}>
          <View>
            <Text style={styles.totalLabel}>Total estimado</Text>
            <Text style={styles.totalValue}>${getCartTotal().toLocaleString()}</Text>
          </View>
          <TouchableOpacity 
            style={styles.checkoutPrimaryBtn}
            onPress={handleProcederAlPago}
          >
            <Text style={styles.checkoutPrimaryText}>Checkout</Text>
            <ChevronRight size={20} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* MODAL: ORDER SUMMARY */}
      <Modal
        visible={showSummary}
        animationType="slide"
        transparent={true}
        onRequestClose={() => !isCheckingOut && setShowSummary(false)}
      >
        <View style={styles.summaryModalOverlay}>
          <View style={styles.summaryModalContent}>
            {isSuccess ? (
              <View style={styles.successContainer}>
                <View style={styles.successCircle}>
                  <CheckCircle2 size={80} color="#10B981" />
                </View>
                <Text style={styles.successTitle}>¡Pedido Exitoso!</Text>
                <Text style={styles.successSub}>Tu orden ha sido procesada correctamente.</Text>
                <ActivityIndicator color="#10B981" style={{ marginTop: 20 }} />
              </View>
            ) : (
              <>
                <View style={styles.summaryHeader}>
                  <Text style={styles.summaryTitle}>Resumen de Orden</Text>
                  <TouchableOpacity onPress={() => setShowSummary(false)} disabled={isCheckingOut}>
                    <X size={24} color="#1E293B" />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.summaryScroll} showsVerticalScrollIndicator={false}>
                  {/* Entrega */}
                  <View style={styles.summarySection}>
                    <View style={styles.sectionIconRow}>
                      <MapPin size={20} color="#0f2f6f" />
                      <Text style={styles.sectionTtl}>Dirección de Entrega</Text>
                    </View>
                    
                    {direcciones.length > 0 ? (
                      <View style={styles.optionList}>
                        {direcciones.map(dir => (
                          <TouchableOpacity 
                            key={dir.id} 
                            style={[styles.optionCard, selectedDir?.id === dir.id && styles.optionCardActive]}
                            onPress={() => setSelectedDir(dir)}
                          >
                            <View style={styles.optionInfo}>
                              <Text style={styles.optionTtl}>{dir.calle} {dir.numero_exterior}</Text>
                              <Text style={styles.optionSub}>{dir.colonia}, {dir.ciudad}</Text>
                            </View>
                            <View style={[styles.radio, selectedDir?.id === dir.id && styles.radioActive]} />
                          </TouchableOpacity>
                        ))}
                      </View>
                    ) : (
                      <TouchableOpacity 
                        style={styles.addMissingBtn}
                        onPress={() => { setShowSummary(false); navigation.navigate('PerfilTab' as never); }}
                      >
                        <Text style={styles.addMissingText}>+ Agregar Dirección</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Pago */}
                  <View style={styles.summarySection}>
                    <View style={styles.sectionIconRow}>
                      <CreditCard size={20} color="#0f2f6f" />
                      <Text style={styles.sectionTtl}>Método de Pago</Text>
                    </View>
                    
                    <View style={styles.optionList}>
                      {metodosPago.map(method => (
                        <TouchableOpacity 
                          key={method.id} 
                          style={[styles.optionCard, selectedMethod?.id === method.id && styles.optionCardActive]}
                          onPress={() => setSelectedMethod(method)}
                        >
                          <View style={styles.optionInfo}>
                            <Text style={styles.optionTtl}>{method.nombre}</Text>
                          </View>
                          <View style={[styles.radio, selectedMethod?.id === method.id && styles.radioActive]} />
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* Totales */}
                  <View style={styles.finalDesglose}>
                    <View style={styles.desgloseRow}>
                      <Text style={styles.desgloseLabel}>Subtotal</Text>
                      <Text style={styles.desgloseVal}>${getCartTotal().toLocaleString()}</Text>
                    </View>
                    <View style={styles.desgloseRow}>
                      <Text style={styles.desgloseLabel}>Envío</Text>
                      <Text style={[styles.desgloseVal, { color: '#10B981' }]}>¡Gratis!</Text>
                    </View>
                    <View style={[styles.desgloseRow, styles.totalRowBorder]}>
                      <Text style={styles.totalFinalLabel}>Total</Text>
                      <Text style={styles.totalFinalVal}>${getCartTotal().toLocaleString()}</Text>
                    </View>
                  </View>
                </ScrollView>

                <TouchableOpacity 
                  style={[styles.confirmBtn, isCheckingOut && styles.confirmBtnDisabled]}
                  onPress={confirmCheckout}
                  disabled={isCheckingOut}
                >
                  {isCheckingOut ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={styles.confirmBtnText}>Finalizar Compra</Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Product Adjustment Modal (Lite) */}
      <Modal
        visible={showProductModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowProductModal(false)}
      >
        <View style={styles.adjustModalOverlay}>
          <View style={styles.adjustModalContent}>
            {selectedProduct && (
              <>
                <View style={styles.adjustHeader}>
                  <Text style={styles.adjustTtl}>Ajustar Cantidad</Text>
                  <TouchableOpacity onPress={() => setShowProductModal(false)}>
                    <X size={20} color="#64748B" />
                  </TouchableOpacity>
                </View>
                
                <Image 
                  source={{ uri: getProductImage(selectedProduct.nombre, selectedProduct.imagen_url) }} 
                  style={styles.adjustImg} 
                />
                <Text style={styles.adjustName}>{selectedProduct.nombre}</Text>
                
                <View style={styles.adjustQtyRow}>
                  <TouchableOpacity 
                    style={styles.bigQtyBtn}
                    onPress={() => productQuantity > 1 && setProductQuantity(productQuantity - 1)}
                  >
                    <Minus size={24} color="#0f2f6f" />
                  </TouchableOpacity>
                  <Text style={styles.bigQtyVal}>{productQuantity}</Text>
                  <TouchableOpacity 
                    style={styles.bigQtyBtn}
                    onPress={() => productQuantity < getStockMaxSafe(selectedProduct) && setProductQuantity(productQuantity + 1)}
                  >
                    <Plus size={24} color="#0f2f6f" />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity 
                  style={styles.updateQtyBtn}
                  onPress={() => {
                    updateQuantity(selectedProduct.id, productQuantity, getStockMaxSafe(selectedProduct));
                    setShowProductModal(false);
                  }}
                >
                  <Text style={styles.updateQtyText}>Actualizar Bolsa</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: '#F8FAFC' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { 
    paddingTop: Platform.OS === 'ios' ? 70 : 50, 
    paddingHorizontal: 24, 
    paddingBottom: 20, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    backgroundColor: '#FFF'
  },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#1E293B' },
  countBadge: { backgroundColor: '#F1F5F9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  countText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  scrollContainer: { flex: 1, paddingHorizontal: 20, paddingTop: 10 },
  itemsList: { gap: 16 },
  cartCard: { 
    flexDirection: 'row', 
    backgroundColor: '#FFF', 
    borderRadius: 20, 
    padding: 12, 
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8
  },
  itemImageWrapper: { width: 90, height: 90, borderRadius: 16, backgroundColor: '#F8FAFC', overflow: 'hidden' },
  productImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  productDetails: { flex: 1, marginLeft: 16 },
  detailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  productName: { fontSize: 15, fontWeight: '700', color: '#1E293B', width: '80%' },
  productCategory: { fontSize: 12, color: '#94A3B8', marginTop: 2, marginBottom: 10 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  productPrice: { fontSize: 18, fontWeight: '800', color: '#0f2f6f' },
  qtyContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 8, padding: 4 },
  qtyAction: { padding: 6 },
  qtyDisplay: { paddingHorizontal: 12, fontSize: 14, fontWeight: '700', color: '#1E293B' },
  floatingFooter: { 
    position: 'absolute', 
    bottom: Platform.OS === 'ios' ? 100 : 90, 
    left: 12, 
    right: 12, 
    backgroundColor: '#FFF', 
    paddingHorizontal: 20, 
    paddingTop: 16, 
    paddingBottom: 20,
    borderRadius: 28,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.12,
    shadowRadius: 15,
    borderWidth: 1,
    borderColor: '#F1F5F9'
  },
  totalSection: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontSize: 13, color: '#94A3B8', fontWeight: '600' },
  totalValue: { fontSize: 24, fontWeight: '900', color: '#1E293B' },
  checkoutPrimaryBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#0f2f6f', 
    paddingHorizontal: 24, 
    paddingVertical: 14, 
    borderRadius: 18, 
    gap: 8 
  },
  checkoutPrimaryText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  // Empty State
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyIconCircle: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  emptyTitle: { fontSize: 22, fontWeight: '800', color: '#1E293B' },
  emptySubtitle: { fontSize: 15, color: '#94A3B8', textAlign: 'center', marginTop: 12, lineHeight: 22 },
  exploreBtn: { backgroundColor: '#0f2f6f', marginTop: 32, paddingHorizontal: 32, paddingVertical: 16, borderRadius: 20 },
  exploreBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  // Summary Modal
  summaryModalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'flex-end' },
  summaryModalContent: { 
    backgroundColor: '#FFF', 
    height: '92%', 
    borderTopLeftRadius: 36, 
    borderTopRightRadius: 36, 
    padding: 24,
    paddingTop: Platform.OS === 'ios' ? 40 : 20
  },
  summaryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  summaryTitle: { fontSize: 20, fontWeight: '800', color: '#1E293B' },
  summaryScroll: { flex: 1 },
  summarySection: { marginBottom: 24 },
  sectionIconRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  sectionTtl: { fontSize: 15, fontWeight: '700', color: '#1E293B' },
  optionList: { gap: 12 },
  optionCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 16, 
    borderRadius: 16, 
    borderWidth: 1.5, 
    borderColor: '#F1F5F9' 
  },
  optionCardActive: { borderColor: '#0f2f6f', backgroundColor: 'rgba(15, 47, 111, 0.02)' },
  optionInfo: { flex: 1 },
  optionTtl: { fontSize: 14, fontWeight: '700', color: '#334155' },
  optionSub: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#CBD5E1' },
  radioActive: { borderColor: '#0f2f6f', borderWidth: 6 },
  addMissingBtn: { padding: 16, borderRadius: 16, borderStyle: 'dashed', borderWidth: 1.5, borderColor: '#CBD5E1', alignItems: 'center' },
  addMissingText: { color: '#64748B', fontSize: 14, fontWeight: '600' },
  finalDesglose: { backgroundColor: '#F8FAFC', borderRadius: 24, padding: 20, marginTop: 10 },
  desgloseRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  desgloseLabel: { fontSize: 14, color: '#64748B' },
  desgloseVal: { fontSize: 14, fontWeight: '700', color: '#1E293B' },
  totalRowBorder: { borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingTop: 12, marginTop: 4 },
  totalFinalLabel: { fontSize: 18, fontWeight: '800', color: '#1E293B' },
  totalFinalVal: { fontSize: 22, fontWeight: '900', color: '#0f2f6f' },
  confirmBtn: { backgroundColor: '#0f2f6f', paddingVertical: 18, borderRadius: 20, alignItems: 'center', marginTop: 24 },
  confirmBtnDisabled: { opacity: 0.6 },
  confirmBtnText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
  // Success Flow
  successContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  successCircle: { marginBottom: 32 },
  successTitle: { fontSize: 26, fontWeight: '900', color: '#1E293B', textAlign: 'center' },
  successSub: { fontSize: 16, color: '#94A3B8', textAlign: 'center', marginTop: 12, lineHeight: 24 },
  // Adjust Modal
  adjustModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  adjustModalContent: { backgroundColor: '#FFF', width: '85%', borderRadius: 28, padding: 24, alignItems: 'center' },
  adjustHeader: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  adjustTtl: { fontSize: 18, fontWeight: '700', color: '#1E293B' },
  adjustImg: { width: 120, height: 120, borderRadius: 20, marginBottom: 16 },
  adjustName: { fontSize: 16, fontWeight: '700', color: '#334155', textAlign: 'center', marginBottom: 24 },
  adjustQtyRow: { flexDirection: 'row', alignItems: 'center', gap: 30, marginBottom: 32 },
  bigQtyBtn: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
  bigQtyVal: { fontSize: 28, fontWeight: '800', color: '#1E293B' },
  updateQtyBtn: { backgroundColor: '#0f2f6f', width: '100%', paddingVertical: 16, borderRadius: 16, alignItems: 'center' },
  updateQtyText: { color: '#FFF', fontSize: 15, fontWeight: '700' }
});