import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { DollarSign, TrendingUp, TrendingDown, ShoppingCart, Package } from 'lucide-react-native';

const metricsData = [
  { title: 'Ventas Hoy', icon: DollarSign, value: '$12,450', change: '+12%' },
  { title: 'Ventas Mes', icon: TrendingUp, value: '$345,890', change: '+24%' },
  { title: 'Gastos Mes', icon: TrendingDown, value: '$89,250', change: '-8%' },
  { title: 'Pedidos', icon: ShoppingCart, value: '1,234', change: '+18%' },
];

const topProducts = [
  { name: 'Laptop Dell XPS 15', sales: '$45,890', units: 89 },
  { name: 'iPhone 14 Pro', sales: '$38,450', units: 76 },
  { name: 'Samsung 4K TV', sales: '$32,100', units: 45 },
];

export default function DashboardAdmin() {
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.headerTitle}>Dashboard Admin</Text>

      <View style={styles.grid}>
        {metricsData.map((item, index) => (
          <View key={index} style={styles.metricCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.metricTitle}>{item.title}</Text>
              <item.icon size={20} color="#fff" opacity={0.9} />
            </View>
            <Text style={styles.metricValue}>{item.value}</Text>
            <Text style={styles.metricChange}>{item.change}</Text>
          </View>
        ))}
      </View>

      <View style={styles.whiteCard}>
        <Text style={styles.sectionTitle}>Ingresos vs Gastos</Text>
        <View style={styles.chartPlaceholder}>
          <TrendingUp size={40} color="#1C273F" />
          <Text style={{ marginTop: 8, color: '#101828' }}>Gráfico de Líneas</Text>
        </View>
      </View>

      <View style={styles.whiteCard}>
        <Text style={styles.sectionTitle}>Top Productos</Text>
        {topProducts.map((product, index) => (
          <View key={index} style={styles.productRow}>
            <View style={styles.productIconContainer}>
              <Package size={20} color="#fff" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.productName}>{product.name}</Text>
              <Text style={styles.productUnits}>{product.units} unidades</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.productSales}>{product.sales}</Text>
              <TouchableOpacity>
                <Text style={styles.viewLink}>Ver</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1C273F',
    marginBottom: 20,
    marginTop: 40, 
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  metricCard: {
    backgroundColor: '#1C273F',
    width: '48%', 
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  metricTitle: {
    color: '#fff',
    fontSize: 12,
    opacity: 0.9,
  },
  metricValue: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  metricChange: {
    color: '#CBD5F5',
    fontSize: 12,
    marginTop: 4,
  },
  whiteCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#101828',
    marginBottom: 12,
  },
  chartPlaceholder: {
    height: 150,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  productIconContainer: {
    width: 40,
    height: 40,
    backgroundColor: '#1C273F',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#101828',
  },
  productUnits: {
    fontSize: 12,
    color: '#64748b',
  },
  productSales: {
    fontSize: 14,
    fontWeight: '600',
    color: '#101828',
  },
  viewLink: {
    fontSize: 12,
    color: '#1C273F',
    textDecorationLine: 'underline',
  },
});