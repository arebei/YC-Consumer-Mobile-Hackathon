import { useQuery } from 'convex/react';
import { Redirect, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { api } from '../../convex/_generated/api';
import { Button } from '../components/Button';
import { GlassCard } from '../components/GlassCard';
import { LassoMap } from '../components/LassoMap';
import { Pill } from '../components/Pill';
import { PlayerDot } from '../components/PlayerDot';
import { Skeleton } from '../components/Skeleton';
import { useReconnecting } from '../lib/connection';
import { blocks } from '../lib/format';
import { usePlayer } from '../lib/player';
import { useCurrentPosition } from '../lib/position';
import { color, space, type } from '../theme';

export default function Home() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { player, setPlayer } = usePlayer();
  const config = useQuery(api.config.public);
  const cells = useQuery(api.cells.all);
  const players = useQuery(api.players.list);
  const reconnecting = useReconnecting();
  const { position, usingVenue, permission } = useCurrentPosition(config?.center, config?.demoMode);
  const [follow, setFollow] = useState(true);

  // Keep the stored player in step with the server (name, colour, flag), or send them to Join if gone.
  useEffect(() => {
    if (!player || !players) return;
    const me = players.find((p) => p.playerId === player.playerId);
    if (!me) {
      setPlayer(null);
      return;
    }
    if (me.name !== player.name || me.color !== player.color || me.flag !== player.flag) {
      setPlayer({ playerId: me.playerId, name: me.name, color: me.color, flag: me.flag });
    }
  }, [player, players, setPlayer]);

  const myBlocks = useMemo(
    () => (cells && player ? cells.filter((c) => c.ownerId === player.playerId).length : undefined),
    [cells, player],
  );

  if (!player) return <Redirect href="/join" />;

  const needsPermission = permission === 'denied' && config?.demoMode === false;
  const mapCenter = position ?? config?.center;

  return (
    <View style={styles.fill}>
      {mapCenter ? (
        <LassoMap
          cells={cells}
          myId={player.playerId}
          center={mapCenter}
          follow={follow}
          onUserDrag={() => setFollow(false)}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.fill]} />
      )}

      {/* Top overlay */}
      <View style={[styles.top, { paddingTop: insets.top + space.sm }]} pointerEvents="box-none">
        <View style={styles.topLeft} pointerEvents="box-none">
          <GlassCard style={styles.chip}>
            <PlayerDot playerColor={player.color} />
            <Text style={[type.bodyStrong, styles.text]} numberOfLines={1}>
              {player.name}
            </Text>
            <Text style={[type.callout, styles.muted, styles.tabular]}>
              {myBlocks === undefined ? '…' : blocks(myBlocks)}
            </Text>
          </GlassCard>
          {usingVenue && <Pill label="Using the venue as your location" />}
          {reconnecting && <Pill label="Reconnecting…" variant="danger" />}
        </View>
      </View>

      {/* Bottom overlay */}
      <View style={[styles.bottom, { paddingBottom: insets.bottom + space.lg }]} pointerEvents="box-none">
        {!follow && mapCenter && (
          <Button label="Recenter" variant="secondary" size="medium" onPress={() => setFollow(true)} style={styles.recenter} />
        )}

        {needsPermission ? (
          <GlassCard style={styles.card}>
            <Text style={[type.bodyStrong, styles.text]}>Lasso needs your location to record walks</Text>
            <Button label="Open settings" variant="secondary" size="medium" onPress={() => Linking.openSettings()} />
          </GlassCard>
        ) : (
          <GlassCard style={styles.card}>
            {cells === undefined ? (
              <Skeleton height={24} />
            ) : (
              <Text style={[type.body, styles.text]}>Walk a loop to claim your first blocks.</Text>
            )}
          </GlassCard>
        )}

        <Button label="Start walk" onPress={() => router.push('/walk')} fullWidth disabled={!mapCenter} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: color.bg },
  top: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: space.lg, flexDirection: 'row' },
  topLeft: { gap: space.sm, alignItems: 'flex-start', flexShrink: 1 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: space.sm },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: space.lg, gap: space.md },
  recenter: { alignSelf: 'flex-end' },
  card: { gap: space.md },
  text: { color: color.text },
  muted: { color: color.textMuted },
  tabular: { fontVariant: ['tabular-nums'] },
});
