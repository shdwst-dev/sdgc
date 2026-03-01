import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, StyleSheet, SafeAreaView, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';

const logo = require('../../assets/logosdgc.jpeg');

export default function InicioSesion() {
  const navigation = useNavigation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    if (email.trim() === '' || password.trim() === '') {
      Alert.alert("Campos vacíos", "Por favor llena todos los campos.");
      return;
    }
  }

  const handleAdminDashboard = () => {
    navigation.navigate('dashboard-ad');
  };

  const handleCompradorDashboard = () => {
    navigation.navigate('dashboard-cm');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.logoContainer}>
            <Image source={logo} style={styles.logo} />
            <Text style={styles.title}>Sistema de Gestión Comercial</Text>
          </View>

          <View style={styles.formContainer}>
            <Text style={styles.header}>Iniciar Sesión</Text>
            <Text style={styles.instructions}>Introduce tus datos para ingresar</Text>

            <TextInput
              style={styles.input}
              placeholder="Correo Electrónico"
              placeholderTextColor="#99A1AF"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <TextInput
              style={styles.input2}
              placeholder="Contraseña"
              placeholderTextColor="#99A1AF"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={true}
            />

            <TouchableOpacity
              style={styles.forgotPasswordButton}
            >
              <Text style={styles.forgotPasswordText}>¿Olvidaste tu contraseña?</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.buttonPrimary}
              onPress={handleLogin}
            >
              <Text style={styles.buttonPrimaryText}>Entrar</Text>
            </TouchableOpacity>

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.buttonSecondary}
                onPress={handleAdminDashboard}
              >
                <Text style={styles.buttonSecondaryText}>Admin</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.buttonSecondary}
                onPress={handleCompradorDashboard}
              >
                <Text style={styles.buttonSecondaryText}>Comprador</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.registerContainer}>
            <Text style={styles.termsText}>¿No tienes cuenta? </Text>
              <Text style={{ ...styles.termsLink, fontSize: 16, fontWeight: 'bold' }}>Regístrate aquí</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 25,
    paddingBottom: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logo: {
    width: 100,
    height: 100,
    resizeMode: 'contain',
    marginBottom: 10,
  },
  title: {
    color: '#1C273F',
    fontSize: 34,
    fontWeight: 'bold',
  },
  subtitle: {
    color: '#1C273F',
    fontSize: 13,
    fontWeight: '300',
    letterSpacing: 1,
  },
  formContainer: {
    width: '100%',
    marginBottom: 20,
  },
  header: {
    color: '#000000',
    fontSize: 26,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  instructions: {
    color: '#313131',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 25,
  },
  input: {
    backgroundColor: '#ffffff',
    color: '#000',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    marginBottom: 15,
  },
  input2: {
    backgroundColor: '#FFF',
    color: '#000',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    marginBottom: 12,
  },
  forgotPasswordButton: {
    alignItems: 'flex-end',
    marginBottom: 20,
  },
  forgotPasswordText: {
    color: '#1C273F',
    fontSize: 14,
    fontWeight: '600',
  },
  buttonPrimary: {
    backgroundColor: '#1C273F',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonPrimaryText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    gap: 12,
  },
  buttonSecondary: {
    backgroundColor: '#E8EEFB',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    flex: 1,
    borderWidth: 1,
    borderColor: '#1C273F',
  },
  buttonSecondaryText: {
    color: '#1C273F',
    fontSize: 14,
    fontWeight: '600',
  },
  registerContainer: {
    alignItems: 'center',
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  termsText: {
    color: '#414144',
    fontSize: 14,
  },
  termsLink: {
    color: '#1C273F',
  },
});