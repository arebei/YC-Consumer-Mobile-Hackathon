import { useQuery } from 'convex/react';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { api } from '../../convex/_generated/api';
import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { Medal } from '../components/icons';
import { PlayerDot } from '../components/PlayerDot';
import { ScreenHeader } from '../components/ScreenHeader';
import { Skeleton } from '../components/Skeleton';
import { blocks, pts } from '../lib/format';
import { usePlayer } from '../lib/player';
import { color, radius, size, space, type } from '../theme';

type Tab = 'blocks' | 'points';
type Row = { playerId: string; name: string; color: string; value: string };

export default function Ranking() {
  const insets = useSafeAreaInsets();
  const { player } = usePlayer();
  const [tab, setTab] = useState<Tab>('blocks');
  const byBlocks = useQuery(api.leaderboard.top);
  const byPoints = useQuery(api.leaderboard.points);

  const rows: Row[] | undefined =
    tab === 'blocks'
      ? byBlocks?.map((r) => ({ playerId: r.playerId, name: r.name, color: r.color, value: blocks(r.blocks) }))
      : byPoints?.map((r) => ({ playerId: r.playerId, name: r.name, color: r.color, value: pts(r.points) }));

  return (
    <View style={styles.fill}>
      <ScreenHeader title="Ranking" />
      <View style={styles.tabs}>
        {(['blocks', 'points'] as const).map((t) => (
          <Pressable
            key={t}
            accessibilityRole="tab"
            accessibilityLabel={t === 'blocks' ? 'Blocks' : 'Points'}
            accessibilityState={{ selected: tab === t }}
            onPress={() => setTab(t)}
            style={[styles.tab, tab === t && styles.tabOn]}>
            <Text style={[type.bodyStrong, tab === t ? styles.onAccent : styles.text]}>
              {t === 'blocks' ? 'Blocks' : 'Points'}
            </Text>
          </Pressable>
        ))}
      </View>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + space.xxl }]}>
        {rows === undefined ? (
          <Skeleton height={200} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<Medal size={size.icon} strokeWidth={size.iconStroke} color={color.accent} />}
            title="Nobody on the board yet."
            body="Walk a loop to put your name here."
          />
        ) : (
          <Card style={styles.card}>
            {rows.map((r, i) => {
              const me = r.playerId === player?.playerId;
              return (
                <View key={r.playerId} style={[styles.row, me && styles.rowMe]}>
                  <Text style={[type.title2, styles.rank, i === 0 ? styles.reward : styles.muted]}>{i + 1}</Text>
                  <PlayerDot playerColor={r.color} />
                  <Text style={[type.bodyStrong, styles.text, styles.grow]} numberOfLines={1}>
                    {me ? `${r.name} (you)` : r.name}
                  </Text>
                  <Text style={[type.bodyStrong, me ? styles.accent : styles.text, styles.tabular]}>{r.value}</Text>
                </View>
              );
            })}
          </Card>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: color.bg },
  tabs: { flexDirection: 'row', gap: space.sm, paddingHorizontal: space.lg, paddingBottom: space.md },
  tab: {
    flex: 1,
    height: size.buttonMedium,
    borderRadius: radius.pill,
    borderWidth: size.hairline,
    borderColor: color.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabOn: { backgroundColor: color.accent, borderColor: color.accent },
  content: { paddingHorizontal: space.lg, gap: space.md },
  card: { gap: space.xs, padding: space.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderRadius: radius.md },
  rowMe: { backgroundColor: color.elevated, borderWidth: size.hairline, borderColor: color.accent },
  rank: { minWidth: space.xl, fontVariant: ['tabular-nums'] },
  grow: { flex: 1 },
  text: { color: color.text },
  muted: { color: color.textMuted },
  reward: { color: color.reward },
  accent: { color: color.accent },
  onAccent: { color: color.onAccent },
  tabular: { fontVariant: ['tabular-nums'] },
});
