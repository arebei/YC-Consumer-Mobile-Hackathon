import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { color, motion, size, space, type } from '../theme';
import { GlassCard } from './GlassCard';

type ToastKind = 'info' | 'error';
type ToastState = { id: number; message: string; kind: ToastKind } | null;
type ToastApi = { show: (message: string) => void; error: (message: string) => void; hide: () => void };

const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}

/** One-line glass toast at the top. Info toasts last 3 s; errors stay until dismissed. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState>(null);
  const seq = useRef(0);
  const insets = useSafeAreaInsets();

  const hide = useCallback(() => setToast(null), []);
  const show = useCallback((message: string) => setToast({ id: ++seq.current, message, kind: 'info' }), []);
  const error = useCallback((message: string) => setToast({ id: ++seq.current, message, kind: 'error' }), []);

  useEffect(() => {
    if (!toast || toast.kind === 'error') return;
    const t = setTimeout(() => setToast((cur) => (cur?.id === toast.id ? null : cur)), motion.toast);
    return () => clearTimeout(t);
  }, [toast]);

  return (
    <ToastContext.Provider value={{ show, error, hide }}>
      {children}
      {toast && (
        <View pointerEvents="box-none" style={[styles.wrap, { top: insets.top + space.sm }]}>
          <GlassCard style={[styles.card, toast.kind === 'error' && styles.error]}>
            <Text style={[type.callout, styles.text]} numberOfLines={1}>
              {toast.message}
            </Text>
            {toast.kind === 'error' && (
              <Pressable accessibilityRole="button" accessibilityLabel="Dismiss" onPress={hide} hitSlop={space.sm}>
                <Text style={[type.caption, styles.dismiss]}>Dismiss</Text>
              </Pressable>
            )}
          </GlassCard>
        </View>
      )}
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: space.lg, right: space.lg, alignItems: 'center' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.md,
    alignSelf: 'stretch',
  },
  error: { borderLeftWidth: size.edge, borderLeftColor: color.danger },
  text: { color: color.text, flex: 1 },
  dismiss: { color: color.accent },
});
