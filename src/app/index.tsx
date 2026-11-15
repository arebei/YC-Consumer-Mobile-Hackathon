// F0 placeholder: shows the design-system pieces until Join and Home land in F1.
import { useQuery } from 'convex/react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { api } from '../../convex/_generated/api';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { GlassCard } from '../components/GlassCard';
import { Pill } from '../components/Pill';
import { useToast } from '../components/Toast';
import { color, playerColors, space, type } from '../theme';

export default function Index() {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const players = useQuery(api.players.list);

  return (
    <ScrollView
      style={styles.fill}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + space.xl, paddingBottom: insets.bottom + space.xl }]}>
      <Text style={[type.hero, styles.text]}>Lasso</Text>
      <Text style={[type.body, styles.muted]}>Walk a loop. Own the blocks inside it.</Text>

      <Card>
        <Text style={[type.overline, styles.muted]}>Convex</Text>
        <Text style={[type.bodyStrong, styles.text]}>
          {players === undefined ? 'Connecting…' : `Connected. ${players.length} players.`}
        </Text>
      </Card>

      <GlassCard>
        <Text style={[type.title2, styles.text]}>Glass card</Text>
        <View style={styles.row}>
          <Pill label="Neutral" />
          <Pill label="Accent" variant="accent" />
          <Pill label="Danger" variant="danger" />
          <Pill label="Reward" variant="reward" />
          <Pill label="Player" playerColor={playerColors[0]} />
        </View>
      </GlassCard>

      <Button label="Show toast" variant="secondary" onPress={() => toast.show('Week ended. 2 rewards created.')} />
      <Button label="Show error" variant="danger" size="medium" onPress={() => toast.error('Something went wrong. Try again.')} />
      <Button label="Loading" loading />
      <Button label="Disabled" disabled />
      <Button label="Ghost" variant="ghost" />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: color.bg },
  content: { paddingHorizontal: space.lg, gap: space.lg },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.md },
  text: { color: color.text },
  muted: { color: color.textMuted },
});
