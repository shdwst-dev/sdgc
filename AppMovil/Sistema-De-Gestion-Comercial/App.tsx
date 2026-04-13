import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ToastProvider } from './src/components/Toast';
import RoleSelect from './src/screens/RoleSelect';
import LoginComprador from './src/screens/LoginComprador';
import LoginAdmin from './src/screens/LoginAdmin';
import Registro from './src/screens/Registro';
import { AdminTabs } from './src/screens/admin/AdminTabs';
import { CompradorTabs } from './src/screens/comprador/CompradorTabs';
import MisPedidos from './src/screens/comprador/MisPedidos';
import DetallePedido from './src/screens/comprador/DetallePedido';
import DetalleProducto from './src/screens/comprador/DetalleProducto';
import { RootStackParamList } from './src/navigation/types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <ToastProvider>
      <NavigationContainer>
        <Stack.Navigator
          screenOptions={{ headerShown: false }}
          initialRouteName="RoleSelect"
        >
          <Stack.Screen name="RoleSelect" component={RoleSelect} />
          <Stack.Screen name="LoginComprador" component={LoginComprador} />
          <Stack.Screen name="LoginAdmin" component={LoginAdmin} />
          <Stack.Screen name="Registro" component={Registro} />
          <Stack.Screen name="dashboard-ad" component={AdminTabs} />
          <Stack.Screen name="dashboard-cm" component={CompradorTabs} />
          <Stack.Screen name="MisPedidos" component={MisPedidos} />
          <Stack.Screen name="DetallePedido" component={DetallePedido} />
          <Stack.Screen name="DetalleProducto" component={DetalleProducto} />
        </Stack.Navigator>
        <StatusBar style="auto" />
      </NavigationContainer>
    </ToastProvider>
  );
}