import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Dimensions, Alert } from 'react-native';
import { Minus, Plus, Trash2, ShoppingBag } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');

const initialCart = [
  { 
    id: 1, 
    name: 'Vestido Elegante de Verano', 
    price: 1299, 
    quantity: 1,
    image: 'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=500' 
  },
  { 
    id: 2, 
    name: 'Audífonos Inalámbricos Premium', 
    price: 2499, 
    quantity: 2,
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500' 
  }
];

export default function Carrito() {
  const navigation = useNavigation();
  const [cart, setCart] = useState(initialCart);

  const updateQuantity = (id: number, newQty: number) => {
    if (newQty < 1) return;
    setCart(cart.map(item => item.id === id ? { ...item, quantity: newQty } : item));
  };

  const removeFromCart = (id: number) => {
    Alert.alert("Eliminar", "¿Quitar este producto del carrito?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Quitar", style: "destructive", onPress: () => setCart(cart.filter(item => item.id !== id)) }
    ]);
  };

  const getCartTotal = () => cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

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
                <Image source={{ uri: item.image }} style={styles.productImage} />
                <View style={styles.productDetails}>
                  <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
                  <Text style={styles.productPrice}>${item.price.toLocaleString('es-MX')}</Text>
                  
                  <View style={styles.controlsRow}>
                    <View style={styles.quantitySelector}>
                      <TouchableOpacity 
                        onPress={() => updateQuantity(item.id, item.quantity - 1)}
                        style={styles.qtyBtn}
                      >
                        <Minus size={16} color="#101828" />
                      </TouchableOpacity>
                      <Text style={styles.qtyText}>{item.quantity}</Text>
                      <TouchableOpacity 
                        onPress={() => updateQuantity(item.id, item.quantity + 1)}
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
          style={styles.checkoutBtn}
          onPress={() => Alert.alert("Compra", "Procesando el pago...")}
        >
          <Text style={styles.checkoutBtnText}>Proceder al Pago</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: '#F9FAFB' },
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
  summaryFooter: { backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#E5E7EB', padding: 16, paddingBottom: 24 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  summaryLabel: { fontSize: 14, color: '#6B7280' },
  summaryValue: { fontSize: 14, fontWeight: '600', color: '#101828' },
  totalBorder: { borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 12, marginTop: 4 },
  totalLabel: { fontSize: 16, fontWeight: 'bold', color: '#101828' },
  totalValue: { fontSize: 20, fontWeight: 'bold', color: '#1C273F' },
  checkoutBtn: { backgroundColor: '#1C273F', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 16 },
  checkoutBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', color: '#101828', marginTop: 20 },
  emptySubtitle: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginTop: 8, marginBottom: 24 },
  primaryBtn: { backgroundColor: '#1C273F', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12 },
  primaryBtnText: { color: '#FFF', fontSize: 16, fontWeight: '600' }
});