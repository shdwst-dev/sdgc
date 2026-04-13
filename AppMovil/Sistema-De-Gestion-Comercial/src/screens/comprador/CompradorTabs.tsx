import React from 'react';
import { StyleSheet, View, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Home, Search, ShoppingCart, User } from 'lucide-react-native';
import Inicio from './dashboard-cm';
import Buscar from './buscador';
import Carrito from './carrito';
import Perfil from './perfil';

const Tab = createBottomTabNavigator();

export function CompradorTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#0f2f6f',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarShowLabel: true,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarStyle: styles.tabBar,
      }}
    >
      <Tab.Screen
        name="InicioTab"
        component={Inicio}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeIconContainer : null}>
              <Home color={color} size={24} />
            </View>
          ),
          tabBarLabel: 'Inicio'
        }}
      />
      <Tab.Screen
        name="BuscarTab"
        component={Buscar}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeIconContainer : null}>
              <Search color={color} size={24} />
            </View>
          ),
          tabBarLabel: 'Buscador'
        }}
      />
      <Tab.Screen
        name="CarritoTab"
        component={Carrito}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeIconContainer : null}>
              <ShoppingCart color={color} size={24} />
            </View>
          ),
          tabBarLabel: 'Carrito'
        }}
      />
      <Tab.Screen
        name="PerfilTab"
        component={Perfil}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeIconContainer : null}>
              <User color={color} size={24} />
            </View>
          ),
          tabBarLabel: 'Mi Perfil'
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 24 : 12,
    left: 20,
    right: 20,
    elevation: 8,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    height: 64,
    paddingBottom: Platform.OS === 'ios' ? 12 : 8,
    paddingTop: 8,
    borderTopWidth: 0,
    shadowColor: '#1C273F',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  tabBarLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 4,
  },
  activeIconContainer: {
    // Optional glass effect or indicator
  }
});