import { Pressable, StyleSheet, Text } from 'react-native';

import { color, size, space, type } from '../theme';
import { X } from './icons';

/** Header close control: the X icon plus a visible "Close" label (spec: every button has words). */
export function CloseButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Close"
      onPress={onPress}
      hitSlop={space.md}
      style={({ pressed }) => [styles.btn, pressed && styles.pressed]}>
      <X size={size.icon} strokeWidth={size.iconStroke} color={color.text} />
      <Text style={[type.bodyStrong, styles.text]}>Close</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { flexDirection: 'row', alignItems: 'center', gap: space.xs, paddingVertical: space.xs },
  pressed: { opacity: 0.6 },
  text: { color: color.text },
});
