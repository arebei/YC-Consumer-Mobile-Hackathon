import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { color, radius, size, space, type } from '../theme';

type Props = { icon: ReactNode; title: string; body?: string; action?: ReactNode };

/** Icon in a 64 px circle, a title2 line, one muted body line, at most one button. */
export function EmptyState({ icon, title, body, action }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.iconCircle}>{icon}</View>
      <Text style={[type.title2, styles.title]}>{title}</Text>
      {body ? <Text style={[type.body, styles.body]}>{body}</Text> : null}
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: space.md, paddingVertical: space.xl },
  iconCircle: {
    width: size.emptyIcon,
    height: size.emptyIcon,
    borderRadius: radius.pill,
    backgroundColor: color.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { color: color.text, textAlign: 'center' },
  body: { color: color.textMuted, textAlign: 'center' },
});
