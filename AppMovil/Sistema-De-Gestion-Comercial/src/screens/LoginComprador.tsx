import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ApiError, login } from '../services/auth';
import { RootStackParamList } from '../navigation/types';
import { setHash, setToken } from '../services/storage';
import { useToast } from '../components/Toast';

const logo = require('../../assets/logosdgc.jpeg');
type NavProp = NativeStackNavigationProp<RootStackParamList, 'LoginComprador'>;

export default function LoginComprador() {
  const navigation = useNavigation<NavProp>();
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const normalizeRole = (role: string) =>
    role.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  const handleLogin = async () => {
    if (isLoading) return;

    if (email.trim() === '' || password.trim() === '') {
      showToast({ message: 'Por favor llena todos los campos.', type: 'warning' });
      return;
    }

    try {
      setIsLoading(true);
      const response = await login(email.trim(), password.trim());
      await setToken(response.token);
      await setHash(response.hash ?? null);

      const role = normalizeRole(response.usuario.rol ?? '');

      if (role.includes('comprador')) {
        navigation.reset({ index: 0, routes: [{ name: 'dashboard-cm' }] });
        return;
      }

      // If admin tries to login from comprador screen
      if (role.includes('admin')) {
        showToast({ message: 'Esta cuenta es de administrador. Usa el login de Admin.', type: 'warning', duration: 4000 });
        return;
      }

      showToast({ message: 'Tu usuario no tiene acceso como comprador.', type: 'error' });
    } catch (error) {
      if (error instanceof ApiError) {
        showToast({ message: error.message, type: 'error' });
      } else {
        showToast({ message: 'No se pudo conectar al servidor. Verifica tu conexión.', type: 'error', duration: 4000 });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <ArrowLeft size={22} color="#3B82F6" />
            <Text style={styles.backText}>Volver</Text>
          </TouchableOpacity>

          <View style={styles.logoContainer}>
            <Image source={logo} style={styles.logo} />
            <Text style={styles.title}>Bienvenido</Text>
            <Text style={styles.subtitle}>Inicia sesión para comprar</Text>
          </View>

          <View style={styles.formContainer}>
            <TextInput
              style={styles.input}
              placeholder="Correo Electrónico"
              placeholderTextColor="#94A3B8"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <TextInput
              style={styles.input}
              placeholder="Contraseña"
              placeholderTextColor="#94A3B8"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            <TouchableOpacity
              style={styles.buttonPrimary}
              onPress={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonPrimaryText}>Iniciar Sesión</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.registerContainer}>
            <Text style={styles.registerText}>¿No tienes cuenta? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Registro')}>
              <Text style={styles.registerLink}>Regístrate aquí</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  container: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingBottom: 20 },

  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 20, alignSelf: 'flex-start' },
  backText: { color: '#3B82F6', fontSize: 15, fontWeight: '600' },

  logoContainer: { alignItems: 'center', marginBottom: 32 },
  logo: { width: 80, height: 80, resizeMode: 'contain', marginBottom: 12 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#1E40AF' },
  subtitle: { fontSize: 14, color: '#64748B', marginTop: 4 },

  formContainer: { width: '100%', marginBottom: 20 },
  input: {
    backgroundColor: '#F8FAFC',
    color: '#0F172A',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  buttonPrimary: {
    backgroundColor: '#3B82F6',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonPrimaryText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },

  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
  },
  registerText: { color: '#64748B', fontSize: 14 },
  registerLink: { color: '#3B82F6', fontSize: 14, fontWeight: 'bold' },
});
