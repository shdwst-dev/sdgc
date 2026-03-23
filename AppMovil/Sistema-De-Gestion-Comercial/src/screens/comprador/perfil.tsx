import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Switch, StatusBar, Platform } from 'react-native';
import { User, Package, MapPin, CreditCard, LogOut, ChevronRight } from 'lucide-react-native';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { logout } from '../../services/auth';
import { getToken, setToken } from '../../services/storage';

export default function Perfil() {
  const navigation = useNavigation();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const menuItems = [
    {
      icon: Package,
      label: 'Mis Pedidos',
      subtitle: 'Ver historial de compras',
      onClick: () => Alert.alert('Aviso', 'Función en desarrollo'),
    },
    {
      icon: MapPin,
      label: 'Direcciones',
      subtitle: 'Gestionar direcciones de envío',
      onClick: () => Alert.alert('Aviso', 'Función en desarrollo'),
    },
    {
      icon: CreditCard,
      label: 'Métodos de Pago',
      subtitle: 'Gestionar tarjetas guardadas',
      onClick: () => Alert.alert('Aviso', 'Función en desarrollo'),
    },
  ];

  const performLogout = () => {
    // 1. Intentar notificar al servidor (fire and forget)
    const token = getToken();
    if (token) {
      logout(token).catch(err => console.error("Error cierre sesión remoto:", err));
    }
    
    // 2. Limpiar localmente
    setToken(null);
    
    // 3. Navegar inmediatamente
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'InicioSesion' }],
      })
    );
  };

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      const confirm = window.confirm("¿Estás seguro de que deseas cerrar sesión?");
      if (confirm) {
        performLogout();
      }
    } else {
      Alert.alert(
        "Cerrar Sesión",
        "¿Estás seguro de que deseas cerrar sesión?",
        [
          { text: "Cancelar", style: "cancel" },
          { 
            text: "Salir", 
            style: "destructive", 
            onPress: performLogout
          }
        ]
      );
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <User size={40} color="#FFF" />
        </View>
        <View>
          <Text style={styles.userName}>Usuario Comprador</Text>
          <Text style={styles.userEmail}>comprador@prueba.com</Text>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Mi Cuenta</Text>
          </View>
          <View style={styles.menuList}>
            {menuItems.map((item, index) => (
              <TouchableOpacity 
                key={index} 
                style={[styles.menuItem, index === menuItems.length - 1 && { borderBottomWidth: 0 }]}
                onPress={item.onClick}
              >
                <View style={styles.iconCircle}>
                  <item.icon size={20} color="#1C273F" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.menuLabel}>{item.label}</Text>
                  <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
                </View>
                <ChevronRight size={20} color="#9CA3AF" />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Preferencias</Text>
          </View>
          <View style={styles.preferenceRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuLabel}>Notificaciones</Text>
              <Text style={styles.menuSubtitle}>Recibir ofertas y promociones</Text>
            </View>
            <Switch
              trackColor={{ false: "#D1D5DB", true: "#1C273F" }}
              thumbColor="#FFF"
              onValueChange={setNotificationsEnabled}
              value={notificationsEnabled}
            />
          </View>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <View style={styles.logoutIconBox}>
            <LogOut size={20} color="#DC2626" />
          </View>
          <Text style={styles.logoutText}>Cerrar Sesión</Text>
          <ChevronRight size={20} color="#FECACA" />
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Tienda Departamental</Text>
          <Text style={styles.footerText}>Versión 1.0.0</Text>
        </View>
      </View>
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { 
    backgroundColor: '#FFF', 
    padding: 24, 
    paddingTop: 60, 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB'
  },
  avatarContainer: { 
    width: 80, 
    height: 80, 
    borderRadius: 40, 
    backgroundColor: '#1C273F', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  userName: { fontSize: 20, fontWeight: 'bold', color: '#101828' },
  userEmail: { fontSize: 14, color: '#6B7280' },
  content: { padding: 16, gap: 16 },
  sectionCard: { 
    backgroundColor: '#FFF', 
    borderRadius: 12, 
    borderWidth: 1, 
    borderColor: '#E5E7EB', 
    overflow: 'hidden' 
  },
  sectionHeader: { 
    backgroundColor: '#F9FAFB', 
    paddingHorizontal: 16, 
    paddingVertical: 12, 
    borderBottomWidth: 1, 
    borderBottomColor: '#E5E7EB' 
  },
  sectionTitle: { fontSize: 14, fontWeight: 'bold', color: '#101828' },
  menuList: { },
  menuItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 16, 
    gap: 16, 
    borderBottomWidth: 1, 
    borderBottomColor: '#F3F4F6' 
  },
  iconCircle: { 
    width: 40, 
    height: 40, 
    borderRadius: 8, 
    backgroundColor: 'rgba(28, 39, 63, 0.1)', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  menuLabel: { fontSize: 15, fontWeight: '600', color: '#101828' },
  menuSubtitle: { fontSize: 12, color: '#6B7280' },
  preferenceRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 16 
  },
  logoutBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#FFF', 
    padding: 16, 
    borderRadius: 12, 
    borderWidth: 1, 
    borderColor: '#E5E7EB', 
    gap: 16 
  },
  logoutIconBox: { 
    width: 40, 
    height: 40, 
    borderRadius: 8, 
    backgroundColor: '#FEE2E2', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  logoutText: { flex: 1, fontSize: 15, fontWeight: '600', color: '#DC2626' },
  footer: { marginTop: 8, alignItems: 'center' },
  footerText: { fontSize: 12, color: '#9CA3AF' }
});