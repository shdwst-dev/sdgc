import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Switch, StatusBar, Platform, ActivityIndicator, Modal, TextInput, FlatList } from 'react-native';
import { User, Package, MapPin, CreditCard, LogOut, ChevronRight, X, Edit2, Trash2, Bell, Shield, Heart, HelpCircle } from 'lucide-react-native';
import { useNavigation, CommonActions, useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { ApiError, getMe, logout, MeResponse } from '../../services/auth';
import { clearToken, getToken, hydrateToken } from '../../services/storage';
import { 
  getDireccionesLocal,
  getDireccionesCloud, 
  saveDireccionCloud, 
  deleteDireccionCloud, 
  getMetodosPagoLocal, 
  getFavoritePaymentMethodLocal, 
  setFavoritePaymentMethodLocal, 
  synchronizeDirecciones,
  Direccion, 
  MetodoPago 
} from '../../services/comprador';
import { useToast } from '../../components/Toast';

export default function Perfil() {
  const navigation = useNavigation();
  const { showToast } = useToast();
  
  // States
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [profileData, setProfileData] = useState<MeResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [direcciones, setDirecciones] = useState<Direccion[]>([]);
  const [metodoPagos, setMetodoPagos] = useState<MetodoPago[]>([]);
  const [metodoPagoFavorito, setMetodoPagoFavorito] = useState<number | null>(null);
  
  // Modal States
  const [showDireccionModal, setShowDireccionModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [editingDireccion, setEditingDireccion] = useState<Direccion | null>(null);
  
  // Forms
  const [formData, setFormData] = useState({
    calle: '',
    numero_exterior: '',
    numero_interior: '',
    colonia: '',
    ciudad: '',
    estado: '',
    codigoPostal: '',
  });

  const goToLogin = useCallback(() => {
    navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'RoleSelect' as never }] }));
  }, [navigation]);

  const loadProfile = useCallback(async () => {
    let token = getToken() || await hydrateToken();
    if (!token) { await clearToken(); goToLogin(); return; }

    try {
      setIsLoading(true);
      const userData = await getMe(token);
      setProfileData(userData);
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 401) {
        await clearToken();
        goToLogin();
        return;
      }
      showToast({ message: 'Error al cargar perfil', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  }, [goToLogin, showToast]);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  useFocusEffect(
    useCallback(() => {
      const loadExtras = async () => {
        let token = getToken() || await hydrateToken();
        if (token) {
          try {
            await synchronizeDirecciones(token);
          } catch (e) { /* silent sync fail */ }
        }

        const [dirs, methods, fav] = await Promise.all([
          token ? getDireccionesCloud(token) : getDireccionesLocal(),
          getMetodosPagoLocal(),
          getFavoritePaymentMethodLocal()
        ]);
        setDirecciones(dirs);
        setMetodoPagos(methods);
        setMetodoPagoFavorito(fav);
      };
      loadExtras();
    }, [])
  );

  const handleSaveDireccion = async () => {
    if (!formData.calle || !formData.numero_exterior || !formData.colonia || !formData.ciudad || !formData.estado || !formData.codigoPostal) {
      showToast({ message: 'Completa los campos obligatorios', type: 'error' });
      return;
    }

    try {
      let token = getToken() || await hydrateToken();
      if (!token) throw new Error('Sesión expirada');

      const updated = await saveDireccionCloud(token, {
        id: editingDireccion?.id || 0,
        calle: formData.calle,
        numero_exterior: formData.numero_exterior,
        numero_interior: formData.numero_interior || undefined,
        colonia: formData.colonia,
        ciudad: formData.ciudad,
        estado: formData.estado,
        codigoPostal: formData.codigoPostal,
      } as Direccion);

      setDirecciones(updated);
      setShowDireccionModal(false);
      setEditingDireccion(null);
      setFormData({ calle: '', numero_exterior: '', numero_interior: '', colonia: '', ciudad: '', estado: '', codigoPostal: '' });
      showToast({ message: 'Dirección sincronizada', type: 'success' });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Error al guardar';
      // Como estamos dentro de un Modal, el Toast no se ve. Usamos Alert.
      Alert.alert('Error', msg);
    }
  };

  const handleLogout = () => {
    Alert.alert("Cerrar Sesión", "¿Estás seguro?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Salir", style: "destructive", onPress: async () => {
        await clearToken();
        goToLogin();
      }}
    ]);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0f2f6f" />
      </View>
    );
  }

  const userFullName = `${profileData?.persona?.nombre || ''} ${profileData?.persona?.apellido_paterno || ''}`.trim() || 'Usuario';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        
        {/* Premium Profile Header */}
        <LinearGradient
          colors={['#0f2f6f', '#1c3a5c', '#2c5282']}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <View style={styles.avatarWrapper}>
              <View style={styles.avatar}>
                <User size={40} color="#0f2f6f" />
              </View>
            </View>
            <Text style={styles.userName}>{userFullName}</Text>
            <Text style={styles.userEmail}>{profileData?.email}</Text>
          </View>
        </LinearGradient>

        <View style={styles.content}>
          {/* Main Account Settings */}
          <Text style={styles.sectionTtl}>Mi Cuenta</Text>
          <View style={styles.menuGroup}>
            {[
              { icon: Package, label: 'Mis Pedidos', sub: 'Historial de compras', on: () => navigation.navigate('MisPedidos' as never) },
              { icon: MapPin, label: 'Direcciones', sub: `${direcciones.length} guardadas`, on: () => setShowDireccionModal(true) },
              { icon: CreditCard, label: 'Método de Pago', sub: metodoPagos.find(m => m.id === metodoPagoFavorito)?.nombre || 'Seleccionar', on: () => setShowPaymentModal(true) },
            ].map((item, idx) => (
              <TouchableOpacity key={idx} style={styles.menuItem} onPress={item.on}>
                <View style={styles.iconCircle}>
                  <item.icon size={20} color="#0f2f6f" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.menuLabel}>{item.label}</Text>
                  <Text style={styles.menuSub}>{item.sub}</Text>
                </View>
                <ChevronRight size={18} color="#CBD5E1" />
              </TouchableOpacity>
            ))}
          </View>

          {/* Preferences */}
          <Text style={styles.sectionTtl}>Preferencias</Text>
          <View style={styles.menuGroup}>
            <View style={styles.prefRow}>
              <View style={styles.iconCircle}>
                <Bell size={20} color="#0f2f6f" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.menuLabel}>Notificaciones</Text>
                <Text style={styles.menuSub}>Alertas de ofertas</Text>
              </View>
              <Switch 
                value={notificationsEnabled} 
                onValueChange={setNotificationsEnabled}
                trackColor={{ false: '#E2E8F0', true: '#0f2f6f' }}
                thumbColor="#FFF"
              />
            </View>
            <TouchableOpacity style={styles.menuItem}>
              <View style={styles.iconCircle}>
                <Shield size={20} color="#0f2f6f" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.menuLabel}>Privacidad</Text>
                <Text style={styles.menuSub}>Datos y seguridad</Text>
              </View>
              <ChevronRight size={18} color="#CBD5E1" />
            </TouchableOpacity>
          </View>

          {/* Actions */}
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <LinearGradient
              colors={['#FEF2F2', '#FEE2E2']}
              style={styles.logoutGradient}
            >
              <LogOut size={20} color="#DC2626" />
              <Text style={styles.logoutText}>Cerrar Sesión</Text>
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerVer}>Versión 2.0.0 - Premium Edition</Text>
            <Text style={styles.footerBrand}>Powered by Antigravity Design System</Text>
          </View>
        </View>
      </ScrollView>

      {/* ADRESS MODAL REFACTOR */}
      <Modal visible={showDireccionModal} animationType="slide">
        <View style={styles.modalFull}>
          <LinearGradient colors={['#0f2f6f', '#1c3a5c']} style={styles.modalHeader}>
            <Text style={styles.modalTtl}>Direcciones</Text>
            <TouchableOpacity onPress={() => { setShowDireccionModal(false); setEditingDireccion(null); }}>
              <X size={24} color="#FFF" />
            </TouchableOpacity>
          </LinearGradient>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {direcciones.length > 0 && !editingDireccion && (
              <View style={styles.listSection}>
                <Text style={styles.listSectionTtl}>Guardadas</Text>
                {direcciones.map(dir => (
                  <View key={dir.id} style={styles.dirCard}>
                    <View style={styles.dirIcon}>
                      <MapPin size={20} color="#0f2f6f" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.dirName}>{dir.calle} {dir.numero_exterior}</Text>
                      <Text style={styles.dirSub}>{dir.colonia}, {dir.ciudad}</Text>
                    </View>
                    <View style={styles.dirActions}>
                      <TouchableOpacity onPress={() => { setEditingDireccion(dir); setFormData({ ...dir, numero_exterior: dir.numero_exterior.toString(), numero_interior: dir.numero_interior?.toString() || '', codigoPostal: dir.codigoPostal || '' } as any); }}>
                        <Edit2 size={18} color="#64748B" />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={async () => { 
                        try {
                          let token = getToken() || await hydrateToken();
                          if (token) {
                            const updated = await deleteDireccionCloud(token, dir.id);
                            setDirecciones(updated);
                            showToast({ message: 'Dirección eliminada', type: 'success' });
                          }
                        } catch (error) {
                          Alert.alert('Error', 'No se pudo eliminar la dirección de la nube.');
                        }
                      }}>
                        <Trash2 size={18} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.formContainer}>
              <Text style={styles.listSectionTtl}>{editingDireccion ? 'Editar Dirección' : 'Nueva Dirección'}</Text>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Calle *</Text>
                <TextInput 
                  style={styles.input} 
                  value={formData.calle} 
                  onChangeText={t => setFormData({...formData, calle: t})}
                />
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Num Ext *</Text>
                  <TextInput 
                    style={styles.input} 
                    keyboardType="numeric"
                    value={formData.numero_exterior} 
                    onChangeText={t => setFormData({...formData, numero_exterior: t})}
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>CP *</Text>
                  <TextInput 
                    style={styles.input} 
                    keyboardType="numeric"
                    value={formData.codigoPostal} 
                    onChangeText={t => setFormData({...formData, codigoPostal: t})}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Colonia *</Text>
                <TextInput 
                  style={styles.input} 
                  value={formData.colonia} 
                  onChangeText={t => setFormData({...formData, colonia: t})}
                />
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Ciudad *</Text>
                  <TextInput 
                    style={styles.input} 
                    value={formData.ciudad} 
                    onChangeText={t => setFormData({...formData, ciudad: t})}
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Estado *</Text>
                  <TextInput 
                    style={styles.input} 
                    value={formData.estado} 
                    onChangeText={t => setFormData({...formData, estado: t})}
                  />
                </View>
              </View>

              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveDireccion}>
                <Text style={styles.saveBtnText}>Guardar Dirección</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* PAYMENT MODAL REFACTOR */}
      <Modal visible={showPaymentModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.paymentModal}>
            <View style={styles.paymentHeader}>
              <Text style={styles.paymentTtl}>Pago Predeterminado</Text>
              <TouchableOpacity onPress={() => setShowPaymentModal(false)}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={metodoPagos}
              keyExtractor={m => m.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={[styles.paymentItem, metodoPagoFavorito === item.id && styles.paymentItemActive]}
                  onPress={async () => { await setFavoritePaymentMethodLocal(item.id); setMetodoPagoFavorito(item.id); setShowPaymentModal(false); }}
                >
                  <CreditCard size={20} color={metodoPagoFavorito === item.id ? '#0f2f6f' : '#94A3B8'} />
                  <Text style={[styles.paymentLabel, metodoPagoFavorito === item.id && styles.paymentLabelActive]}>{item.nombre}</Text>
                  {metodoPagoFavorito === item.id && <View style={styles.paymentCheck} />}
                </TouchableOpacity>
              )}
              style={styles.paymentList}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingBottom: 40, borderBottomLeftRadius: 40, borderBottomRightRadius: 40 },
  headerContent: { paddingTop: Platform.OS === 'ios' ? 75 : 55, alignItems: 'center' },
  avatarWrapper: { marginBottom: 16, position: 'relative' },
  avatar: { width: 90, height: 90, borderRadius: 30, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', elevation: 10, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10 },
  editAvatarBtn: { position: 'absolute', bottom: -4, right: -4, width: 32, height: 32, borderRadius: 12, backgroundColor: '#4F46E5', justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#0f2f6f' },
  userName: { fontSize: 22, fontWeight: '800', color: '#FFF' },
  userEmail: { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  content: { padding: 24, paddingTop: 32 },
  sectionTtl: { fontSize: 13, fontWeight: '800', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 },
  menuGroup: { backgroundColor: '#FFF', borderRadius: 24, paddingVertical: 8, marginBottom: 28, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10 },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 16 },
  iconCircle: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
  menuLabel: { fontSize: 15, fontWeight: '700', color: '#1E293B' },
  menuSub: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  prefRow: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 16 },
  logoutBtn: { borderRadius: 20, overflow: 'hidden', marginTop: 10 },
  logoutGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 18, gap: 10 },
  logoutText: { fontSize: 16, fontWeight: '700', color: '#DC2626' },
  footer: { marginTop: 40, alignItems: 'center' },
  footerVer: { fontSize: 12, fontWeight: '700', color: '#CBD5E1' },
  footerBrand: { fontSize: 11, color: '#E2E8F0', marginTop: 4 },
  // Modals
  modalFull: { flex: 1, backgroundColor: '#F8FAFC' },
  modalHeader: { paddingTop: Platform.OS === 'ios' ? 70 : 50, paddingBottom: 20, paddingHorizontal: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTtl: { fontSize: 20, fontWeight: '800', color: '#FFF' },
  modalBody: { flex: 1, padding: 24 },
  listSection: { marginBottom: 32 },
  listSectionTtl: { fontSize: 16, fontWeight: '800', color: '#1E293B', marginBottom: 16 },
  dirCard: { backgroundColor: '#FFF', borderRadius: 20, padding: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 12, elevation: 2 },
  dirIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
  dirName: { fontSize: 14, fontWeight: '700', color: '#1E293B' },
  dirSub: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  dirActions: { flexDirection: 'row', gap: 12 },
  formContainer: { paddingBottom: 60 },
  inputGroup: { marginBottom: 16 },
  inputLabel: { fontSize: 13, fontWeight: '700', color: '#64748B', marginBottom: 8 },
  input: { backgroundColor: '#FFF', borderRadius: 16, borderWidth: 1.5, borderColor: '#E2E8F0', padding: 14, fontSize: 15, color: '#1E293B' },
  row: { flexDirection: 'row', gap: 12 },
  saveBtn: { backgroundColor: '#0f2f6f', paddingVertical: 18, borderRadius: 20, alignItems: 'center', marginTop: 20, elevation: 4 },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.5)', justifyContent: 'center', alignItems: 'center' },
  paymentModal: { backgroundColor: '#FFF', width: '85%', borderRadius: 28, overflow: 'hidden' },
  paymentHeader: { padding: 20, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  paymentTtl: { fontSize: 17, fontWeight: '800', color: '#1E293B' },
  paymentList: { padding: 12 },
  paymentItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, gap: 14, marginBottom: 4 },
  paymentItemActive: { backgroundColor: 'rgba(15, 47, 111, 0.05)' },
  paymentLabel: { fontSize: 15, fontWeight: '600', color: '#64748B', flex: 1 },
  paymentLabelActive: { color: '#0f2f6f', fontWeight: '700' },
  paymentCheck: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#0f2f6f' }
});