import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { color, radius, size, space } from '../theme';

type Props = { children: ReactNode; style?: StyleProp<ViewStyle>; edgeColor?: string };

/** Solid list card. `edgeColor` draws a 3 px left edge (gold for rewards). */
export function Card({ children, style, edgeColor }: Props) {
  return (
    <View
      style={[
        styles.card,
        edgeColor ? { borderLeftWidth: size.edge, borderLeftColor: edgeColor } : null,
        style,
      ]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    borderWidth: size.hairline,
    borderColor: color.border,
    padding: space.lg,
  },
});
