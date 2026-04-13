import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ApiError, login } from '../services/auth';
import { RootStackParamList } from '../navigation/types';
import { setHash, setToken } from '../services/storage';
import { useToast } from '../components/Toast';

const logo = require('../../assets/logosdgc.jpeg');
type NavProp = NativeStackNavigationProp<RootStackParamList, 'LoginAdmin'>;

export default function LoginAdmin() {
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

      if (role.includes('admin')) {
        navigation.reset({ index: 0, routes: [{ name: 'dashboard-ad' }] });
        return;
      }

      if (role.includes('comprador')) {
        showToast({ message: 'Esta cuenta es de comprador. Usa el login de Comprador.', type: 'warning', duration: 4000 });
        return;
      }

      showToast({ message: 'Tu usuario no tiene acceso como administrador.', type: 'error' });
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
            <ArrowLeft size={22} color="#94A3B8" />
            <Text style={styles.backText}>Volver</Text>
          </TouchableOpacity>

          <View style={styles.logoContainer}>
            <Image source={logo} style={styles.logo} />
            <Text style={styles.title}>Panel Administrativo</Text>
            <Text style={styles.subtitle}>Acceso exclusivo para administradores</Text>
          </View>

          <View style={styles.formContainer}>
            <TextInput
              style={styles.input}
              placeholder="Correo Electrónico"
              placeholderTextColor="#64748B"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <TextInput
              style={styles.input}
              placeholder="Contraseña"
              placeholderTextColor="#64748B"
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
                <ActivityIndicator color="#1C273F" />
              ) : (
                <Text style={styles.buttonPrimaryText}>Acceder</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.infoContainer}>
            <Text style={styles.infoText}>
              Los administradores son creados por otro administrador desde la configuración.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0F172A' },
  container: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingBottom: 20 },

  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 20, alignSelf: 'flex-start' },
  backText: { color: '#94A3B8', fontSize: 15, fontWeight: '600' },

  logoContainer: { alignItems: 'center', marginBottom: 32 },
  logo: { width: 80, height: 80, resizeMode: 'contain', marginBottom: 12, borderRadius: 16 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#F1F5F9' },
  subtitle: { fontSize: 13, color: '#94A3B8', marginTop: 4 },

  formContainer: { width: '100%', marginBottom: 20 },
  input: {
    backgroundColor: '#1E293B',
    color: '#F1F5F9',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },

  buttonPrimary: {
    backgroundColor: '#E2E8F0',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonPrimaryText: { color: '#0F172A', fontSize: 16, fontWeight: 'bold' },

  infoContainer: { alignItems: 'center', paddingHorizontal: 20, marginTop: 16 },
  infoText: { color: '#475569', fontSize: 12, textAlign: 'center', lineHeight: 18 },
});
