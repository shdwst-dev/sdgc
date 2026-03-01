import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Home, Search, ShoppingCart, User } from 'lucide-react-native';
import Inicio from './dashboard-cm';
import Buscar from './buscador';
import Carrito from './carrito';
import Perfil from './perfil';

const Tab = createBottomTabNavigator();

export function CompradorTabs() {
  return (
    <Tab.Navigator screenOptions={{ 
      tabBarActiveTintColor: '#1C273F', 
      headerShown: false 
    }}>
      <Tab.Screen name="InicioTab" component={Inicio} 
        options={{ 
          tabBarIcon: ({color}) => <Home color={color} size={24}/>,
          tabBarLabel: 'Inicio'
        }} />
      <Tab.Screen name="BuscarTab" component={Buscar} 
        options={{ 
          tabBarIcon: ({color}) => <Search color={color} size={24}/>,
          tabBarLabel: 'Buscar'
        }} />
      <Tab.Screen name="CarritoTab" component={Carrito} 
        options={{ 
          tabBarIcon: ({color}) => <ShoppingCart color={color} size={24}/>,
          tabBarLabel: 'Carrito'
        }} />
      <Tab.Screen name="PerfilTab" component={Perfil} 
        options={{ 
          tabBarIcon: ({color}) => <User color={color} size={24}/>,
          tabBarLabel: 'Perfil'
        }} />
    </Tab.Navigator>
  );
}