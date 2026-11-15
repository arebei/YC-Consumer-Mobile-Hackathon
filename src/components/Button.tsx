import * as Haptics from 'expo-haptics';
import { useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { color, motion, opacity, radius, size, space, type } from '../theme';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

type Props = {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: 'large' | 'medium';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
};

const variants: Record<ButtonVariant, { bg: string; fg: string; border?: string }> = {
  primary: { bg: color.accent, fg: color.onAccent },
  secondary: { bg: color.surface, fg: color.text, border: color.border },
  ghost: { bg: 'transparent', fg: color.text },
  danger: { bg: color.danger, fg: color.text },
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  size: sz = 'large',
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
}: Props) {
  const scale = useRef(new Animated.Value(1)).current;
  const v = variants[variant];
  const inactive = disabled || loading;

  const animateTo = (to: number) =>
    Animated.timing(scale, { toValue: to, duration: motion.press, useNativeDriver: true }).start();

  return (
    <Animated.View
      style={[
        fullWidth && styles.fullWidth,
        { transform: [{ scale }], opacity: disabled ? opacity.disabled : 1 },
        style,
      ]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled: inactive, busy: loading }}
        disabled={inactive}
        onPressIn={() => {
          animateTo(opacity.pressedScale);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        }}
        onPressOut={() => animateTo(1)}
        onPress={onPress}
        style={[
          styles.base,
          {
            height: sz === 'large' ? size.buttonLarge : size.buttonMedium,
            backgroundColor: v.bg,
            borderColor: v.border ?? 'transparent',
            borderWidth: v.border ? size.hairline : 0,
          },
        ]}>
        {/* The label stays in the layout while loading so the width does not change. */}
        <Text style={[type.bodyStrong, { color: v.fg, opacity: loading ? 0 : 1 }]} numberOfLines={1}>
          {label}
        </Text>
        {loading && (
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <View style={styles.spinner}>
              <ActivityIndicator color={v.fg} />
            </View>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fullWidth: { alignSelf: 'stretch' },
  base: {
    borderRadius: radius.pill,
    paddingHorizontal: space.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinner: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
