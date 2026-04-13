import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, Alert } from 'react-native';
import { ChevronLeft, Package, MapPin, CreditCard, Calendar, Hash, CheckCircle2 } from 'lucide-react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { getDetallePedido, VentaDetalle } from '../../services/comprador';
import { getToken, hydrateToken } from '../../services/storage';
import { useToast } from '../../components/Toast';
import { LinearGradient } from 'expo-linear-gradient';

type DetallePedidoRouteProp = RouteProp<RootStackParamList, 'DetallePedido'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function DetallePedido() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<DetallePedidoRouteProp>();
  const { idVenta } = route.params;
  const { showToast } = useToast();

  const [pedido, setPedido] = useState<VentaDetalle | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadDetalle = useCallback(async () => {
    let token = getToken();
    if (!token) token = await hydrateToken();
    if (!token) {
      navigation.navigate('RoleSelect');
      return;
    }

    try {
      setIsLoading(true);
      const data = await getDetallePedido(token, idVenta);
      setPedido(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al cargar el detalle.';
      showToast({ message, type: 'error' });
      navigation.goBack();
    } finally {
      setIsLoading(false);
    }
  }, [idVenta, navigation]);

  useEffect(() => {
    loadDetalle();
  }, [loadDetalle]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1C273F" />
        <Text style={styles.loadingText}>Obteniendo tu comprobante...</Text>
      </View>
    );
  }

  if (!pedido) return null;

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#1C273F', '#2D3748']} style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <ChevronLeft size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detalle del Pedido</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Status Card */}
        <View style={styles.statusCard}>
          <View style={styles.statusIconContainer}>
            <CheckCircle2 size={40} color="#10B981" />
          </View>
          <Text style={styles.statusLabel}>Estado del Pedido</Text>
          <Text style={styles.statusValue}>{pedido.estatus}</Text>
          <View style={styles.divider} />
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Calendar size={16} color="#64748B" />
              <Text style={styles.summaryText}>{new Date(pedido.fecha || '').toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Hash size={16} color="#64748B" />
              <Text style={styles.summaryText}>#{pedido.id_venta}</Text>
            </View>
          </View>
        </View>

        {/* Items List */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Package size={20} color="#1C273F" />
            <Text style={styles.sectionTitle}>Productos</Text>
          </View>
          {pedido.productos.map((item, index) => (
            <View key={index} style={styles.productItem}>
              <Image 
                source={{ uri: item.imagen_url || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=100' }} 
                style={styles.productImage} 
              />
              <View style={styles.productInfo}>
                <Text style={styles.productName} numberOfLines={1}>{item.nombre}</Text>
                <Text style={styles.productQty}>{item.cantidad} x ${item.precio_unitario.toLocaleString('es-MX')}</Text>
              </View>
              <Text style={styles.productSubtotal}>${item.subtotal.toLocaleString('es-MX')}</Text>
            </View>
          ))}
        </View>

        {/* Payment Info */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <CreditCard size={20} color="#1C273F" />
            <Text style={styles.sectionTitle}>Pago</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Método de Pago</Text>
            <Text style={styles.infoValue}>{pedido.metodo_pago}</Text>
          </View>
          <View style={[styles.infoRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total Pagado</Text>
            <Text style={styles.totalValue}>${pedido.total.toLocaleString('es-MX')}</Text>
          </View>
        </View>

        <TouchableOpacity 
          style={styles.helpButton}
          onPress={() => Alert.alert('Ayuda', 'Contactando con soporte...')}
        >
          <Text style={styles.helpButtonText}>¿Necesitas ayuda con este pedido?</Text>
        </TouchableOpacity>
        
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: '#64748B', fontSize: 16 },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: { color: '#FFF', fontSize: 20, fontWeight: '700' },
  backButton: { width: 40, height: 40, justifyContent: 'center' },
  content: { flex: 1, padding: 20 },
  statusCard: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  statusIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F0FDF4',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusLabel: { color: '#64748B', fontSize: 14, marginBottom: 4 },
  statusValue: { color: '#10B981', fontSize: 28, fontWeight: '800', marginBottom: 20 },
  divider: { width: '100%', height: 1, backgroundColor: '#F1F5F9', marginBottom: 16 },
  summaryRow: { flexDirection: 'row', gap: 24 },
  summaryItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  summaryText: { color: '#64748B', fontSize: 14, fontWeight: '500' },
  section: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  sectionTitle: { color: '#1C273F', fontSize: 18, fontWeight: '700' },
  productItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  productImage: { width: 50, height: 50, borderRadius: 10, backgroundColor: '#F1F5F9' },
  productInfo: { flex: 1, marginLeft: 12 },
  productName: { color: '#1C273F', fontSize: 15, fontWeight: '600' },
  productQty: { color: '#64748B', fontSize: 13, marginTop: 2 },
  productSubtotal: { color: '#1C273F', fontSize: 16, fontWeight: '700' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  infoLabel: { color: '#64748B', fontSize: 15 },
  infoValue: { color: '#1C273F', fontSize: 15, fontWeight: '600' },
  totalRow: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  totalLabel: { color: '#1C273F', fontSize: 18, fontWeight: '800' },
  totalValue: { color: '#1C273F', fontSize: 24, fontWeight: '900' },
  helpButton: {
    alignItems: 'center',
    padding: 16,
  },
  helpButtonText: { color: '#1C273F', fontSize: 14, fontWeight: '600', textDecorationLine: 'underline' },
});
