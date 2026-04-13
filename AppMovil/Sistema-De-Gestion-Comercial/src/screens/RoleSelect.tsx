import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ShoppingCart, Shield } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { getMe } from '../services/auth';
import { clearHash, clearToken, hydrateToken } from '../services/storage';

const logo = require('../../assets/logosdgc.jpeg');
type NavProp = NativeStackNavigationProp<RootStackParamList, 'RoleSelect'>;

export default function RoleSelect() {
  const navigation = useNavigation<NavProp>();
  const [isRestoring, setIsRestoring] = useState(true);

  const normalizeRole = (role: string) =>
    role
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const token = await hydrateToken();
        if (!token) return;

        const me = await getMe(token);
        const roleValue = typeof me.rol === 'string' ? me.rol : (me.rol?.nombre ?? '');
        const role = normalizeRole(roleValue);

        if (role.includes('admin')) {
          navigation.reset({ index: 0, routes: [{ name: 'dashboard-ad' }] });
          return;
        }

        if (role.includes('comprador')) {
          navigation.reset({ index: 0, routes: [{ name: 'dashboard-cm' }] });
          return;
        }

        await clearHash();
        await clearToken();
      } catch {
        await clearHash();
        await clearToken();
      } finally {
        setIsRestoring(false);
      }
    };

    restoreSession().catch(async () => {
      await clearHash();
      await clearToken();
      setIsRestoring(false);
    });
  }, [navigation]);

  if (isRestoring) {
    return (
      <SafeAreaView style={[styles.safe, styles.centered]}>
        <Image source={logo} style={styles.loadingLogo} />
        <ActivityIndicator size="large" color="#0f2f6f" style={{ marginTop: 20 }} />
        <Text style={styles.loadingText}>Cargando...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Image source={logo} style={styles.logo} />
          <Text style={styles.title}>SDGC</Text>
          <Text style={styles.subtitle}>Sistema de Gestión Comercial</Text>
        </View>

        <Text style={styles.question}>¿Cómo deseas ingresar?</Text>

        <View style={styles.cardsContainer}>
          <TouchableOpacity
            style={styles.cardComprador}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('LoginComprador')}
          >
            <View style={styles.cardIconWrap}>
              <ShoppingCart size={36} color="#3B82F6" />
            </View>
            <Text style={styles.cardTitle}>Comprador</Text>
            <Text style={styles.cardDesc}>Explora productos y realiza tus compras</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cardAdmin}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('LoginAdmin')}
          >
            <View style={styles.cardIconWrapDark}>
              <Shield size={36} color="#E2E8F0" />
            </View>
            <Text style={styles.cardTitleDark}>Administrador</Text>
            <Text style={styles.cardDescDark}>Gestiona inventario, ventas y empleados</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>Versión 1.0.0</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' },
  centered: { justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, paddingHorizontal: 24, justifyContent: 'center' },

  header: { alignItems: 'center', marginBottom: 32 },
  logo: { width: 80, height: 80, resizeMode: 'contain', marginBottom: 12 },
  loadingLogo: { width: 100, height: 100, resizeMode: 'contain' },
  loadingText: { color: '#6B7280', marginTop: 12, fontSize: 14 },
  title: { fontSize: 36, fontWeight: 'bold', color: '#0f2f6f', letterSpacing: 2 },
  subtitle: { fontSize: 14, color: '#64748B', marginTop: 4 },

  question: { fontSize: 20, fontWeight: '600', color: '#1E293B', textAlign: 'center', marginBottom: 24 },

  cardsContainer: { gap: 16 },

  cardComprador: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    borderWidth: 2,
    borderColor: '#DBEAFE',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  cardIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: { fontSize: 20, fontWeight: 'bold', color: '#1E40AF', marginBottom: 6 },
  cardDesc: { fontSize: 13, color: '#64748B', textAlign: 'center' },

  cardAdmin: {
    backgroundColor: '#1C273F',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  cardIconWrapDark: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitleDark: { fontSize: 20, fontWeight: 'bold', color: '#F1F5F9', marginBottom: 6 },
  cardDescDark: { fontSize: 13, color: '#94A3B8', textAlign: 'center' },

  footer: { textAlign: 'center', color: '#94A3B8', fontSize: 12, marginTop: 32 },
});
