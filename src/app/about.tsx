import Constants from 'expo-constants';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { ScreenHeader } from '../components/ScreenHeader';
import { WEBSITE_URL } from '../lib/links';
import { color, space, type } from '../theme';

const RULES = [
  'Walk a closed loop and you claim every block inside it.',
  'A block is as strong as the loop that claimed it.',
  'Take a block with a bigger loop than its strength.',
  'Hold a shop’s block longest this week to win its reward.',
  'Walks earn points. Spend them on shop offers.',
];

export default function About() {
  const insets = useSafeAreaInsets();
  const version = Constants.expoConfig?.version ?? '1.0.0';
  return (
    <View style={styles.fill}>
      <ScreenHeader title="About" />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + space.xxl }]}>
        <Text style={[type.hero, styles.text]}>Lasso</Text>
        <Text style={[type.body, styles.muted]}>A walking game for your neighbourhood. Local shops put up the prizes.</Text>
        <Card style={styles.card}>
          <Text style={[type.overline, styles.muted]}>How it works</Text>
          {RULES.map((r, i) => (
            <View key={r} style={styles.rule}>
              <Text style={[type.bodyStrong, styles.accent, styles.num]}>{i + 1}</Text>
              <Text style={[type.body, styles.text, styles.grow]}>{r}</Text>
            </View>
          ))}
        </Card>
        <Text style={[type.callout, styles.muted]}>
          Built at the YC Consumer Mobile Hackathon with Convex, Capy, Revyl and Whop
        </Text>
        <Button label="Open website" variant="secondary" onPress={() => Linking.openURL(WEBSITE_URL).catch(() => {})} />
        <Text style={[type.caption, styles.faint]} selectable>
          {WEBSITE_URL}
        </Text>
        <Text style={[type.caption, styles.faint]}>{`Version ${version}`}</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: color.bg },
  content: { paddingHorizontal: space.lg, gap: space.lg },
  card: { gap: space.md },
  rule: { flexDirection: 'row', gap: space.md },
  num: { minWidth: space.lg, fontVariant: ['tabular-nums'] },
  grow: { flex: 1 },
  text: { color: color.text },
  muted: { color: color.textMuted },
  faint: { color: color.textFaint },
  accent: { color: color.accent },
});
