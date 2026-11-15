import { BlurView } from 'expo-blur';
import type { ReactNode } from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { blur, color, radius, size, space } from '../theme';

type Props = { children: ReactNode; style?: StyleProp<ViewStyle>; padded?: boolean };

/** Frosted card that floats over the map: target card, walk HUD, banner, chips. */
export function GlassCard({ children, style, padded = true }: Props) {
  return (
    <BlurView intensity={blur.intensity} tint={blur.tint} style={[styles.card, padded && styles.padded, style]}>
      {children}
    </BlurView>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: color.glass,
    borderRadius: radius.lg,
    borderWidth: size.hairline,
    borderColor: color.border,
    overflow: 'hidden',
  },
  padded: { padding: space.lg },
});
