import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  StatusBar,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import {
  Users,
  BarChart3,
  Store,
  LogOut,
  Info,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  UserCheck,
  UserX,
  UserRound,
  ShieldCheck,
  Mail,
  Phone,
  X,
} from 'lucide-react-native';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { ApiError, getMe, MeResponse, logout } from '../../services/auth';
import {
  getConfigStats,
  getConfigData,
  getEmpleadoDetalle,
  actualizarEmpleado,
  eliminarEmpleado,
  ConfigStats,
  EmpleadoListado,
  CatalogoSimple,
} from '../../services/configuracion';
import { clearToken, getToken, hydrateToken } from '../../services/storage';
import { useToast } from '../../components/Toast';

const CHART_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#6366F1', '#EC4899', '#14B8A6', '#8B5CF6'];

export default function Configuracion() {
  const navigation = useNavigation();
  const { showToast } = useToast();
  
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [profile, setProfile] = useState<MeResponse | null>(null);

  const [stats, setStats] = useState<ConfigStats | null>(null);
  const [empleados, setEmpleados] = useState<EmpleadoListado[]>([]);
  const [tiendaNombre, setTiendaNombre] = useState('');
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [showEmpleados, setShowEmpleados] = useState(false);
  
  const [isEmployeeModalVisible, setIsEmployeeModalVisible] = useState(false);
  const [isEmployeeLoading, setIsEmployeeLoading] = useState(false);
  const [isEmployeeSaving, setIsEmployeeSaving] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);
  const [rolesCatalog, setRolesCatalog] = useState<CatalogoSimple[]>([]);
  const [estatusCatalog, setEstatusCatalog] = useState<CatalogoSimple[]>([]);
  const [employeeForm, setEmployeeForm] = useState({
    nombre: '', apellido_paterno: '', apellido_materno: '', telefono: '', email: '', id_rol: '', id_estatus: '',
  });

  const roleName = useMemo(() => {
    if (!profile?.rol) return 'Sin rol';
    return (typeof profile.rol === 'string') ? profile.rol : (profile.rol.nombre ?? 'Sin rol');
  }, [profile]);

  const displayName = useMemo(() => {
    const persona = profile?.persona;
    if (!persona) return 'Usuario';
    return [persona.nombre, persona.apellido_paterno].filter(Boolean).join(' ') || 'Usuario';
  }, [profile]);

  const goToLogin = useCallback(() => {
    navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'RoleSelect' as never }] }));
  }, [navigation]);

  const requireToken = useCallback(async (): Promise<string | null> => {
    let token = getToken();
    if (!token) token = await hydrateToken();
    if (!token) { await clearToken(); goToLogin(); return null; }
    return token;
  }, [goToLogin]);

  const loadProfile = useCallback(async () => {
    const token = await requireToken();
    if (!token) return;
    try {
      setIsLoadingProfile(true);
      const me = await getMe(token);
      setProfile(me);
    } catch {
      showToast({ message: 'Error cargando perfil.', type: 'error' });
    } finally {
      setIsLoadingProfile(false);
    }
  }, [requireToken, showToast]);

  const loadStats = useCallback(async (showFullLoader = true) => {
    const token = await requireToken();
    if (!token) return;
    if (showFullLoader) setIsLoadingStats(true);
    else setIsRefreshing(true);
    setStatsError(null);

    try {
      const [statsData, configData] = await Promise.all([
        getConfigStats(token),
        getConfigData(token),
      ]);
      setStats(statsData);
      setEmpleados(configData.empleados);
      setTiendaNombre(configData.tienda.nombre);
    } catch (e: any) {
      if (e?.status === 403) setStatsError('Se requieren permisos administrativos.');
      else setStatsError(e instanceof Error ? e.message : 'Error al sincronizar.');
    } finally {
      setIsLoadingStats(false);
      setIsRefreshing(false);
    }
  }, [requireToken]);

  useEffect(() => {
    loadProfile();
    loadStats();
  }, [loadProfile, loadStats]);

  const openEmployeeEditor = async (idEmpleado: number) => {
    const token = await requireToken();
    if (!token) return;
    setIsEmployeeModalVisible(true);
    setIsEmployeeLoading(true);
    setSelectedEmployeeId(idEmpleado);

    try {
      const response = await getEmpleadoDetalle(token, idEmpleado);
      setRolesCatalog(response.catalogos.roles);
      setEstatusCatalog(response.catalogos.estatus);
      setEmployeeForm({
        nombre: response.empleado.nombre,
        apellido_paterno: response.empleado.apellido_paterno,
        apellido_materno: response.empleado.apellido_materno ?? '',
        telefono: response.empleado.telefono,
        email: response.empleado.email,
        id_rol: String(response.empleado.id_rol),
        id_estatus: String(response.empleado.id_estatus),
      });
    } catch {
      setIsEmployeeModalVisible(false);
    } finally {
      setIsEmployeeLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Cerrar Sesión', '¿Deseas salir de la aplicación?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Salir', style: 'destructive', onPress: async () => {
        setIsLoggingOut(true); await clearToken(); goToLogin();
      }},
    ]);
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.headerRow}>
        <View>
          <Text style={styles.headerTitle}>Ajustes</Text>
          <Text style={styles.headerSubtitle}>Módulo de Administración</Text>
        </View>
        <TouchableOpacity 
          style={styles.refreshBtn}
          onPress={() => loadStats(false)} 
          disabled={isRefreshing}
        >
          {isRefreshing ? <ActivityIndicator size="small" color="#1C273F" /> : <RefreshCw size={20} color="#1C273F" />}
        </TouchableOpacity>
      </View>

      <LinearGradient
        colors={['#1F2937', '#111827']}
        style={styles.profileCard}
      >
        <View style={styles.profileTop}>
          <View style={styles.avatarWrap}>
            <UserRound size={32} color="#FFF" />
          </View>
          <View style={styles.profileMeta}>
             <Text style={styles.profileName}>{displayName}</Text>
             <View style={styles.roleBadge}>
                <ShieldCheck size={14} color="#60A5FA" />
                <Text style={styles.roleText}>{roleName}</Text>
             </View>
          </View>
        </View>

        <View style={styles.profileDetails}>
           <View style={styles.detailItem}>
              <Mail size={14} color="rgba(255,255,255,0.4)" />
              <Text style={styles.detailText}>{profile?.email || 'N/A'}</Text>
           </View>
           <View style={styles.detailItem}>
              <Store size={14} color="rgba(255,255,255,0.4)" />
              <Text style={styles.detailText}>{tiendaNombre || 'Tienda Principal'}</Text>
           </View>
        </View>
      </LinearGradient>

      {stats && (
        <View style={styles.statsSection}>
           <Text style={styles.sectionTitle}>Resumen Operativo</Text>
           <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                 <Users size={20} color="#3B82F6" />
                 <Text style={styles.statValue}>{stats.total_empleados}</Text>
                 <Text style={styles.statLabel}>Staff</Text>
              </View>
              <View style={styles.statBox}>
                 <UserCheck size={20} color="#10B981" />
                 <Text style={styles.statValue}>{stats.resumen_estatus.find(e => e.nombre === 'Activo')?.cantidad || 0}</Text>
                 <Text style={styles.statLabel}>Activos</Text>
              </View>
              <View style={styles.statBox}>
                 <UserX size={20} color="#EF4444" />
                 <Text style={styles.statValue}>{stats.resumen_estatus.find(e => e.nombre === 'Inactivo')?.cantidad || 0}</Text>
                 <Text style={styles.statLabel}>Bajas</Text>
              </View>
           </View>
        </View>
      )}

      {empleados.length > 0 && (
        <View style={styles.collapsibleContainer}>
           <TouchableOpacity 
             style={styles.collapseTrigger} 
             onPress={() => setShowEmpleados(!showEmpleados)}
           >
              <View style={styles.collapseLabel}>
                 <Users size={20} color="#1E293B" />
                 <Text style={styles.collapseTitle}>Personal de Tienda</Text>
              </View>
              {showEmpleados ? <ChevronUp size={20} color="#94A3B8" /> : <ChevronDown size={20} color="#94A3B8" />}
           </TouchableOpacity>

           {showEmpleados && (
              <View style={styles.employeeList}>
                 {empleados.map(emp => (
                    <TouchableOpacity 
                      key={emp.id_usuario} 
                      style={styles.employeeCard}
                      onPress={() => openEmployeeEditor(emp.id_usuario)}
                    >
                       <View style={styles.empAvatar} />
                       <View style={{ flex: 1 }}>
                          <Text style={styles.empName}>{emp.nombre}</Text>
                          <Text style={styles.empEmail}>{emp.email}</Text>
                       </View>
                       <View style={styles.empBadges}>
                          <Text style={[styles.empBadge, emp.estatus === 'Activo' ? styles.empActive : styles.empInactive]}>
                             {emp.estatus}
                          </Text>
                       </View>
                    </TouchableOpacity>
                 ))}
              </View>
           )}
        </View>
      )}

      <View style={styles.infoBox}>
         <View style={styles.infoLine}>
            <Text style={styles.infoKey}>App Version</Text>
            <Text style={styles.infoVal}>1.2.0-stable</Text>
         </View>
         <View style={styles.infoLine}>
            <Text style={styles.infoKey}>Último Sync</Text>
            <Text style={styles.infoVal}>Hoy</Text>
         </View>
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
         <LogOut size={22} color="#EF4444" />
         <Text style={styles.logoutText}>Cerrar Sesión Segura</Text>
      </TouchableOpacity>

      <View style={{ height: 60 }} />

      <Modal animationType="slide" transparent visible={isEmployeeModalVisible}>
         <View style={styles.modalOverlay}>
            <View style={styles.modalSheet}>
               <View style={styles.sheetTop}>
                  <Text style={styles.sheetTitle}>Perfil de Empleado</Text>
                  <TouchableOpacity onPress={() => setIsEmployeeModalVisible(false)}>
                     <X size={24} color="#1E293B" />
                  </TouchableOpacity>
               </View>
               
               {isEmployeeLoading ? <ActivityIndicator size="large" color="#1C273F" style={{marginTop: 40}} /> : (
                 <ScrollView style={{ flex: 1 }}>
                    {/* Simplified for demo form */}
                    <Text style={styles.formLabel}>Nombre Completo</Text>
                    <TextInput style={styles.formInput} value={employeeForm.nombre} onChangeText={v => setEmployeeForm(f=>({...f, nombre: v}))} />
                    
                    <Text style={styles.formLabel}>Correo Electrónico</Text>
                    <TextInput style={styles.formInput} value={employeeForm.email} keyboardType="email-address" onChangeText={v => setEmployeeForm(f=>({...f, email: v}))} />
                    
                    <Text style={styles.formLabel}>Teléfono</Text>
                    <TextInput style={styles.formInput} value={employeeForm.telefono} keyboardType="phone-pad" onChangeText={v => setEmployeeForm(f=>({...f, telefono: v}))} />

                    <View style={{ height: 100 }} />
                 </ScrollView>
               )}
            </View>
         </View>
      </Modal>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC', padding: 16 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 40, marginBottom: 24 },
  headerTitle: { fontSize: 32, fontWeight: '900', color: '#1E293B', letterSpacing: -1 },
  headerSubtitle: { fontSize: 14, color: '#64748B', fontWeight: '500', marginTop: -4 },
  refreshBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10 },
  profileCard: { borderRadius: 28, padding: 24, marginBottom: 24, elevation: 4, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 15 },
  profileTop: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 20 },
  avatarWrap: { width: 64, height: 64, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  profileMeta: { gap: 4 },
  profileName: { color: '#FFF', fontSize: 20, fontWeight: '800' },
  roleBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  roleText: { color: '#60A5FA', fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  profileDetails: { gap: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', paddingTop: 20 },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  detailText: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '500' },
  statsSection: { marginBottom: 32 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#1E293B', marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1 },
  statsGrid: { flexDirection: 'row', gap: 12 },
  statBox: { flex: 1, backgroundColor: '#FFF', padding: 16, borderRadius: 24, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 10, elevation: 2 },
  statValue: { fontSize: 20, fontWeight: '900', color: '#1E293B', marginTop: 8 },
  statLabel: { fontSize: 11, fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase' },
  collapsibleContainer: { backgroundColor: '#FFF', borderRadius: 28, overflow: 'hidden', marginBottom: 24, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 10, elevation: 2 },
  collapseTrigger: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  collapseLabel: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  collapseTitle: { fontSize: 16, fontWeight: '800', color: '#1E293B' },
  employeeList: { paddingHorizontal: 12, paddingBottom: 16, gap: 8 },
  employeeCard: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: '#F8FAFC', borderRadius: 20, gap: 12 },
  empAvatar: { width: 40, height: 40, borderRadius: 14, backgroundColor: '#E2E8F0' },
  empName: { fontSize: 14, fontWeight: '700', color: '#1E293B' },
  empEmail: { fontSize: 12, color: '#64748B' },
  empBadges: { alignItems: 'flex-end' },
  empBadge: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  empActive: { backgroundColor: '#DCFCE7', color: '#10B981' },
  empInactive: { backgroundColor: '#FEE2E2', color: '#EF4444' },
  infoBox: { padding: 24, backgroundColor: '#FFF', borderRadius: 28, gap: 12, marginBottom: 24 },
  infoLine: { flexDirection: 'row', justifyContent: 'space-between' },
  infoKey: { color: '#94A3B8', fontWeight: '600', fontSize: 13 },
  infoVal: { color: '#1E293B', fontWeight: '800', fontSize: 13 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 20, borderRadius: 20, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#FEE2E2' },
  logoutText: { color: '#EF4444', fontSize: 16, fontWeight: '800' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#FFF', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, height: '80%' },
  sheetTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  sheetTitle: { fontSize: 22, fontWeight: '900', color: '#1E293B' },
  formLabel: { fontSize: 11, fontWeight: '800', color: '#94A3B8', textTransform: 'uppercase', marginBottom: 8, marginTop: 16 },
  formInput: { backgroundColor: '#F8FAFC', padding: 16, borderRadius: 16, fontSize: 15, fontWeight: '700', color: '#1E293B' },
});