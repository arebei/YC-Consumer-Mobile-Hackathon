import { StyleSheet, Text, TextInput, View } from 'react-native';

import { charCount, clampChars } from '../lib/format';
import { color, radius, size, space, type } from '../theme';

type Props = { value: string; onChange: (text: string) => void; max: number };

/** "Your flag" input with an "12 / 40" counter. Counts emoji as one character and stops at `max`. */
export function FlagField({ value, onChange, max }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.labelRow}>
        <Text style={[type.callout, styles.label]}>Your flag</Text>
        <Text style={[type.caption, styles.counter]}>{`${charCount(value)} / ${max}`}</Text>
      </View>
      <TextInput
        accessibilityLabel="Your flag"
        value={value}
        onChangeText={(t) => onChange(clampChars(t, max))}
        placeholder="A message for whoever takes your blocks"
        placeholderTextColor={color.textFaint}
        style={[type.body, styles.input]}
        autoCorrect
        returnKeyType="done"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.xs },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  label: { color: color.text },
  counter: { color: color.textMuted, fontVariant: ['tabular-nums'] },
  input: {
    color: color.text,
    backgroundColor: color.surface,
    borderColor: color.border,
    borderWidth: size.hairline,
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
});
