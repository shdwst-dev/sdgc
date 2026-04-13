import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, Alert, StatusBar, Platform } from 'react-native';
import { ChevronLeft, Package, MapPin, CreditCard, Calendar, Hash, CheckCircle2, HelpCircle } from 'lucide-react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { getDetallePedido, VentaDetalle } from '../../services/comprador';
import { getToken, hydrateToken } from '../../services/storage';
import { useToast } from '../../components/Toast';
import { LinearGradient } from 'expo-linear-gradient';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { getFacturaHtml, getReciboHtml } from '../../services/comprobantes';
import { FileText, Download } from 'lucide-react-native';

type DetallePedidoRouteProp = RouteProp<RootStackParamList, 'DetallePedido'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function DetallePedido() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<DetallePedidoRouteProp>();
  const { idVenta } = route.params;
  const { showToast } = useToast();

  const [pedido, setPedido] = useState<VentaDetalle | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState<string | null>(null);

  const loadDetalle = useCallback(async () => {
    let token = getToken() || await hydrateToken();
    if (!token) { navigation.navigate('RoleSelect'); return; }

    try {
      setIsLoading(true);
      const data = await getDetallePedido(token, idVenta);
      setPedido(data);
    } catch (error) {
      showToast({ message: 'Error al cargar pedido', type: 'error' });
      navigation.goBack();
    } finally {
      setIsLoading(false);
    }
  }, [idVenta, navigation, showToast]);

  useEffect(() => { loadDetalle(); }, [loadDetalle]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0f2f6f" />
        <Text style={styles.loadingText}>Preparando tu comprobante...</Text>
      </View>
    );
  }

  if (!pedido) return null;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Premium Header */}
      <LinearGradient colors={['#0f2f6f', '#1c3a5c']} style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <ChevronLeft size={24} color="#FFF" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Detalle de Pedido</Text>
          <Text style={styles.headerSub}>#{pedido.id_venta}</Text>
        </View>
        <TouchableOpacity style={styles.helpHeaderBtn} onPress={() => Alert.alert('Ayuda', 'Soporte 24/7 disponible.')}>
          <HelpCircle size={22} color="#FFF" />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>
        {/* Status Hero Card */}
        <View style={styles.statusHero}>
          <View style={styles.statusRing}>
             <CheckCircle2 size={44} color="#10B981" />
          </View>
          <Text style={styles.statusTtl}>Pedido {pedido.estatus}</Text>
          <Text style={styles.statusDate}>
            {new Date(pedido.fecha || '').toLocaleDateString('es-MX', { day: 'numeric', month: 'long' })}
          </Text>
        </View>

        {/* Info Grid */}
        <View style={styles.summaryGrid}>
          <View style={styles.summaryBox}>
            <Calendar size={18} color="#0f2f6f" />
            <Text style={styles.summaryLabel}>Fecha</Text>
            <Text style={styles.summaryVal}>{new Date(pedido.fecha || '').toLocaleDateString()}</Text>
          </View>
          <View style={styles.summaryBoxDivider} />
          <View style={styles.summaryBox}>
            <CreditCard size={18} color="#0f2f6f" />
            <Text style={styles.summaryLabel}>Pago</Text>
            <Text style={styles.summaryVal}>{pedido.metodo_pago}</Text>
          </View>
        </View>

        {/* Products List */}
        <View style={styles.section}>
          <View style={styles.sectionHead}>
             <Package size={20} color="#1E293B" />
             <Text style={styles.sectionTtl}>Productos ({pedido.productos.length})</Text>
          </View>
          {pedido.productos.map((item, idx) => (
            <View key={idx} style={styles.productRow}>
              <Image 
                source={{ uri: item.imagen_url || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=100' }} 
                style={styles.productImg} 
              />
              <View style={styles.productInfo}>
                <Text style={styles.productName} numberOfLines={1}>{item.nombre}</Text>
                <Text style={styles.productQty}>{item.cantidad} unidades</Text>
              </View>
              <Text style={styles.productPrice}>${item.subtotal.toLocaleString()}</Text>
            </View>
          ))}
        </View>

        {/* Totals Section */}
        <View style={styles.totalsCard}>
           <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal</Text>
              <Text style={styles.totalVal}>${pedido.total.toLocaleString()}</Text>
           </View>
           <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Envío</Text>
              <Text style={[styles.totalVal, { color: '#10B981' }]}>Gratis</Text>
           </View>
           <View style={styles.totalDivider} />
           <View style={styles.totalRow}>
              <Text style={styles.grandTotalLabel}>Total Pagado</Text>
              <Text style={styles.grandTotalVal}>${pedido.total.toLocaleString()}</Text>
           </View>
        </View>

        <TouchableOpacity 
          style={styles.supportAction}
          onPress={() => Alert.alert('Ticket', 'Abriendo ticket de soporte...')}
        >
          <Text style={styles.supportText}>¿Problemas con tu pedido?</Text>
        </TouchableOpacity>

        {/* Documentos Section */}
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <FileText size={20} color="#1E293B" />
            <Text style={styles.sectionTtl}>Documentos</Text>
          </View>
          
          <View style={styles.docActions}>
            <TouchableOpacity 
              style={[styles.docBtn, isGenerating && { opacity: 0.5 }]} 
              disabled={!!isGenerating}
              onPress={() => handleDownload('factura')}
            >
              <View style={styles.docBtnIcon}>
                <Download size={18} color="#0f2f6f" />
              </View>
              <View style={styles.docBtnInfo}>
                <Text style={styles.docBtnTtl}>Factura Oficial</Text>
                <Text style={styles.docBtnSub}>{isGenerating === 'factura' ? 'Generando...' : 'Descargar PDF'}</Text>
              </View>
            </TouchableOpacity>

          </View>
        </View>
      </ScrollView>
    </View>
  );

  async function handleDownload(type: 'factura' | 'recibo') {
    let token = getToken() || await hydrateToken();
    if (!token || !pedido) return;

    try {
      setIsGenerating(type);
      const html = type === 'factura' 
        ? await getFacturaHtml(token, pedido.id_venta)
        : await getReciboHtml(token, pedido.id_venta);

      if (!html || typeof html !== 'string' || html.length < 10) {
        throw new Error('El servidor devolvió un documento vacío o inválido.');
      }

      // printAsync abre directamente el dialogo del sistema (más estable)
      await Print.printAsync({ html });
      
    } catch (error: any) {
      console.error('Document Error:', error);
      Alert.alert('Error', `No se pudo generar el documento: ${error.message || 'Error desconocido'}`);
    } finally {
      setIsGenerating(null);
    }
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 16, color: '#64748B', fontSize: 15, fontWeight: '600' },
  header: {
    paddingTop: Platform.OS === 'ios' ? 70 : 50,
    paddingBottom: 24,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerInfo: { flex: 1, marginLeft: 16 },
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: '800' },
  headerSub: { color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: '600' },
  backButton: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  helpHeaderBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 20 },
  statusHero: { alignItems: 'center', marginVertical: 10, marginBottom: 30 },
  statusRing: { width: 88, height: 88, borderRadius: 30, backgroundColor: '#ECFDF5', justifyContent: 'center', alignItems: 'center', marginBottom: 16, elevation: 4, shadowColor: '#10B981', shadowOpacity: 0.1, shadowRadius: 10 },
  statusTtl: { fontSize: 22, fontWeight: '900', color: '#1E293B' },
  statusDate: { fontSize: 14, color: '#94A3B8', marginTop: 4, fontWeight: '600' },
  summaryGrid: { flexDirection: 'row', backgroundColor: '#FFF', borderRadius: 24, padding: 20, marginBottom: 24, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10 },
  summaryBox: { flex: 1, alignItems: 'center' },
  summaryBoxDivider: { width: 1, height: '80%', backgroundColor: '#F1F5F9' },
  summaryLabel: { fontSize: 12, color: '#94A3B8', marginTop: 8, fontWeight: '600', textTransform: 'uppercase' },
  summaryVal: { fontSize: 14, fontWeight: '700', color: '#1E293B', marginTop: 2 },
  section: { backgroundColor: '#FFF', borderRadius: 24, padding: 20, marginBottom: 20 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  sectionTtl: { fontSize: 16, fontWeight: '800', color: '#1E293B' },
  productRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  productImg: { width: 56, height: 56, borderRadius: 14, backgroundColor: '#F8FAFC' },
  productInfo: { flex: 1, marginLeft: 16 },
  productName: { fontSize: 15, fontWeight: '700', color: '#334155' },
  productQty: { fontSize: 13, color: '#94A3B8', marginTop: 2 },
  productPrice: { fontSize: 15, fontWeight: '800', color: '#0f2f6f' },
  totalsCard: { backgroundColor: '#FFF', borderRadius: 24, padding: 24, marginBottom: 20 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  totalLabel: { fontSize: 14, color: '#64748B', fontWeight: '500' },
  totalVal: { fontSize: 15, fontWeight: '700', color: '#1E293B' },
  totalDivider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 12 },
  grandTotalLabel: { fontSize: 18, fontWeight: '800', color: '#1E293B' },
  grandTotalVal: { fontSize: 24, fontWeight: '900', color: '#0f2f6f' },
  supportAction: { alignItems: 'center', padding: 10, marginBottom: 20 },
  supportText: { fontSize: 14, fontWeight: '700', color: '#64748B', textDecorationLine: 'underline' },
  docActions: { gap: 12 },
  docBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', padding: 16, borderRadius: 16, borderLeftWidth: 4, borderLeftColor: '#0f2f6f' },
  docBtnIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  docBtnInfo: { flex: 1 },
  docBtnTtl: { fontSize: 15, fontWeight: '700', color: '#1E293B' },
  docBtnSub: { fontSize: 13, color: '#64748B', fontWeight: '500' }
});
