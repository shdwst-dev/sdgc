import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert, ActivityIndicator } from 'react-native';
import { Minus, Plus, Trash2, ShoppingBag } from 'lucide-react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { getCarritoLocal, saveCarritoLocal, CartItem, checkout } from '../../services/comprador';
import { ApiError } from '../../services/auth';
import { getToken, hydrateToken, clearToken } from '../../services/storage';

export default function Carrito() {
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

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
  primaryBtnText: { color: '#FFF', fontSize: 16, fontWeight: '600' }
});