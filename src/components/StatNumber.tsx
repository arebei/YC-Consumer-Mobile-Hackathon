import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { color, type } from '../theme';

/** A big `hero` number over an `overline` label, for example "7" over "BLOCKS". */
export function StatNumber({
  value,
  label,
  valueColor = color.text,
  style,
}: {
  value: string | number;
  label: string;
  valueColor?: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={style}>
      <Text style={[type.hero, styles.value, { color: valueColor }]}>{value}</Text>
      <Text style={[type.overline, styles.label]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  value: { fontVariant: ['tabular-nums'] },
  label: { color: color.textMuted },
});
