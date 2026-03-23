import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import InicioSesion from './src/screens/Login';
import { AdminTabs } from './src/screens/admin/AdminTabs';
import { CompradorTabs } from './src/screens/comprador/CompradorTabs';
import { RootStackParamList } from './src/navigation/types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
        }}
        initialRouteName="InicioSesion"
      >
        <Stack.Screen name="InicioSesion" component={InicioSesion} />
        <Stack.Screen name="dashboard-ad" component={AdminTabs} />
        <Stack.Screen name="dashboard-cm" component={CompradorTabs} />
      </Stack.Navigator>
      <StatusBar style="auto" />
    </NavigationContainer>
  );
}