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
  FlatList,
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
} from 'lucide-react-native';
import { useNavigation, CommonActions } from '@react-navigation/native';
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

// ─── Color palette for chart bars ────────────────────────────────────────────

const CHART_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#6366F1', '#EC4899', '#14B8A6', '#8B5CF6'];
const STATUS_COLORS: Record<string, string> = {
  Activo: '#10B981',
  Inactivo: '#EF4444',
  Pendiente: '#F59E0B',
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function Configuracion() {
  const navigation = useNavigation();
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
    nombre: '',
    apellido_paterno: '',
    apellido_materno: '',
    telefono: '',
    email: '',
    id_rol: '',
    id_estatus: '',
  });

  const roleName = useMemo(() => {
    if (!profile?.rol) return 'Sin rol';
    if (typeof profile.rol === 'string') return profile.rol;
    return profile.rol.nombre ?? 'Sin rol';
  }, [profile]);

  const displayName = useMemo(() => {
    const persona = profile?.persona;
    if (!persona) return 'Usuario';
    return [persona.nombre, persona.apellido_paterno, persona.apellido_materno]
      .filter(Boolean)
      .join(' ')
      .trim() || 'Usuario';
  }, [profile]);

  const statusName = useMemo(() => {
    if (!profile?.estatus) return 'Sin estatus';
    if (typeof profile.estatus === 'string') return profile.estatus;
    return profile.estatus.nombre ?? 'Sin estatus';
  }, [profile]);

  const goToLogin = useCallback(() => {
    navigation.dispatch(
      CommonActions.reset({ index: 0, routes: [{ name: 'InicioSesion' as never }] }),
    );
  }, [navigation]);

  const requireToken = useCallback(async (): Promise<string | null> => {
    let token = getToken();
    if (!token) token = await hydrateToken();
    if (!token) { await clearToken(); goToLogin(); return null; }
    return token;
  }, [goToLogin]);

  // ─── Load profile ──────────────────────────────────────────────────────────

  const loadProfile = useCallback(async () => {
    const token = await requireToken();
    if (!token) return;

    try {
      setIsLoadingProfile(true);
      const me = await getMe(token);
      setProfile(me);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        await clearToken();
        Alert.alert('Sesión expirada', 'Inicia sesión nuevamente.');
        goToLogin();
        return;
      }
      Alert.alert('Error', 'No se pudo cargar el perfil.');
    } finally {
      setIsLoadingProfile(false);
    }
  }, [goToLogin, requireToken]);

  // ─── Load stats + empleados ────────────────────────────────────────────────

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
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        await clearToken();
        Alert.alert('Sesión expirada', 'Inicia sesión nuevamente.');
        goToLogin();
        return;
      }
      if (error instanceof ApiError && error.status === 403) {
        setStatsError('No tienes permisos de administrador para ver esta sección.');
      } else {
        setStatsError(error instanceof Error ? error.message : 'Error al cargar configuración.');
      }
    } finally {
      setIsLoadingStats(false);
      setIsRefreshing(false);
    }
  }, [goToLogin, requireToken]);

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
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        await clearToken();
        Alert.alert('Sesión expirada', 'Inicia sesión nuevamente.');
        goToLogin();
        return;
      }
      Alert.alert('Error', error instanceof Error ? error.message : 'No se pudo cargar el empleado.');
      setIsEmployeeModalVisible(false);
    } finally {
      setIsEmployeeLoading(false);
    }
  };

  const saveEmployee = async () => {
    if (!selectedEmployeeId) return;
    const token = await requireToken();
    if (!token) return;

    setIsEmployeeSaving(true);
    try {
      await actualizarEmpleado(token, selectedEmployeeId, {
        nombre: employeeForm.nombre.trim(),
        apellido_paterno: employeeForm.apellido_paterno.trim(),
        apellido_materno: employeeForm.apellido_materno.trim() || null,
        telefono: employeeForm.telefono.trim(),
        email: employeeForm.email.trim(),
        id_rol: Number(employeeForm.id_rol),
        id_estatus: Number(employeeForm.id_estatus),
      });

      Alert.alert('Listo', 'Empleado actualizado correctamente.');
      setIsEmployeeModalVisible(false);
      loadStats(false).catch(() => undefined);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        await clearToken();
        Alert.alert('Sesión expirada', 'Inicia sesión nuevamente.');
        goToLogin();
        return;
      }
      Alert.alert('Error', error instanceof Error ? error.message : 'No se pudo actualizar el empleado.');
    } finally {
      setIsEmployeeSaving(false);
    }
  };

  const removeEmployee = async (idEmpleado: number, nombre: string) => {
    Alert.alert('Eliminar empleado', `¿Deseas eliminar a ${nombre}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          const token = await requireToken();
          if (!token) return;

          try {
            await eliminarEmpleado(token, idEmpleado);
            Alert.alert('Listo', 'Empleado eliminado correctamente.');
            loadStats(false).catch(() => undefined);
          } catch (error) {
            if (error instanceof ApiError && error.status === 401) {
              await clearToken();
              Alert.alert('Sesión expirada', 'Inicia sesión nuevamente.');
              goToLogin();
              return;
            }
            Alert.alert('Error', error instanceof Error ? error.message : 'No se pudo eliminar el empleado.');
          }
        },
      },
    ]);
  };

  // ─── Logout ────────────────────────────────────────────────────────────────

  const performLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    const token = getToken();
    try {
      if (token) await logout(token);
    } catch { /* cierra igual */ } finally {
      await clearToken();
      goToLogin();
      setIsLoggingOut(false);
    }
  };

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      if (window.confirm('¿Estás seguro de que quieres salir?')) performLogout();
    } else {
      Alert.alert('Cerrar Sesión', '¿Estás seguro de que quieres salir?', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Salir', style: 'destructive', onPress: performLogout },
      ]);
    }
  };

  // ─── Chart helper: max value for bar scaling ───────────────────────────────

  const maxRolCount = stats ? Math.max(...stats.resumen_rol.map((r) => r.cantidad), 1) : 1;

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>Configuración</Text>
        <TouchableOpacity onPress={() => loadStats(false)} disabled={isRefreshing}>
          {isRefreshing ? (
            <ActivityIndicator size="small" color="#1C273F" />
          ) : (
            <RefreshCw size={20} color="#1C273F" />
          )}
        </TouchableOpacity>
      </View>

      {/* ─── Profile card ──────────────────────────────────────────────────── */}
      <View style={styles.profileCard}>
        <View style={styles.profileInfo}>
          <View style={styles.avatarContainer}>
            <Users size={32} color="#FFF" />
          </View>
          <View style={styles.profileTextContainer}>
            {isLoadingProfile ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Text style={styles.profileName}>{displayName}</Text>
                <Text style={styles.profileEmail}>{profile?.email ?? 'Sin correo'}</Text>
                <Text style={styles.profileRole}>{roleName}</Text>
                <Text style={styles.profileStatus}>{statusName}</Text>
              </>
            )}
          </View>
        </View>
      </View>

      {/* ─── Stats error ───────────────────────────────────────────────────── */}
      {statsError ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{statsError}</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => loadStats()}
          >
            <Text style={styles.retryBtnText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* ─── Stats loading ─────────────────────────────────────────────────── */}
      {isLoadingStats && !stats ? (
        <View style={styles.loadingCard}>
          <ActivityIndicator size="large" color="#1C273F" />
          <Text style={styles.loadingText}>Cargando estadísticas...</Text>
        </View>
      ) : null}

      {/* ─── Summary cards ─────────────────────────────────────────────────── */}
      {stats ? (
        <>
          <View style={styles.summaryRow}>
            <View style={styles.summaryCard}>
              <View style={[styles.summaryIcon, { backgroundColor: '#DBEAFE' }]}>
                <Users size={20} color="#2563EB" />
              </View>
              <Text style={styles.summaryValue}>{stats.total_empleados}</Text>
              <Text style={styles.summaryLabel}>Total Empleados</Text>
            </View>
            <View style={styles.summaryCard}>
              <View style={[styles.summaryIcon, { backgroundColor: '#DCFCE7' }]}>
                <UserCheck size={20} color="#16A34A" />
              </View>
              <Text style={styles.summaryValue}>
                {stats.resumen_estatus.find((e) => e.nombre === 'Activo')?.cantidad ?? 0}
              </Text>
              <Text style={styles.summaryLabel}>Activos</Text>
            </View>
            <View style={styles.summaryCard}>
              <View style={[styles.summaryIcon, { backgroundColor: '#FEE2E2' }]}>
                <UserX size={20} color="#DC2626" />
              </View>
              <Text style={styles.summaryValue}>
                {stats.resumen_estatus.find((e) => e.nombre === 'Inactivo')?.cantidad ?? 0}
              </Text>
              <Text style={styles.summaryLabel}>Inactivos</Text>
            </View>
          </View>

          {/* ─── Chart: Empleados por Rol (horizontal bars) ──────────────── */}
          <View style={styles.chartCard}>
            <View style={styles.chartHeader}>
              <BarChart3 size={18} color="#1C273F" />
              <Text style={styles.chartTitle}>Empleados por Rol</Text>
            </View>
            {stats.resumen_rol.length > 0 ? (
              stats.resumen_rol.map((item, index) => {
                const barWidth = Math.max((item.cantidad / maxRolCount) * 100, 8);
                const color = CHART_COLORS[index % CHART_COLORS.length];

                return (
                  <View key={item.nombre} style={styles.barRow}>
                    <Text style={styles.barLabel}>{item.nombre}</Text>
                    <View style={styles.barTrack}>
                      <View style={[styles.barFill, { width: `${barWidth}%`, backgroundColor: color }]} />
                    </View>
                    <Text style={styles.barValue}>{item.cantidad}</Text>
                  </View>
                );
              })
            ) : (
              <Text style={styles.emptyText}>Sin datos de roles.</Text>
            )}
          </View>

          {/* ─── Chart: Empleados por Estatus (donut-style cards) ─────────── */}
          <View style={styles.chartCard}>
            <View style={styles.chartHeader}>
              <Store size={18} color="#1C273F" />
              <Text style={styles.chartTitle}>Distribución por Estatus</Text>
            </View>
            <View style={styles.statusGrid}>
              {stats.resumen_estatus.map((item) => {
                const color = STATUS_COLORS[item.nombre] ?? '#6B7280';
                const pct = stats.total_empleados > 0
                  ? Math.round((item.cantidad / stats.total_empleados) * 100)
                  : 0;

                return (
                  <View key={item.nombre} style={styles.statusCard}>
                    <View style={[styles.statusDot, { backgroundColor: color }]} />
                    <Text style={styles.statusName}>{item.nombre}</Text>
                    <Text style={styles.statusCount}>{item.cantidad}</Text>
                    <Text style={styles.statusPct}>{pct}%</Text>
                  </View>
                );
              })}
            </View>
            {stats.resumen_estatus.length === 0 ? (
              <Text style={styles.emptyText}>Sin datos de estatus.</Text>
            ) : null}
          </View>
        </>
      ) : null}

      {/* ─── Employee list (collapsible) ───────────────────────────────────── */}
      {empleados.length > 0 ? (
        <View style={styles.whiteCard}>
          <TouchableOpacity
            style={styles.collapseHeader}
            onPress={() => setShowEmpleados((prev) => !prev)}
          >
            <View style={styles.collapseHeaderLeft}>
              <Users size={18} color="#1C273F" />
              <Text style={styles.collapseTitle}>
                {tiendaNombre || 'Empleados'} ({empleados.length})
              </Text>
            </View>
            {showEmpleados ? (
              <ChevronUp size={20} color="#9CA3AF" />
            ) : (
              <ChevronDown size={20} color="#9CA3AF" />
            )}
          </TouchableOpacity>

          {showEmpleados ? (
            <View style={styles.empleadosList}>
              {empleados.map((emp) => (
                <View key={emp.id_usuario} style={styles.empleadoRow}>
                  <View style={styles.empleadoAvatar}>
                    <Text style={styles.empleadoInitial}>
                      {emp.nombre.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.empleadoName}>{emp.nombre}</Text>
                    <Text style={styles.empleadoEmail}>{emp.email}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <View style={[
                      styles.rolBadge,
                      { backgroundColor: emp.rol === 'Admin' || emp.rol === 'Super Admin' ? '#DBEAFE' : '#F3F4F6' },
                    ]}>
                      <Text style={[
                        styles.rolBadgeText,
                        { color: emp.rol === 'Admin' || emp.rol === 'Super Admin' ? '#2563EB' : '#6B7280' },
                      ]}>
                        {emp.rol}
                      </Text>
                    </View>
                    <View style={[
                      styles.statusBadge,
                      { backgroundColor: emp.estatus === 'Activo' ? '#DCFCE7' : '#FEE2E2' },
                    ]}>
                      <Text style={[
                        styles.statusBadgeText,
                        { color: emp.estatus === 'Activo' ? '#15803D' : '#B91C1C' },
                      ]}>
                        {emp.estatus}
                      </Text>
                    </View>

                    <View style={styles.employeeActionsRow}>
                      <TouchableOpacity style={styles.employeeActionEdit} onPress={() => openEmployeeEditor(emp.id_usuario)}>
                        <Text style={styles.employeeActionText}>Editar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.employeeActionDelete} onPress={() => removeEmployee(emp.id_usuario, emp.nombre)}>
                        <Text style={styles.employeeActionDeleteText}>Eliminar</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      ) : null}

      <Modal
        animationType="slide"
        transparent
        visible={isEmployeeModalVisible}
        onRequestClose={() => setIsEmployeeModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Editar Empleado</Text>
              <TouchableOpacity onPress={() => setIsEmployeeModalVisible(false)}>
                <Text style={styles.modalClose}>Cerrar</Text>
              </TouchableOpacity>
            </View>

            {isEmployeeLoading ? (
              <View style={styles.loadingCard}>
                <ActivityIndicator size="large" color="#1C273F" />
                <Text style={styles.loadingText}>Cargando empleado...</Text>
              </View>
            ) : (
              <ScrollView>
                <Text style={styles.label}>Nombre</Text>
                <TextInput style={styles.input} value={employeeForm.nombre} onChangeText={(value) => setEmployeeForm((prev) => ({ ...prev, nombre: value }))} />

                <Text style={styles.label}>Apellido paterno</Text>
                <TextInput style={styles.input} value={employeeForm.apellido_paterno} onChangeText={(value) => setEmployeeForm((prev) => ({ ...prev, apellido_paterno: value }))} />

                <Text style={styles.label}>Apellido materno</Text>
                <TextInput style={styles.input} value={employeeForm.apellido_materno} onChangeText={(value) => setEmployeeForm((prev) => ({ ...prev, apellido_materno: value }))} />

                <Text style={styles.label}>Telefono</Text>
                <TextInput style={styles.input} value={employeeForm.telefono} onChangeText={(value) => setEmployeeForm((prev) => ({ ...prev, telefono: value }))} />

                <Text style={styles.label}>Email</Text>
                <TextInput style={styles.input} value={employeeForm.email} onChangeText={(value) => setEmployeeForm((prev) => ({ ...prev, email: value }))} />

                <Text style={styles.label}>Rol</Text>
                <View style={styles.pillsWrap}>
                  {rolesCatalog.map((rol) => (
                    <TouchableOpacity
                      key={rol.id}
                      style={[styles.pill, employeeForm.id_rol === String(rol.id) ? styles.pillActive : null]}
                      onPress={() => setEmployeeForm((prev) => ({ ...prev, id_rol: String(rol.id) }))}
                    >
                      <Text style={[styles.pillText, employeeForm.id_rol === String(rol.id) ? styles.pillTextActive : null]}>{rol.nombre}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.label}>Estatus</Text>
                <View style={styles.pillsWrap}>
                  {estatusCatalog.map((estatus) => (
                    <TouchableOpacity
                      key={estatus.id}
                      style={[styles.pill, employeeForm.id_estatus === String(estatus.id) ? styles.pillActive : null]}
                      onPress={() => setEmployeeForm((prev) => ({ ...prev, id_estatus: String(estatus.id) }))}
                    >
                      <Text style={[styles.pillText, employeeForm.id_estatus === String(estatus.id) ? styles.pillTextActive : null]}>{estatus.nombre}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={styles.modalFooterRow}>
                  <TouchableOpacity style={styles.secondaryBtn} onPress={() => setIsEmployeeModalVisible(false)}>
                    <Text style={styles.secondaryBtnText}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.primaryBtn} onPress={saveEmployee} disabled={isEmployeeSaving}>
                    {isEmployeeSaving ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.primaryBtnText}>Guardar</Text>}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* ─── App info ──────────────────────────────────────────────────────── */}
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
          <Text style={styles.infoValue}>06 Abr 2026</Text>
        </View>
      </View>

      {/* ─── Logout ────────────────────────────────────────────────────────── */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} disabled={isLoggingOut}>
        <LogOut size={20} color="#FFF" />
        <Text style={styles.logoutBtnText}>{isLoggingOut ? 'Cerrando...' : 'Cerrar Sesión'}</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB', padding: 16 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, marginTop: 40 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#1C273F' },

  // Profile
  profileCard: { backgroundColor: '#1C273F', borderRadius: 16, padding: 20, marginBottom: 20, elevation: 4 },
  profileInfo: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  profileTextContainer: { flexShrink: 1 },
  avatarContainer: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  profileName: { fontSize: 18, fontWeight: 'bold', color: '#FFF' },
  profileEmail: { fontSize: 14, color: '#CBD5F5' },
  profileRole: { fontSize: 12, color: '#E2E8F0', marginTop: 2 },
  profileStatus: { fontSize: 12, color: '#E2E8F0' },

  // Summary
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16, gap: 8 },
  summaryCard: { flex: 1, backgroundColor: '#FFF', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center' },
  summaryIcon: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  summaryValue: { fontSize: 22, fontWeight: 'bold', color: '#101828' },
  summaryLabel: { fontSize: 10, color: '#6B7280', marginTop: 2 },

  // Chart cards
  chartCard: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 16 },
  chartHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  chartTitle: { fontSize: 15, fontWeight: '600', color: '#101828' },
  barRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 },
  barLabel: { width: 80, fontSize: 12, color: '#374151', fontWeight: '500' },
  barTrack: { flex: 1, height: 24, backgroundColor: '#F3F4F6', borderRadius: 6, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 6, minWidth: 4 },
  barValue: { width: 30, fontSize: 13, fontWeight: 'bold', color: '#101828', textAlign: 'right' },

  // Status distribution
  statusGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statusCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12, gap: 6 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusName: { fontSize: 13, color: '#374151', fontWeight: '500' },
  statusCount: { fontSize: 14, fontWeight: 'bold', color: '#101828' },
  statusPct: { fontSize: 11, color: '#9CA3AF' },

  // Employee list
  whiteCard: { backgroundColor: '#FFF', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 16, overflow: 'hidden' },
  collapseHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  collapseHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  collapseTitle: { fontSize: 15, fontWeight: '600', color: '#101828' },
  empleadosList: { borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  empleadoRow: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', gap: 12 },
  empleadoAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#1C273F', justifyContent: 'center', alignItems: 'center' },
  empleadoInitial: { color: '#FFF', fontSize: 15, fontWeight: 'bold' },
  empleadoName: { fontSize: 13, fontWeight: '600', color: '#101828' },
  empleadoEmail: { fontSize: 11, color: '#6B7280' },
  rolBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, marginBottom: 4 },
  rolBadgeText: { fontSize: 10, fontWeight: '600' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  statusBadgeText: { fontSize: 10, fontWeight: '600' },
  employeeActionsRow: { flexDirection: 'row', gap: 6, marginTop: 8 },
  employeeActionEdit: { backgroundColor: '#DBEAFE', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  employeeActionDelete: { backgroundColor: '#FEE2E2', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  employeeActionText: { fontSize: 10, color: '#1D4ED8', fontWeight: '700' },
  employeeActionDeleteText: { fontSize: 10, color: '#B91C1C', fontWeight: '700' },

  // Info / Errors
  infoCard: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 16 },
  infoTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  infoSectionTitle: { fontSize: 15, fontWeight: '600', color: '#101828' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  infoLabel: { fontSize: 13, color: '#6B7280' },
  infoValue: { fontSize: 13, color: '#101828', fontWeight: '500' },

  errorCard: { backgroundColor: '#FEF2F2', borderRadius: 12, padding: 20, borderWidth: 1, borderColor: '#FECACA', marginBottom: 16, alignItems: 'center' },
  errorText: { color: '#991B1B', fontSize: 13, textAlign: 'center', marginBottom: 12 },
  retryBtn: { backgroundColor: '#1C273F', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  retryBtnText: { color: '#FFF', fontWeight: '600', fontSize: 13 },

  loadingCard: { backgroundColor: '#FFF', borderRadius: 12, padding: 32, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 16, alignItems: 'center' },
  loadingText: { color: '#6B7280', marginTop: 12, fontSize: 13 },
  emptyText: { color: '#9CA3AF', fontSize: 13, textAlign: 'center', paddingVertical: 16 },

  // Employee modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#FFF', width: '92%', maxHeight: '82%', borderRadius: 14, padding: 14 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#101828' },
  modalClose: { color: '#334155', fontWeight: '600' },
  label: { fontSize: 12, color: '#64748B', marginBottom: 4, marginTop: 8 },
  input: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 14, color: '#101828' },
  pillsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  pill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14, borderWidth: 1, borderColor: '#CBD5E1', backgroundColor: '#FFF' },
  pillActive: { borderColor: '#1C273F', backgroundColor: '#1C273F' },
  pillText: { fontSize: 12, color: '#334155', fontWeight: '600' },
  pillTextActive: { color: '#FFF' },
  modalFooterRow: { flexDirection: 'row', gap: 10, marginTop: 14, marginBottom: 8 },
  secondaryBtn: { flex: 1, borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingVertical: 10 },
  secondaryBtnText: { color: '#334155', fontWeight: '600' },
  primaryBtn: { flex: 1, backgroundColor: '#1C273F', borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingVertical: 10 },
  primaryBtnText: { color: '#FFF', fontWeight: '700' },

  logoutBtn: { backgroundColor: '#DC2626', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 16, borderRadius: 12, gap: 10, elevation: 2 },
  logoutBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
});