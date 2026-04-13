import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ApiError, register } from '../services/auth';
import { RootStackParamList } from '../navigation/types';
import { useToast } from '../components/Toast';

type NavProp = NativeStackNavigationProp<RootStackParamList, 'Registro'>;

export default function Registro() {
  const navigation = useNavigation<NavProp>();
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);

  // Step 1: Personal data
  const [nombre, setNombre] = useState('');
  const [apellidoPaterno, setApellidoPaterno] = useState('');
  const [apellidoMaterno, setApellidoMaterno] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [confirmarContrasena, setConfirmarContrasena] = useState('');

  // Step 2: Address data
  const [calle, setCalle] = useState('');
  const [numExt, setNumExt] = useState('');
  const [numInt, setNumInt] = useState('');
  const [colonia, setColonia] = useState('');
  const [municipio, setMunicipio] = useState('');
  const [estado, setEstado] = useState('');
  const [cp, setCp] = useState('');

  const validateStep1 = (): boolean => {
    if (!nombre.trim() || !apellidoPaterno.trim() || !telefono.trim() || !email.trim() || !contrasena.trim()) {
      showToast({ message: 'Completa todos los campos obligatorios.', type: 'warning' });
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      showToast({ message: 'Ingresa un correo electrónico válido.', type: 'warning' });
      return false;
    }

    if (contrasena.length < 8) {
      showToast({ message: 'La contraseña debe tener al menos 8 caracteres.', type: 'warning' });
      return false;
    }

    if (contrasena !== confirmarContrasena) {
      showToast({ message: 'Las contraseñas no coinciden.', type: 'error' });
      return false;
    }

    return true;
  };

  const validateStep2 = (): boolean => {
    if (!calle.trim() || !numExt.trim() || !colonia.trim() || !municipio.trim() || !estado.trim()) {
      showToast({ message: 'Completa todos los campos obligatorios de dirección.', type: 'warning' });
      return false;
    }

    const numExtParsed = parseInt(numExt, 10);
    if (isNaN(numExtParsed) || numExtParsed < 1) {
      showToast({ message: 'El número exterior debe ser un número válido.', type: 'warning' });
      return false;
    }

    return true;
  };

  const handleNext = () => {
    if (validateStep1()) {
      setStep(2);
    }
  };

  const handleRegister = async () => {
    if (isLoading) return;
    if (!validateStep2()) return;

    try {
      setIsLoading(true);
      await register({
        nombre: nombre.trim(),
        apellido_paterno: apellidoPaterno.trim(),
        apellido_materno: apellidoMaterno.trim() || undefined,
        telefono: telefono.trim(),
        email: email.trim(),
        contrasena: contrasena,
        calle: calle.trim(),
        num_ext: parseInt(numExt, 10),
        num_int: numInt.trim() ? parseInt(numInt, 10) : undefined,
        colonia: colonia.trim(),
        municipio: municipio.trim(),
        estado: estado.trim(),
        cp: cp.trim() ? parseInt(cp, 10) : undefined,
      });

      showToast({ message: '¡Cuenta creada exitosamente! Ya puedes iniciar sesión.', type: 'success', duration: 4000 });
      navigation.navigate('LoginComprador');
    } catch (error) {
      if (error instanceof ApiError) {
        showToast({ message: error.message, type: 'error', duration: 4000 });
      } else {
        showToast({ message: 'No se pudo completar el registro. Intenta nuevamente.', type: 'error' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => (step === 2 ? setStep(1) : navigation.goBack())}
          >
            <ArrowLeft size={22} color="#3B82F6" />
            <Text style={styles.backText}>{step === 2 ? 'Datos personales' : 'Volver'}</Text>
          </TouchableOpacity>

          <View style={styles.header}>
            <Text style={styles.title}>Crear Cuenta</Text>
            <Text style={styles.subtitle}>
              {step === 1 ? 'Paso 1 de 2 — Datos personales' : 'Paso 2 de 2 — Dirección'}
            </Text>
          </View>

          {/* Step indicator */}
          <View style={styles.stepRow}>
            <View style={[styles.stepDot, styles.stepDotActive]} />
            <View style={[styles.stepLine, step === 2 && styles.stepLineActive]} />
            <View style={[styles.stepDot, step === 2 && styles.stepDotActive]} />
          </View>

          {step === 1 ? (
            <View style={styles.form}>
              <Text style={styles.label}>Nombre *</Text>
              <TextInput style={styles.input} value={nombre} onChangeText={setNombre} placeholder="Tu nombre" placeholderTextColor="#94A3B8" />

              <Text style={styles.label}>Apellido Paterno *</Text>
              <TextInput style={styles.input} value={apellidoPaterno} onChangeText={setApellidoPaterno} placeholder="Apellido paterno" placeholderTextColor="#94A3B8" />

              <Text style={styles.label}>Apellido Materno</Text>
              <TextInput style={styles.input} value={apellidoMaterno} onChangeText={setApellidoMaterno} placeholder="Apellido materno (opcional)" placeholderTextColor="#94A3B8" />

              <Text style={styles.label}>Teléfono *</Text>
              <TextInput style={styles.input} value={telefono} onChangeText={setTelefono} placeholder="10 dígitos" placeholderTextColor="#94A3B8" keyboardType="phone-pad" />

              <Text style={styles.label}>Correo Electrónico *</Text>
              <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="correo@ejemplo.com" placeholderTextColor="#94A3B8" keyboardType="email-address" autoCapitalize="none" />

              <Text style={styles.label}>Contraseña *</Text>
              <TextInput style={styles.input} value={contrasena} onChangeText={setContrasena} placeholder="Mínimo 8 caracteres" placeholderTextColor="#94A3B8" secureTextEntry />

              <Text style={styles.label}>Confirmar Contraseña *</Text>
              <TextInput style={styles.input} value={confirmarContrasena} onChangeText={setConfirmarContrasena} placeholder="Repite tu contraseña" placeholderTextColor="#94A3B8" secureTextEntry />

              <TouchableOpacity style={styles.btnPrimary} onPress={handleNext}>
                <Text style={styles.btnPrimaryText}>Siguiente →</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.form}>
              <Text style={styles.label}>Calle *</Text>
              <TextInput style={styles.input} value={calle} onChangeText={setCalle} placeholder="Nombre de la calle" placeholderTextColor="#94A3B8" />

              <View style={styles.row}>
                <View style={styles.halfInput}>
                  <Text style={styles.label}>No. Exterior *</Text>
                  <TextInput style={styles.input} value={numExt} onChangeText={setNumExt} placeholder="No." placeholderTextColor="#94A3B8" keyboardType="number-pad" />
                </View>
                <View style={styles.halfInput}>
                  <Text style={styles.label}>No. Interior</Text>
                  <TextInput style={styles.input} value={numInt} onChangeText={setNumInt} placeholder="Opc." placeholderTextColor="#94A3B8" keyboardType="number-pad" />
                </View>
              </View>

              <Text style={styles.label}>Colonia *</Text>
              <TextInput style={styles.input} value={colonia} onChangeText={setColonia} placeholder="Colonia" placeholderTextColor="#94A3B8" />

              <View style={styles.row}>
                <View style={styles.halfInput}>
                  <Text style={styles.label}>Municipio *</Text>
                  <TextInput style={styles.input} value={municipio} onChangeText={setMunicipio} placeholder="Municipio" placeholderTextColor="#94A3B8" />
                </View>
                <View style={styles.halfInput}>
                  <Text style={styles.label}>Estado *</Text>
                  <TextInput style={styles.input} value={estado} onChangeText={setEstado} placeholder="Estado" placeholderTextColor="#94A3B8" />
                </View>
              </View>

              <Text style={styles.label}>Código Postal</Text>
              <TextInput style={styles.input} value={cp} onChangeText={setCp} placeholder="00000 (opcional)" placeholderTextColor="#94A3B8" keyboardType="number-pad" />

              <TouchableOpacity style={styles.btnPrimary} onPress={handleRegister} disabled={isLoading}>
                {isLoading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.btnPrimaryText}>Crear Cuenta</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>¿Ya tienes cuenta? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('LoginComprador')}>
              <Text style={styles.loginLink}>Iniciar Sesión</Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 30 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  container: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 20 },

  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, marginBottom: 16, alignSelf: 'flex-start' },
  backText: { color: '#3B82F6', fontSize: 15, fontWeight: '600' },

  header: { alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#1E40AF' },
  subtitle: { fontSize: 13, color: '#64748B', marginTop: 4 },

  stepRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 24, gap: 0 },
  stepDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#E2E8F0' },
  stepDotActive: { backgroundColor: '#3B82F6' },
  stepLine: { width: 60, height: 3, backgroundColor: '#E2E8F0' },
  stepLineActive: { backgroundColor: '#3B82F6' },

  form: { width: '100%' },
  label: { fontSize: 13, fontWeight: '600', color: '#334155', marginBottom: 6, marginTop: 8 },
  input: {
    backgroundColor: '#F8FAFC',
    color: '#0F172A',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  row: { flexDirection: 'row', gap: 12 },
  halfInput: { flex: 1 },

  btnPrimary: {
    backgroundColor: '#3B82F6',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  btnPrimaryText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },

  loginContainer: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  loginText: { color: '#64748B', fontSize: 14 },
  loginLink: { color: '#3B82F6', fontSize: 14, fontWeight: 'bold' },
});
