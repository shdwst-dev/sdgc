/**
 * Toast.tsx — Sistema de notificaciones Toast nativo.
 *
 * Provee un ToastProvider (Context) y un hook useToast()
 * para mostrar notificaciones temporales sin Alert.alert().
 */

import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CheckCircle, AlertTriangle, Info, XCircle, X } from 'lucide-react-native';

// ─── Types ───────────────────────────────────────────────────────────────────

type ToastType = 'success' | 'error' | 'warning' | 'info';

type ToastConfig = {
  message: string;
  type?: ToastType;
  duration?: number;
};

type ToastContextType = {
  showToast: (config: ToastConfig) => void;
};

// ─── Theme ───────────────────────────────────────────────────────────────────

const THEME: Record<ToastType, { bg: string; border: string; icon: string; text: string }> = {
  success: { bg: '#F0FDF4', border: '#86EFAC', icon: '#16A34A', text: '#15803D' },
  error:   { bg: '#FEF2F2', border: '#FECACA', icon: '#DC2626', text: '#991B1B' },
  warning: { bg: '#FFFBEB', border: '#FDE68A', icon: '#D97706', text: '#92400E' },
  info:    { bg: '#EFF6FF', border: '#BFDBFE', icon: '#2563EB', text: '#1E40AF' },
};

const ICONS: Record<ToastType, React.ComponentType<{ size: number; color: string }>> = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

// ─── Context ─────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextType>({ showToast: () => {} });

export function useToast(): ToastContextType {
  return useContext(ToastContext);
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [type, setType] = useState<ToastType>('info');
  const translateY = useRef(new Animated.Value(-120)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hideToast = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateY, { toValue: -120, duration: 300, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => setVisible(false));
  }, [translateY, opacity]);

  const showToast = useCallback(
    (config: ToastConfig) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      setMessage(config.message);
      setType(config.type ?? 'info');
      setVisible(true);

      translateY.setValue(-120);
      opacity.setValue(0);

      Animated.parallel([
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, damping: 15, stiffness: 120 }),
        Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();

      timerRef.current = setTimeout(() => {
        hideToast();
      }, config.duration ?? 3000);
    },
    [translateY, opacity, hideToast],
  );

  const theme = THEME[type];
  const IconComponent = ICONS[type];

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {visible && (
        <Animated.View
          style={[
            styles.container,
            {
              backgroundColor: theme.bg,
              borderColor: theme.border,
              transform: [{ translateY }],
              opacity,
            },
          ]}
          pointerEvents="box-none"
        >
          <View style={styles.content}>
            <IconComponent size={22} color={theme.icon} />
            <Text style={[styles.message, { color: theme.text }]} numberOfLines={3}>
              {message}
            </Text>
            <TouchableOpacity onPress={hideToast} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <X size={18} color={theme.text} />
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    zIndex: 9999,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  message: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
});
