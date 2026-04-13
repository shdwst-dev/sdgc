import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  FlatList,
} from 'react-native';
import { Package, ChevronLeft, Calendar, CreditCard } from 'lucide-react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { getMisPedidos, PedidoResumen } from '../../services/comprador';
import { getToken, hydrateToken, clearToken } from '../../services/storage';
import { ApiError } from '../../services/auth';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function MisPedidos() {
  const navigation = useNavigation<NavigationProp>();
  const [pedidos, setPedidos] = useState<PedidoResumen[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const formatFechaPedido = useCallback((fecha: string | null) => {
    if (!fecha) return 'Sin fecha';

    const date = new Date(fecha);
    if (Number.isNaN(date.getTime())) return 'Sin fecha';

    return date.toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }, []);

  const getStatusStyle = useCallback((estado: string) => {
    const normalized = estado.toLowerCase();

    if (normalized.includes('complet')) {
      return { backgroundColor: '#DCFCE7', color: '#166534' };
    }

    if (normalized.includes('proces')) {
      return { backgroundColor: '#FEF3C7', color: '#92400E' };
    }

    if (normalized.includes('cancel')) {
      return { backgroundColor: '#FEE2E2', color: '#991B1B' };
    }

    return { backgroundColor: '#E2E8F0', color: '#334155' };
  }, []);

  const goToLogin = useCallback(async () => {
    await clearToken();
    navigation.navigate('RoleSelect' as never);
  }, [navigation]);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const token = getToken() || await hydrateToken();
      if (!token) {
        await goToLogin();
        return;
      }

      const data = await getMisPedidos(token);
      setPedidos(data);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        await goToLogin();
        return;
      }

      setError(e instanceof Error ? e.message : 'Error al cargar el historial.');
    } finally {
      setIsLoading(false);
    }
  }, [goToLogin]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const renderItem = ({ item }: { item: PedidoResumen }) => (
    <TouchableOpacity 
      style={styles.card} 
      activeOpacity={0.7}
      onPress={() => navigation.navigate('DetallePedido', { idVenta: item.id })}
    >
      <View style={styles.cardHeader}>
        <View style={styles.idBadge}>
            <Text style={styles.idText}>#{item.id}</Text>
        </View>
          <View style={[styles.statusBadge, getStatusStyle(item.estado)]}>
            <Text style={[styles.statusText, { color: getStatusStyle(item.estado).color }]}>{item.estado}</Text>
          </View>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.infoRow}>
            <Calendar size={14} color="#64748B" />
            <Text style={styles.infoLabel}>Fecha:</Text>
            <Text style={styles.infoValue}>{formatFechaPedido(item.fecha)}</Text>
        </View>
        <View style={styles.infoRow}>
            <CreditCard size={14} color="#64748B" />
            <Text style={styles.infoLabel}>Pago:</Text>
            <Text style={styles.infoValue}>{item.metodo_pago}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Pagado</Text>
            <Text style={styles.totalValue}>${item.total.toLocaleString('es-MX')}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const EmptyState = () => (
    <View style={styles.center}>
      <Package size={64} color="#CBD5E1" />
      <Text style={styles.emptyTitle}>Sin pedidos aún</Text>
      <Text style={styles.emptySubtitle}>Cuando realices una compra aparecerá aquí.</Text>
      <TouchableOpacity style={styles.shopBtn} onPress={() => navigation.navigate('InicioTab' as never)}>
        <Text style={styles.shopBtnText}>Explorar Productos</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mis Pedidos</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#0f2f6f" />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadData}>
            <Text style={styles.retryBtnText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={pedidos}
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.list}
          ListEmptyComponent={EmptyState}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 16, 
    paddingTop: 50, 
    paddingBottom: 16, 
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1E293B' },
  list: { padding: 16, paddingBottom: 40 },
  card: { backgroundColor: '#FFF', borderRadius: 16, marginBottom: 16, padding: 16, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  idBadge: { backgroundColor: '#F1F5F9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  idText: { fontSize: 12, fontWeight: '700', color: '#475569' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  cardBody: { gap: 10 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoLabel: { fontSize: 13, color: '#64748B', width: 50 },
  infoValue: { fontSize: 13, fontWeight: '600', color: '#1E293B' },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 8 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontSize: 14, fontWeight: '600', color: '#64748B' },
  totalValue: { fontSize: 18, fontWeight: '800', color: '#0f2f6f' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#475569', marginTop: 16 },
  emptySubtitle: { fontSize: 14, color: '#94A3B8', textAlign: 'center', marginTop: 8, marginBottom: 24 },
  shopBtn: { backgroundColor: '#0f2f6f', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  shopBtnText: { color: '#FFF', fontWeight: '700' },
  errorText: { color: '#EF4444', marginBottom: 16, textAlign: 'center' },
  retryBtn: { padding: 10 },
  retryBtnText: { color: '#0f2f6f', fontWeight: '700' },
});
