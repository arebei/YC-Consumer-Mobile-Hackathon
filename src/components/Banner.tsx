import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

import { useReduceMotion } from '../lib/motion';
import { color, size, space, type } from '../theme';
import { GlassCard } from './GlassCard';

type Props = {
  icon: ReactNode;
  /** Text or nested Text, up to three lines. */
  children: ReactNode;
  onDismiss: () => void;
  variant?: 'neutral' | 'danger';
};

const SLIDE_MS = 350;
const SLIDE_FROM = -160;

/** Glass banner that slides down from the top, with a "Dismiss" button. */
export function Banner({ icon, children, onDismiss, variant = 'neutral' }: Props) {
  const reduce = useReduceMotion();
  const y = useRef(new Animated.Value(reduce ? 0 : SLIDE_FROM)).current;

  useEffect(() => {
    if (reduce) {
      y.setValue(0);
      return;
    }
    Animated.timing(y, { toValue: 0, duration: SLIDE_MS, useNativeDriver: true }).start();
  }, [reduce, y]);

  return (
    <Animated.View style={{ transform: [{ translateY: y }] }}>
      <GlassCard style={[styles.card, variant === 'danger' && styles.danger]}>
        <View style={styles.icon}>{icon}</View>
        <View style={styles.body}>
          <Text style={[type.callout, styles.text]} numberOfLines={3}>
            {children}
          </Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Dismiss" onPress={onDismiss} hitSlop={space.sm}>
          <Text style={[type.caption, styles.dismiss]}>Dismiss</Text>
        </Pressable>
      </GlassCard>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  danger: { borderLeftWidth: size.edge, borderLeftColor: color.danger },
  icon: { paddingTop: space.xxs },
  body: { flex: 1 },
  text: { color: color.text },
  dismiss: { color: color.accent, paddingTop: space.xxs },
});
