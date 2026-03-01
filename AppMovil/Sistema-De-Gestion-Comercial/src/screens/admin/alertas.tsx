import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, StatusBar } from 'react-native';
import { AlertTriangle, CheckCircle } from 'lucide-react-native';

interface AppAlert {
  id: string;
  type: 'warning' | 'task';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
}

const alertsData: AppAlert[] = [
  { id: '1', type: 'warning', title: 'Stock Bajo: Laptop Dell XPS 15', description: 'Solo quedan 5 unidades', priority: 'high' },
  { id: '2', type: 'task', title: 'Aprobar Pedido #123', description: 'Pedido pendiente de aprobación', priority: 'high' },
  { id: '3', type: 'warning', title: 'Stock Bajo: iPhone 14 Pro', description: 'Solo quedan 3 unidades', priority: 'high' },
  { id: '4', type: 'task', title: 'Revisar Factura #456', description: 'Factura con inconsistencias', priority: 'medium' },
  { id: '5', type: 'warning', title: 'Producto Vencido: Producto X', description: 'Fecha de vencimiento próxima', priority: 'medium' },
  { id: '6', type: 'task', title: 'Actualizar Precios', description: 'Actualización trimestral pendiente', priority: 'low' },
];

export default function Alertas() {
  const highPriority = alertsData.filter(a => a.priority === 'high');
  const mediumPriority = alertsData.filter(a => a.priority === 'medium');
  const lowPriority = alertsData.filter(a => a.priority === 'low');

  const handleAction = (title: string) => {
    Alert.alert("Acción", `Iniciando proceso para: ${title}`);
  };

  const renderAlertCard = (alert: AppAlert) => (
    <View key={alert.id} style={styles.alertCard}>
      <View style={styles.alertCardHeader}>
        <View style={[
          styles.iconContainer, 
          { backgroundColor: alert.type === 'warning' ? '#FEE2E2' : '#DBEAFE' }
        ]}>
          {alert.type === 'warning' 
            ? <AlertTriangle size={20} color="#DC2626" /> 
            : <CheckCircle size={20} color="#2563EB" />
          }
        </View>
        <View style={styles.textContent}>
          <Text style={styles.alertTitle}>{alert.title}</Text>
          <Text style={styles.alertDescription}>{alert.description}</Text>
        </View>
      </View>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={styles.primaryBtn}
          onPress={() => handleAction(alert.title)}
        >
          <Text style={styles.primaryBtnText}>
            {alert.type === 'warning' ? 'Revisar' : 'Completar'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryBtn}>
          <Text style={styles.secondaryBtnText}>Más tarde</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <Text style={styles.headerTitle}>Alertas y Tareas</Text>

      <View style={styles.summaryCard}>
        <View style={styles.summaryTop}>
          <Text style={styles.summaryLabel}>Alertas Pendientes</Text>
          <AlertTriangle size={20} color="#FFF" />
        </View>
        <Text style={styles.summaryValue}>{alertsData.length}</Text>
        <Text style={styles.summaryDetail}>
          {highPriority.length} alta prioridad • {mediumPriority.length} media
        </Text>
      </View>

      {highPriority.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.dot, { backgroundColor: '#EF4444' }]} />
            <Text style={styles.sectionTitle}>Alta Prioridad</Text>
          </View>
          {highPriority.map(renderAlertCard)}
        </View>
      )}

      {mediumPriority.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.dot, { backgroundColor: '#F59E0B' }]} />
            <Text style={styles.sectionTitle}>Prioridad Media</Text>
          </View>
          {mediumPriority.map(renderAlertCard)}
        </View>
      )}

      {lowPriority.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.dot, { backgroundColor: '#3B82F6' }]} />
            <Text style={styles.sectionTitle}>Baja Prioridad</Text>
          </View>
          {lowPriority.map(renderAlertCard)}
        </View>
      )}
      
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB', padding: 16 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#1C273F', marginBottom: 20, marginTop: 40 },
  summaryCard: { backgroundColor: '#1C273F', borderRadius: 12, padding: 16, marginBottom: 24 },
  summaryTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  summaryLabel: { color: '#FFF', fontSize: 14, opacity: 0.9 },
  summaryValue: { color: '#FFF', fontSize: 32, fontWeight: 'bold' },
  summaryDetail: { color: '#FFF', fontSize: 12, opacity: 0.75, marginTop: 4 },
  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: '#101828' },
  alertCard: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 12 },
  alertCardHeader: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  iconContainer: { width: 40, height: 40, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  textContent: { flex: 1 },
  alertTitle: { fontSize: 14, fontWeight: '600', color: '#101828', marginBottom: 4 },
  alertDescription: { fontSize: 12, color: '#6B7280' },
  buttonContainer: { flexDirection: 'row', gap: 8 },
  primaryBtn: { backgroundColor: '#1C273F', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6 },
  primaryBtnText: { color: '#FFF', fontSize: 12, fontWeight: '600' },
  secondaryBtn: { borderWidth: 1, borderColor: '#D1D5DB', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6 },
  secondaryBtnText: { color: '#101828', fontSize: 12 }
});