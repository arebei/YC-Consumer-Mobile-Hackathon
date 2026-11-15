import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { color, radius, size, space, type } from '../theme';

export type PillVariant = 'neutral' | 'accent' | 'danger' | 'reward';

type Props = {
  label: string;
  variant?: PillVariant;
  /** A player colour; overrides `variant`. */
  playerColor?: string;
  icon?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

const variants: Record<PillVariant, { bg: string; fg: string; border: string }> = {
  neutral: { bg: color.elevated, fg: color.text, border: color.border },
  accent: { bg: color.accent, fg: color.onAccent, border: color.accent },
  danger: { bg: color.danger, fg: color.text, border: color.danger },
  reward: { bg: color.reward, fg: color.onAccent, border: color.reward },
};

export function Pill({ label, variant = 'neutral', playerColor, icon, style }: Props) {
  const v = playerColor ? { bg: playerColor, fg: color.text, border: playerColor } : variants[variant];
  return (
    <View style={[styles.pill, { backgroundColor: v.bg, borderColor: v.border }, style]}>
      {icon}
      <Text style={[type.caption, { color: v.fg }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    height: size.pill,
    borderRadius: radius.pill,
    borderWidth: size.hairline,
    paddingHorizontal: space.md,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: space.xs,
  },
});
