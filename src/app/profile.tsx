import { useMutation, useQuery } from 'convex/react';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { api } from '../../convex/_generated/api';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { FlagField } from '../components/FlagField';
import { FlagText } from '../components/FlagText';
import { PlayerDot } from '../components/PlayerDot';
import { ScreenHeader } from '../components/ScreenHeader';
import { Skeleton } from '../components/Skeleton';
import { StatNumber } from '../components/StatNumber';
import { useToast } from '../components/Toast';
import { errorMessage, formatDistance } from '../lib/format';
import { usePlayer } from '../lib/player';
import { rankLine } from '../lib/rank';
import { useSettings } from '../lib/settings';
import { color, playerColors, radius, size, space, type } from '../theme';

export default function Profile() {
  useSettings();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { player, deviceId, setPlayer } = usePlayer();
  const args = player ? { playerId: player.playerId } : 'skip';
  const config = useQuery(api.config.public);
  const stats = useQuery(api.stats.mine, args);
  const byPoints = useQuery(api.leaderboard.points);
  const byBlocks = useQuery(api.leaderboard.top);
  const join = useMutation(api.players.join);
  const setFlagMutation = useMutation(api.players.setFlag);

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(player?.name ?? '');
  const [pick, setPick] = useState(() => Math.max(0, playerColors.findIndex((c) => c === player?.color)));
  const [flag, setFlag] = useState(player?.flag ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!player) return <View style={styles.fill} />;

  const startEdit = () => {
    setName(player.name);
    setPick(Math.max(0, playerColors.findIndex((c) => c === player.color)));
    setFlag(player.flag ?? '');
    setError(null);
    setEditing(true);
  };

  const save = async () => {
    if (!deviceId) return;
    setBusy(true);
    setError(null);
    try {
      // players.join with the same id updates that player (test players joined as "<deviceId>#<name>").
      const res = await join({ deviceId: player.joinId ?? deviceId, name: name.trim(), color: playerColors[pick] });
      let savedFlag = res.flag;
      if ((flag.trim() || null) !== (player.flag ?? null)) {
        savedFlag = (await setFlagMutation({ playerId: res.playerId, flag: flag.trim() })).flag;
      }
      setPlayer({ playerId: res.playerId, name: res.name, color: res.color, flag: savedFlag, joinId: player.joinId ?? deviceId });
      setEditing(false);
      toast.show('Profile saved.');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const pointsRank = rankLine(byPoints, (r) => r.points, player.playerId, 'points');
  const blocksRank = rankLine(byBlocks, (r) => r.blocks, player.playerId, 'blocks');

  return (
    <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScreenHeader title="Profile" />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + space.xxl }]}>
        <Card style={styles.card}>
          <View style={styles.row}>
            <PlayerDot playerColor={player.color} dotSize={size.icon} />
            <Text style={[type.title1, styles.text, styles.grow]} numberOfLines={1}>
              {player.name}
            </Text>
          </View>
          {player.flag ? (
            <FlagText flag={player.flag} playerColor={player.color} />
          ) : (
            <Text style={[type.callout, styles.muted]}>No flag yet.</Text>
          )}
          {!editing && <Button label="Edit profile" variant="secondary" size="medium" onPress={startEdit} />}
        </Card>

        {editing && (
          <Card style={styles.card}>
            <Text style={[type.callout, styles.text]}>Nickname</Text>
            <TextInput
              accessibilityLabel="Nickname"
              value={name}
              onChangeText={setName}
              maxLength={size.nameMax}
              autoCorrect={false}
              style={[type.body, styles.input]}
            />
            <Text style={[type.callout, styles.text]}>Your colour</Text>
            <View style={styles.swatches}>
              {playerColors.map((c, i) => (
                <Pressable
                  key={c}
                  accessibilityRole="radio"
                  accessibilityLabel={`Colour ${i + 1}`}
                  accessibilityState={{ selected: i === pick }}
                  onPress={() => setPick(i)}
                  style={[styles.swatch, { backgroundColor: c }, i === pick && styles.swatchOn]}
                />
              ))}
            </View>
            {config && <FlagField value={flag} onChange={setFlag} max={config.maxFlagChars} />}
            {error && <Text style={[type.callout, styles.danger]}>{error}</Text>}
            <View style={styles.buttons}>
              <Button label="Save" size="medium" onPress={save} loading={busy} disabled={name.trim().length === 0} />
              <Button label="Cancel" variant="ghost" size="medium" onPress={() => setEditing(false)} />
            </View>
          </Card>
        )}

        <Text style={[type.overline, styles.muted, styles.sectionGap]}>Stats</Text>
        {stats === undefined ? (
          <Skeleton height={140} />
        ) : (
          <View style={styles.grid}>
            <Card style={styles.tile}>
              <StatNumber value={stats.points.toLocaleString('en-US')} label="Points" valueColor={color.accent} />
            </Card>
            <Card style={styles.tile}>
              <StatNumber value={stats.blocksHeld} label="Blocks held" />
            </Card>
            <Card style={styles.tile}>
              <StatNumber value={stats.walks} label="Walks" />
            </Card>
            <Card style={styles.tile}>
              <StatNumber value={formatDistance(stats.totalM)} label="Distance" />
            </Card>
          </View>
        )}

        <Text style={[type.overline, styles.muted, styles.sectionGap]}>Rank</Text>
        <Card style={styles.card}>
          <Text style={[type.bodyStrong, styles.text]}>
            {pointsRank === undefined ? '…' : (pointsRank ?? 'By points: Not ranked yet')}
          </Text>
          <Text style={[type.bodyStrong, styles.text]}>
            {blocksRank === undefined ? '…' : (blocksRank ?? 'By blocks: Not ranked yet')}
          </Text>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: color.bg },
  content: { paddingHorizontal: space.lg, gap: space.md },
  card: { gap: space.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  grow: { flex: 1 },
  sectionGap: { marginTop: space.lg },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  tile: { flexBasis: '47%', flexGrow: 1 },
  input: {
    color: color.text,
    backgroundColor: color.bgRaised,
    borderColor: color.border,
    borderWidth: size.hairline,
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  swatch: { width: size.buttonMedium, height: size.buttonMedium, borderRadius: radius.pill },
  swatchOn: { borderWidth: size.ring, borderColor: color.text },
  buttons: { flexDirection: 'row', gap: space.sm },
  text: { color: color.text },
  muted: { color: color.textMuted },
  danger: { color: color.danger },
});
