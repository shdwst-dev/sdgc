import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Alert, Platform } from 'react-native';
import { Users, Store, Bell, Download, ChevronRight, LogOut, Info } from 'lucide-react-native';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { logout } from '../../services/auth';
import { getToken, setToken } from '../../services/storage';

const settingsOptions = [
  {
    icon: Users,
    title: 'Gestión de Usuarios',
    description: 'Administrar permisos y roles',
    color: '#DBEAFE', 
    iconColor: '#2563EB', 
  },
  {
    icon: Store,
    title: 'Configuración de Tienda',
    description: 'Información y preferencias',
    color: '#F3E8FF', 
    iconColor: '#9333EA', 
  },
  {
    icon: Bell,
    title: 'Notificaciones',
    description: 'Configurar alertas y avisos',
    color: '#FFEDD5', 
    iconColor: '#EA580C', 
  },
  {
    icon: Download,
    title: 'Exportar Datos',
    description: 'Descargar reportes y backups',
    color: '#DCFCE7', 
    iconColor: '#16A34A', 
  },
];

export default function Configuracion() {
  const navigation = useNavigation();

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
      const confirm = window.confirm("¿Estás seguro de que quieres salir?");
      if (confirm) {
        performLogout();
      }
    } else {
      Alert.alert(
        "Cerrar Sesión",
        "¿Estás seguro de que quieres salir?",
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
      <Text style={styles.headerTitle}>Configuración</Text>

      <View style={styles.profileCard}>
        <View style={styles.profileInfo}>
          <View style={styles.avatarContainer}>
            <Users size={32} color="#FFF" />
          </View>
          <View>
            <Text style={styles.profileName}>Administrador</Text>
            <Text style={styles.profileEmail}>admin@tienda.com</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.editBtn}>
          <Text style={styles.editBtnText}>Editar Perfil</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.optionsList}>
        {settingsOptions.map((option, index) => (
          <TouchableOpacity key={index} style={styles.optionItem}>
            <View style={[styles.iconBox, { backgroundColor: option.color }]}>
              <option.icon size={24} color={option.iconColor} />
            </View>
            <View style={styles.optionTextContainer}>
              <Text style={styles.optionTitle}>{option.title}</Text>
              <Text style={styles.optionDescription}>{option.description}</Text>
            </View>
            <ChevronRight size={20} color="#9CA3AF" />
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.infoCard}>
        <View style={styles.infoTitleRow}>
          <Info size={16} color="#101828" />
          <Text style={styles.infoSectionTitle}>Información de la App</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Versión</Text>
          <Text style={styles.infoValue}>1.0.0</Text>
        </View>
        <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
          <Text style={styles.infoLabel}>Última actualización</Text>
          <Text style={styles.infoValue}>22 Feb 2026</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <LogOut size={20} color="#FFF" />
        <Text style={styles.logoutBtnText}>Cerrar Sesión</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB', padding: 16 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#1C273F', marginBottom: 20, marginTop: 40 },
  profileCard: { backgroundColor: '#1C273F', borderRadius: 16, padding: 20, marginBottom: 24, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  profileInfo: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 16 },
  avatarContainer: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255, 255, 255, 0.2)', justifyContent: 'center', alignItems: 'center' },
  profileName: { fontSize: 18, fontWeight: 'bold', color: '#FFF' },
  profileEmail: { fontSize: 14, color: '#CBD5F5' },
  editBtn: { backgroundColor: 'rgba(255, 255, 255, 0.1)', paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  editBtnText: { color: '#FFF', fontSize: 14, fontWeight: '500' },
  optionsList: { gap: 12, marginBottom: 24 },
  optionItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  iconBox: { width: 48, height: 48, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  optionTextContainer: { flex: 1 },
  optionTitle: { fontSize: 15, fontWeight: '600', color: '#101828', marginBottom: 2 },
  optionDescription: { fontSize: 12, color: '#6B7280' },
  infoCard: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 24 },
  infoTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  infoSectionTitle: { fontSize: 15, fontWeight: '600', color: '#101828' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  infoLabel: { fontSize: 13, color: '#6B7280' },
  infoValue: { fontSize: 13, color: '#101828', fontWeight: '500' },
  logoutBtn: { backgroundColor: '#DC2626', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 16, borderRadius: 12, gap: 10, elevation: 2, shadowColor: '#DC2626', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 4 },
  logoutBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' }
});