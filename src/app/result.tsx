import { useMutation, useQuery } from 'convex/react';
import { useRouter } from 'expo-router';
import { useState } from 'react';

import { Footprints } from '../components/icons';
import { useCaptureAnimation } from '../lib/captureAnimation';
import { useReduceMotion } from '../lib/motion';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { api } from '../../convex/_generated/api';
import { Button } from '../components/Button';
import { EmptyState } from '../components/EmptyState';
import { FlagField } from '../components/FlagField';
import { GlassCard } from '../components/GlassCard';
import { LassoMap } from '../components/LassoMap';
import { StatNumber } from '../components/StatNumber';
import { useToast } from '../components/Toast';
import { blocks, errorMessage } from '../lib/format';
import { usePlayer } from '../lib/player';
import { lastResult, useStore } from '../lib/store';
import { color, size, space, type } from '../theme';

const REJECTED: Record<string, string> = {
  not_closed: 'You need to finish where you started.',
  too_fast: "That was faster than a run, so it doesn't count.",
  too_small: 'That loop was too small to hold a block.',
  too_big: 'That loop is too big for today.',
};

export default function Result() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const result = useStore(lastResult);
  const config = useQuery(api.config.public);
  const cells = useQuery(api.cells.all);
  const setFlagMutation = useMutation(api.players.setFlag);
  const { player, setFlag } = usePlayer();
  const [flag, setFlagText] = useState('');
  const [saving, setSaving] = useState(false);
  const reduceMotion = useReduceMotion();
  const captured = result?.status === 'captured';
  const { fills, count } = useCaptureAnimation(
    captured ? result.claimedCellIds : [],
    captured ? result.claimed : 0,
    captured && cells !== undefined,
    reduceMotion,
  );

  const back = () => router.dismissTo('/home');

  const backButton = <Button label="Back to map" onPress={back} fullWidth />;

  if (!result || result.status === 'rejected') {
    const title = result ? (REJECTED[result.reason ?? ''] ?? 'That walk did not count.') : 'No walk to show.';
    return (
      <View style={[styles.fill, styles.rejected, { paddingTop: insets.top + space.xxxl, paddingBottom: insets.bottom + space.lg }]}>
        <View style={styles.grow}>
          <EmptyState icon={<Footprints size={size.icon} strokeWidth={size.iconStroke} color={color.textMuted} />} title={title} />
          {result?.notes.map((n) => (
            <Text key={n} style={[type.body, styles.muted, styles.center]}>
              {n}
            </Text>
          ))}
        </View>
        {backButton}
      </View>
    );
  }

  const claimedSet = new Set(result.claimedCellIds);
  const firstClaimed = cells?.find((c) => claimedSet.has(c.cellId));
  const center = firstClaimed?.boundary[0] ?? config?.center;
  const headline =
    result.claimed === 0
      ? 'No new blocks this time.'
      : `You claimed ${blocks(result.claimed)} with a ${result.strength}-block loop.`;
  const showFlagPrompt = !!player && !player.flag && !!config;

  const saveFlag = async () => {
    if (!player) return;
    setSaving(true);
    try {
      const res = await setFlagMutation({ playerId: player.playerId, flag });
      setFlag(res.flag);
      toast.show('Flag planted.');
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.fill}>
      {center && (
        <LassoMap
          cells={cells}
          myId={player?.playerId}
          center={center}
          follow={false}
          fitCellIds={result.claimedCellIds}
          fillOverride={fills}
        />
      )}
      <View style={[styles.sheet, { paddingBottom: insets.bottom + space.lg }]} pointerEvents="box-none">
        <GlassCard style={styles.card}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.cardContent}>
            <StatNumber value={count} label="Blocks claimed" valueColor={color.accent} />
            <Text style={[type.bodyStrong, styles.text]}>{headline}</Text>
            {result.stolen > 0 && (
              <Text style={[type.body, styles.text]}>
                {result.stolen === 1 ? '1 of them was taken from another player.' : `${result.stolen} of them were taken from other players.`}
              </Text>
            )}
            {result.notes.map((n) => (
              <Text key={n} style={[type.callout, styles.muted]}>
                {n}
              </Text>
            ))}
            {showFlagPrompt && (
              <View style={styles.flagBlock}>
                <Text style={[type.bodyStrong, styles.text]}>Plant a flag on your new blocks</Text>
                <FlagField value={flag} onChange={setFlagText} max={config.maxFlagChars} />
                <Button
                  label="Save"
                  variant="secondary"
                  size="medium"
                  onPress={saveFlag}
                  loading={saving}
                  disabled={flag.trim().length === 0}
                />
              </View>
            )}
          </ScrollView>
        </GlassCard>
        {backButton}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: color.bg },
  rejected: { paddingHorizontal: space.xl, gap: space.lg },
  grow: { flex: 1, justifyContent: 'center', gap: space.sm },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: space.lg, gap: space.md },
  card: { maxHeight: size.sheetMax },
  cardContent: { gap: space.sm },
  flagBlock: { gap: space.md, marginTop: space.md },
  text: { color: color.text },
  muted: { color: color.textMuted },
  center: { textAlign: 'center' },
});
