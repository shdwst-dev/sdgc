import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Switch, StatusBar, Platform, ActivityIndicator, Modal, TextInput, FlatList } from 'react-native';
import { User, Package, MapPin, CreditCard, LogOut, ChevronRight, X, Plus, Edit2, Trash2 } from 'lucide-react-native';
import { useNavigation, CommonActions, useFocusEffect } from '@react-navigation/native';
import { ApiError, getMe, logout, MeResponse } from '../../services/auth';
import { clearToken, getToken, hydrateToken } from '../../services/storage';
import { getDireccionesLocal, saveDireccionLocal, deleteDireccionLocal, getMetodosPagoLocal, getFavoritePaymentMethodLocal, setFavoritePaymentMethodLocal, Direccion, MetodoPago } from '../../services/comprador';

export default function Perfil() {
  const navigation = useNavigation();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [profileData, setProfileData] = useState<MeResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [direcciones, setDirecciones] = useState<Direccion[]>([]);
  const [metodoPagos, setMetodoPagos] = useState<MetodoPago[]>([]);
  const [metodoPagoFavorito, setMetodoPagoFavorito] = useState<number | null>(null);
  const [showDireccionModal, setShowDireccionModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [editingDireccion, setEditingDireccion] = useState<Direccion | null>(null);
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
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'InicioSesion' as never }],
      }),
    );
  }, [navigation]);

  const loadProfile = useCallback(async () => {
    let token = getToken();

    if (!token) {
      token = await hydrateToken();
    }

    if (!token) {
      await clearToken();
      goToLogin();
      return;
    }

    try {
      setIsLoading(true);
      const userData = await getMe(token);
      setProfileData(userData);
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 401) {
        await clearToken();
        Alert.alert('Sesión expirada', 'Inicia sesión nuevamente.');
        goToLogin();
        return;
      }

      const message = requestError instanceof Error
        ? requestError.message
        : 'No se pudo cargar el perfil.';
      
      Alert.alert('Error', message);
    } finally {
      setIsLoading(false);
    }
  }, [goToLogin]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  useFocusEffect(
    useCallback(() => {
      loadDirecciones();
      loadMetodosPago();
    }, [])
  );

  const loadDirecciones = async () => {
    try {
      const dirs = await getDireccionesLocal();
      setDirecciones(dirs);
    } catch (error) {
      console.error('Error loading direcciones:', error);
    }
  };

  const loadMetodosPago = async () => {
    try {
      const metodos = await getMetodosPagoLocal();
      setMetodoPagos(metodos);
      const favorito = await getFavoritePaymentMethodLocal();
      setMetodoPagoFavorito(favorito);
    } catch (error) {
      console.error('Error loading payment methods:', error);
    }
  };

  const handleSaveDireccion = async () => {
    if (!formData.calle || !formData.numero_exterior || !formData.colonia) {
      Alert.alert('Campos requeridos', 'Por favor completa los campos obligatorios');
      return;
    }

    try {
      const nuevaDireccion: Direccion = {
        id: editingDireccion?.id || 0,
        calle: formData.calle,
        numero_exterior: parseInt(formData.numero_exterior),
        numero_interior: formData.numero_interior ? parseInt(formData.numero_interior) : undefined,
        colonia: formData.colonia,
        ciudad: formData.ciudad,
        estado: formData.estado,
        codigoPostal: formData.codigoPostal,
      };

      await saveDireccionLocal(nuevaDireccion);
      await loadDirecciones();
      setShowDireccionModal(false);
      setEditingDireccion(null);
      setFormData({ calle: '', numero_exterior: '', numero_interior: '', colonia: '', ciudad: '', estado: '', codigoPostal: '' });
      Alert.alert('Éxito', editingDireccion ? 'Dirección actualizada' : 'Dirección agregada');
    } catch (error) {
      Alert.alert('Error', 'No se pudo guardar la dirección');
    }
  };

  const handleDeleteDireccion = (id: number) => {
    Alert.alert('Eliminar', '¿Estás seguro de eliminar esta dirección?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteDireccionLocal(id);
            await loadDirecciones();
            Alert.alert('Éxito', 'Dirección eliminada');
          } catch (error) {
            Alert.alert('Error', 'No se pudo eliminar la dirección');
          }
        }
      }
    ]);
  };

  const handleEditDireccion = (dir: Direccion) => {
    setEditingDireccion(dir);
    setFormData({
      calle: dir.calle,
      numero_exterior: dir.numero_exterior.toString(),
      numero_interior: dir.numero_interior?.toString() || '',
      colonia: dir.colonia,
      ciudad: dir.ciudad,
      estado: dir.estado,
      codigoPostal: dir.codigoPostal,
    });
    setShowDireccionModal(true);
  };

  const handleSelectPaymentMethod = async (methodId: number) => {
    try {
      await setFavoritePaymentMethodLocal(methodId);
      setMetodoPagoFavorito(methodId);
      Alert.alert('Éxito', 'Método de pago actualizado');
      setShowPaymentModal(false);
    } catch (error) {
      Alert.alert('Error', 'No se pudo cambiar el método de pago');
    }
  };

  const getDisplayName = () => {
    if (!profileData?.persona) return 'Usuario';
    
    const { nombre, apellido_paterno, apellido_materno } = profileData.persona;
    const fullName = [nombre, apellido_paterno, apellido_materno]
      .filter(Boolean)
      .join(' ')
      .trim();

    return fullName || 'Usuario';
  };

  const getRolName = () => {
    if (!profileData?.rol) return 'Sin rol';
    if (typeof profileData.rol === 'string') return profileData.rol;
    return profileData.rol.nombre ?? 'Sin rol';
  };

  const menuItems = [
    {
      icon: Package,
      label: 'Mis Pedidos',
      subtitle: 'No tienes historial de pedidos',
      onClick: () => Alert.alert('Pedidos', 'No tienes historial de pedidos'),
    },
    {
      icon: MapPin,
      label: 'Direcciones',
      subtitle: direcciones.length > 0 ? `${direcciones.length} dirección${direcciones.length > 1 ? 'es' : ''}` : 'Agregar dirección',
      onClick: () => setShowDireccionModal(true),
    },
    {
      icon: CreditCard,
      label: 'Métodos de Pago',
      subtitle: metodoPagoFavorito ? `Favorito: ${metodoPagos.find(m => m.id === metodoPagoFavorito)?.nombre}` : 'Seleccionar método',
      onClick: () => setShowPaymentModal(true),
    },
  ];

  const performLogout = async () => {
    const token = getToken();
    if (token) {
      try {
        await logout(token);
      } catch (err) {
        console.error("Error cierre sesión remoto:", err);
      }
    }
    
    await clearToken();
    goToLogin();
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

  if (isLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#1C273F" />
        <Text style={{ marginTop: 10, color: '#6B7280' }}>Cargando perfil...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <User size={40} color="#FFF" />
        </View>
        <View>
          <Text style={styles.userName}>{getDisplayName()}</Text>
          <Text style={styles.userEmail}>{profileData?.email}</Text>
          <Text style={styles.userRole}>{getRolName()}</Text>
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
          <Text style={styles.footerSubtext}>Conectado a BD</Text>
        </View>
      </View>
      <View style={{ height: 40 }} />

      {/* Modal Direcciones */}
      <Modal
        visible={showDireccionModal}
        animationType="slide"
        onRequestClose={() => setShowDireccionModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{editingDireccion ? 'Editar' : 'Nueva'} Dirección</Text>
            <TouchableOpacity onPress={() => setShowDireccionModal(false)}>
              <X size={24} color="#101828" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {!editingDireccion ? (
              <View style={styles.direccionList}>
                <Text style={styles.listTitle}>Direcciones Guardadas</Text>
                {direcciones.length === 0 ? (
                  <Text style={styles.emptyText}>No hay direcciones guardadas</Text>
                ) : (
                  <FlatList
                    data={direcciones}
                    keyExtractor={(item) => item.id.toString()}
                    scrollEnabled={false}
                    renderItem={({ item }) => (
                      <View style={styles.direccionItem}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.direccionCalle}>{item.calle} {item.numero_exterior}</Text>
                          <Text style={styles.direccionDetails}>{item.colonia}, {item.ciudad}</Text>
                          <Text style={styles.direccionDetails}>{item.estado} {item.codigoPostal}</Text>
                          {item.esPrincipal && <Text style={styles.principal}>Dirección principal</Text>}
                        </View>
                        <View style={styles.direccionActions}>
                          <TouchableOpacity onPress={() => handleEditDireccion(item)} style={styles.actionBtn}>
                            <Edit2 size={18} color="#1C273F" />
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => handleDeleteDireccion(item.id)} style={[styles.actionBtn, { backgroundColor: '#FEE2E2' }]}>
                            <Trash2 size={18} color="#DC2626" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}
                  />
                )}
              </View>
            ) : null}

            <View style={styles.formSection}>
              <Text style={styles.formTitle}>{editingDireccion ? 'Editar' : 'Agregar Nueva'} Dirección</Text>
              
              <View style={styles.formGroup}>
                <Text style={styles.label}>Calle *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Nombre de la calle"
                  value={formData.calle}
                  onChangeText={(text) => setFormData({ ...formData, calle: text })}
                />
              </View>

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Número Exterior *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="No."
                    keyboardType="number-pad"
                    value={formData.numero_exterior}
                    onChangeText={(text) => setFormData({ ...formData, numero_exterior: text })}
                  />
                </View>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Número Interior</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Apto/Local"
                    keyboardType="number-pad"
                    value={formData.numero_interior}
                    onChangeText={(text) => setFormData({ ...formData, numero_interior: text })}
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Colonia *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Colonia"
                  value={formData.colonia}
                  onChangeText={(text) => setFormData({ ...formData, colonia: text })}
                />
              </View>

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Ciudad *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ciudad"
                    value={formData.ciudad}
                    onChangeText={(text) => setFormData({ ...formData, ciudad: text })}
                  />
                </View>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Estado *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Estado"
                    value={formData.estado}
                    onChangeText={(text) => setFormData({ ...formData, estado: text })}
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Código Postal *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="00000"
                  keyboardType="number-pad"
                  value={formData.codigoPostal}
                  onChangeText={(text) => setFormData({ ...formData, codigoPostal: text })}
                />
              </View>

              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveDireccion}>
                <Text style={styles.saveBtnText}>{editingDireccion ? 'Actualizar' : 'Guardar'} Dirección</Text>
              </TouchableOpacity>

              {editingDireccion && (
                <TouchableOpacity 
                  style={[styles.saveBtn, { backgroundColor: '#F3F4F6' }]} 
                  onPress={() => {
                    setEditingDireccion(null);
                    setFormData({ calle: '', numero_exterior: '', numero_interior: '', colonia: '', ciudad: '', estado: '', codigoPostal: '' });
                  }}
                >
                  <Text style={[styles.saveBtnText, { color: '#6B7280' }]}>Cancelar</Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Modal Métodos de Pago */}
      <Modal
        visible={showPaymentModal}
        animationType="slide"
        onRequestClose={() => setShowPaymentModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Métodos de Pago</Text>
            <TouchableOpacity onPress={() => setShowPaymentModal(false)}>
              <X size={24} color="#101828" />
            </TouchableOpacity>
          </View>

          <FlatList
            data={metodoPagos}
            keyExtractor={(item) => item.id.toString()}
            style={styles.modalContent}
            renderItem={({ item }) => (
              <TouchableOpacity 
                style={[styles.paymentOption, metodoPagoFavorito === item.id && styles.paymentOptionSelected]}
                onPress={() => handleSelectPaymentMethod(item.id)}
              >
                <View style={styles.paymentRadio}>
                  {metodoPagoFavorito === item.id && <View style={styles.radioFilled} />}
                </View>
                <Text style={styles.paymentLabel}>{item.nombre}</Text>
                {metodoPagoFavorito === item.id && <Text style={styles.favoriteBadge}>Favorito</Text>}
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#e6f3fb' },
  header: { 
    backgroundColor: '#FFF', 
    padding: 24, 
    paddingTop: 60, 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#cfdaea'
  },
  avatarContainer: { 
    width: 80, 
    height: 80, 
    borderRadius: 40, 
    backgroundColor: '#0f2f6f', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  userName: { fontSize: 20, fontWeight: 'bold', color: '#1C3A5C' },
  userEmail: { fontSize: 14, color: '#5e728f' },
  userRole: { fontSize: 12, color: '#7a8ba5', marginTop: 4 },
  content: { padding: 16, gap: 16 },
  sectionCard: { 
    backgroundColor: '#FFF', 
    borderRadius: 12, 
    borderWidth: 1, 
    borderColor: '#cfdaea', 
    overflow: 'hidden' 
  },
  sectionHeader: { 
    backgroundColor: '#f3f7ff', 
    paddingHorizontal: 16, 
    paddingVertical: 12, 
    borderBottomWidth: 1, 
    borderBottomColor: '#cfdaea' 
  },
  sectionTitle: { fontSize: 14, fontWeight: 'bold', color: '#1C3A5C' },
  menuList: { },
  menuItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 16, 
    gap: 16, 
    borderBottomWidth: 1, 
    borderBottomColor: '#f3f7ff' 
  },
  iconCircle: { 
    width: 40, 
    height: 40, 
    borderRadius: 8, 
    backgroundColor: 'rgba(15, 47, 111, 0.1)', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  menuLabel: { fontSize: 15, fontWeight: '600', color: '#1C3A5C' },
  menuSubtitle: { fontSize: 12, color: '#5e728f' },
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
    borderColor: '#cfdaea', 
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
  logoutText: { flex: 1, fontSize: 15, fontWeight: '600', color: '#dc2626' },
  footer: { marginTop: 8, alignItems: 'center' },
  footerText: { fontSize: 12, color: '#7a8ba5' },
  footerSubtext: { fontSize: 11, color: '#b5c4d1', marginTop: 4 },
  // Modal styles
  modalContainer: { 
    flex: 1, 
    backgroundColor: '#e6f3fb', 
    paddingTop: 20 
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#cfdaea'
  },
  modalTitle: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: '#1C3A5C' 
  },
  modalContent: { 
    padding: 16 
  },
  direccionList: {
    marginBottom: 24
  },
  listTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1C3A5C',
    marginBottom: 12
  },
  emptyText: {
    fontSize: 13,
    color: '#5e728f',
    textAlign: 'center',
    paddingVertical: 20
  },
  direccionItem: {
    backgroundColor: '#FFF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#cfdaea',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  direccionCalle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1C3A5C',
    marginBottom: 4
  },
  direccionDetails: {
    fontSize: 12,
    color: '#5e728f',
    marginBottom: 2
  },
  principal: {
    fontSize: 11,
    color: '#1C7F4A',
    fontWeight: 'bold',
    marginTop: 4
  },
  direccionActions: {
    flexDirection: 'row',
    gap: 8
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 6,
    backgroundColor: '#f3f7ff',
    justifyContent: 'center',
    alignItems: 'center'
  },
  formSection: {
    marginBottom: 24
  },
  formTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1C3A5C',
    marginBottom: 16
  },
  formGroup: {
    marginBottom: 16
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1C3A5C',
    marginBottom: 6
  },
  input: {
    borderWidth: 1,
    borderColor: '#cfdaea',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1C3A5C',
    backgroundColor: '#FFF'
  },
  saveBtn: {
    backgroundColor: '#0f2f6f',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 12
  },
  saveBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold'
  },
  paymentOption: {
    backgroundColor: '#FFF',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#cfdaea'
  },
  paymentOptionSelected: {
    borderColor: '#0f2f6f',
    backgroundColor: 'rgba(15, 47, 111, 0.05)'
  },
  paymentRadio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#cfdaea',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center'
  },
  radioFilled: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#0f2f6f'
  },
  paymentLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C3A5C',
    flex: 1
  },
  favoriteBadge: {
    fontSize: 11,
    color: '#FFF',
    backgroundColor: '#0f2f6f',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    fontWeight: 'bold'
  }
});