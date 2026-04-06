import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Dimensions, Alert, ActivityIndicator } from 'react-native';
import { Minus, Plus, Trash2, ShoppingBag, CreditCard } from 'lucide-react-native';
import { useNavigation, useIsFocused, CommonActions } from '@react-navigation/native';
import { getCarritoLocal, saveCarritoLocal, CartItem, checkout, getMetodosPago, MetodoPago } from '../../services/comprador';
import { ApiError } from '../../services/apiClient';
import { getToken, hydrateToken, clearToken } from '../../services/storage';

const { width } = Dimensions.get('window');

export default function Carrito() {
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [metodosPago, setMetodosPago] = useState<MetodoPago[]>([]);
  const [selectedMetodo, setSelectedMetodo] = useState<number>(1); // Default: Efectivo

  const goToLogin = useCallback(() => {
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'InicioSesion' as never }],
      }),
    );
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

      // Cargar métodos de pago
      const token = getToken() || await hydrateToken();
      if (token) {
        const metodos = await getMetodosPago(token);
        setMetodosPago(metodos);
        if (metodos.length > 0 && !metodos.find(m => m.id_metodo_pago === selectedMetodo)) {
          setSelectedMetodo(metodos[0].id_metodo_pago);
        }
      }
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
      await checkout(token, cart, selectedMetodo);

      // El carrito se limpia automáticamente en checkout()
      setCart([]);

      Alert.alert('¡Compra exitosa!', 'Tu compra ha sido procesada correctamente.', [
        {
          text: 'OK',
          onPress: () => navigation.navigate('InicioTab' as never)
        }
      ]);
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 401) {
          await clearToken();
          Alert.alert('Sesión expirada', 'Inicia sesión nuevamente.');
          goToLogin();
          return;
        }
      }
      Alert.alert('Error', error instanceof Error ? error.message : 'Error al procesar la compra');
    } finally {
      setIsCheckingOut(false);
    }
  }, [cart, selectedMetodo, goToLogin, navigation]);

  // ─── Loading ─────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#1C273F" />
      </View>
    );
  }

  // ─── Empty cart ──────────────────────────────────────────────────────────

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

  // ─── Cart ────────────────────────────────────────────────────────────────

  return (
    <View style={styles.mainContainer}>
      <ScrollView style={styles.scrollContainer} contentContainerStyle={{ paddingBottom: 100 }}>
        <Text style={styles.headerTitle}>Mi Carrito ({cart.length})</Text>

        <View style={styles.itemsList}>
          {cart.map((item) => (
            <View key={item.id} style={styles.cartCard}>
              <View style={styles.productRow}>
                {item.imagen_url ? (
                  <Image source={{ uri: item.imagen_url }} style={styles.productImage} />
                ) : (
                  <View style={[styles.productImage, { backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' }]}>
                    <ShoppingBag size={32} color="#D1D5DB" />
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
            </View>
          ))}
        </View>

        {/* Método de pago */}
        <View style={styles.paymentSection}>
          <View style={styles.paymentHeader}>
            <CreditCard size={18} color="#101828" />
            <Text style={styles.paymentTitle}>Método de Pago</Text>
          </View>
          <View style={styles.paymentOptions}>
            {metodosPago.map((metodo) => (
              <TouchableOpacity
                key={metodo.id_metodo_pago}
                style={[
                  styles.paymentOption,
                  selectedMetodo === metodo.id_metodo_pago && styles.paymentOptionSelected,
                ]}
                onPress={() => setSelectedMetodo(metodo.id_metodo_pago)}
              >
                <View style={[
                  styles.radioOuter,
                  selectedMetodo === metodo.id_metodo_pago && styles.radioOuterSelected,
                ]}>
                  {selectedMetodo === metodo.id_metodo_pago && <View style={styles.radioInner} />}
                </View>
                <Text style={[
                  styles.paymentOptionText,
                  selectedMetodo === metodo.id_metodo_pago && styles.paymentOptionTextSelected,
                ]}>
                  {metodo.nombre}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      <View style={styles.summaryFooter}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Subtotal</Text>
          <Text style={styles.summaryValue}>${getCartTotal().toLocaleString('es-MX')}</Text>
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
            <Text style={styles.checkoutBtnText}>Confirmar Compra</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: '#F9FAFB' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9FAFB' },
  scrollContainer: { flex: 1, padding: 16 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#101828', marginBottom: 20, marginTop: 40 },
  itemsList: { gap: 16 },
  cartCard: { backgroundColor: '#FFF', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#E5E7EB', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 },
  productRow: { flexDirection: 'row', gap: 12 },
  productImage: { width: 80, height: 80, borderRadius: 8, backgroundColor: '#F3F4F6' },
  productDetails: { flex: 1 },
  productName: { fontSize: 14, fontWeight: '500', color: '#101828', marginBottom: 4 },
  productPrice: { fontSize: 16, fontWeight: 'bold', color: '#1C273F', marginBottom: 12 },
  controlsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  quantitySelector: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, overflow: 'hidden' },
  qtyBtn: { padding: 8, backgroundColor: '#F9FAFB' },
  qtyText: { paddingHorizontal: 12, fontSize: 14, fontWeight: '600', color: '#101828' },
  // Payment section
  paymentSection: { marginTop: 24, backgroundColor: '#FFF', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#E5E7EB' },
  paymentHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  paymentTitle: { fontSize: 15, fontWeight: '600', color: '#101828' },
  paymentOptions: { gap: 8 },
  paymentOption: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB', gap: 10 },
  paymentOptionSelected: { borderColor: '#1C273F', backgroundColor: '#F8FAFC' },
  paymentOptionText: { fontSize: 14, color: '#6B7280' },
  paymentOptionTextSelected: { color: '#1C273F', fontWeight: '600' },
  radioOuter: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#D1D5DB', justifyContent: 'center', alignItems: 'center' },
  radioOuterSelected: { borderColor: '#1C273F' },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#1C273F' },
  // Footer
  summaryFooter: { backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#E5E7EB', padding: 16, paddingBottom: 24 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  summaryLabel: { fontSize: 14, color: '#6B7280' },
  summaryValue: { fontSize: 14, fontWeight: '600', color: '#101828' },
  totalBorder: { borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 12, marginTop: 4 },
  totalLabel: { fontSize: 16, fontWeight: 'bold', color: '#101828' },
  totalValue: { fontSize: 20, fontWeight: 'bold', color: '#1C273F' },
  checkoutBtn: { backgroundColor: '#1C273F', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 16 },
  checkoutBtnDisabled: { backgroundColor: '#9CA3AF' },
  checkoutBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', color: '#101828', marginTop: 20 },
  emptySubtitle: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginTop: 8, marginBottom: 24 },
  primaryBtn: { backgroundColor: '#1C273F', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12 },
  primaryBtnText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
});