import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { LayoutDashboard, Package, TrendingUp, Bell, Settings } from 'lucide-react-native';
import DashboardAdmin from './dashboard-ad';
import Inventario from './inventario';
import Ventas from './ventas';
import Alertas from './alertas';
import Configuracion from './config';

const Tab = createBottomTabNavigator();

export function AdminTabs() {
  return (
    <Tab.Navigator screenOptions={{ 
      tabBarActiveTintColor: '#1C273F',
      tabBarStyle: { backgroundColor: '#fff' },
      headerShown: false
    }}>
      <Tab.Screen name="DashboardTab" component={DashboardAdmin} 
        options={{ 
          tabBarIcon: ({color}) => <LayoutDashboard color={color} size={24}/>,
          tabBarLabel: 'Dashboard'
        }} />
      <Tab.Screen name="InventarioTab" component={Inventario} 
        options={{ 
          tabBarIcon: ({color}) => <Package color={color} size={24}/>,
          tabBarLabel: 'Inventario'
        }} />
      <Tab.Screen name="VentasTab" component={Ventas} 
        options={{ 
          tabBarIcon: ({color}) => <TrendingUp color={color} size={24}/>,
          tabBarLabel: 'Ventas'
        }} />
      <Tab.Screen name="AlertasTab" component={Alertas} 
        options={{ 
          tabBarIcon: ({color}) => <Bell color={color} size={24}/>,
          tabBarLabel: 'Alertas'
        }} />
      <Tab.Screen name="ConfigTab" component={Configuracion} 
        options={{ 
          tabBarIcon: ({color}) => <Settings color={color} size={24}/>,
          tabBarLabel: 'Config'
        }} />
    </Tab.Navigator>
  );
}