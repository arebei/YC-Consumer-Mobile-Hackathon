import { useQuery } from 'convex/react';
import { Redirect, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { api } from '../../convex/_generated/api';
import { haversineM } from '../../convex/lib/loop';
import { Banner } from '../components/Banner';
import { Button } from '../components/Button';
import { FlagSheet } from '../components/FlagSheet';
import { FlagText } from '../components/FlagText';
import { GlassCard } from '../components/GlassCard';
import { Swords } from '../components/icons';
import { LassoMap } from '../components/LassoMap';
import { Pill } from '../components/Pill';
import { PlayerDot } from '../components/PlayerDot';
import { ShopPin } from '../components/ShopPin';
import { Skeleton } from '../components/Skeleton';
import { useReconnecting } from '../lib/connection';
import { blocks, formatDistance, formatHeld } from '../lib/format';
import { useReduceMotion } from '../lib/motion';
import { usePlayer } from '../lib/player';
import { useCurrentPosition } from '../lib/position';
import { clearWalk, loadWalk, setPendingWalk, type SavedWalk } from '../lib/savedWalk';
import { stealParts, useStealBanner } from '../lib/stealBanner';
import { color, radius, size, space, type } from '../theme';

/** Press and hold the player chip this long to open Demo tools. */
const ADMIN_HOLD_MS = 2000;
const HELD_REFRESH_MS = 30000;
const PULSE_MS = 350;

export default function Home() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const reduceMotion = useReduceMotion();
  const { player, setPlayer } = usePlayer();
  const playerId = player?.playerId;

  const config = useQuery(api.config.public);
  const cells = useQuery(api.cells.all);
  const players = useQuery(api.players.list);
  const shops = useQuery(api.shops.list);
  const events = useQuery(api.events.forMe, playerId ? { playerId } : 'skip');
  const rewards = useQuery(api.rewards.mine, playerId ? { playerId } : 'skip');
  const reconnecting = useReconnecting();
  const { position, usingVenue, permission } = useCurrentPosition(config?.center, config?.demoMode);

  const [follow, setFollow] = useState(true);
  const [flagSheet, setFlagSheet] = useState(false);
  const [selectedCell, setSelectedCell] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const { event: steal, dismiss: dismissSteal } = useStealBanner(playerId, events);
  const pulse = useRef(new Animated.Value(0)).current;
  const [saved, setSaved] = useState<SavedWalk | null>(null);

  // A walk interrupted by a restart (saved under 30 minutes ago) is offered for resume.
  useEffect(() => {
    if (!playerId) return;
    let alive = true;
    loadWalk().then((w) => alive && setSaved(w && w.playerId === playerId ? w : null));
    return () => {
      alive = false;
    };
  }, [playerId]);

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

  // Held time ticks every 30 seconds.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), HELD_REFRESH_MS);
    return () => clearInterval(t);
  }, []);

  // The screen edge pulses red once when a new steal banner appears.
  useEffect(() => {
    if (!steal || reduceMotion) return;
    pulse.setValue(0);
    Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: PULSE_MS / 2, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: PULSE_MS / 2, useNativeDriver: true }),
    ]).start();
  }, [steal?.eventId, reduceMotion]); // eslint-disable-line react-hooks/exhaustive-deps

  const myBlocks = useMemo(
    () => (cells && playerId ? cells.filter((c) => c.ownerId === playerId).length : undefined),
    [cells, playerId],
  );

  const here = position ?? config?.center ?? null;
  const nearest = useMemo(() => {
    if (!shops || shops.length === 0 || !here) return null;
    let best = shops[0];
    let bestD = haversineM(here, best);
    for (const s of shops.slice(1)) {
      const d = haversineM(here, s);
      if (d < bestD) {
        best = s;
        bestD = d;
      }
    }
    return { shop: best, distance: bestD };
  }, [shops, here?.lat, here?.lng]); // eslint-disable-line react-hooks/exhaustive-deps

  const hasUnredeemed = !!rewards?.some((r) => r.redeemedAt === null);
  const cell = selectedCell ? cells?.find((c) => c.cellId === selectedCell) : undefined;

  if (!player) return <Redirect href="/join" />;

  const needsPermission = permission === 'denied' && config?.demoMode === false;
  const mapCenter = position ?? config?.center;

  // --- target card --------------------------------------------------------
  let target: React.ReactNode;
  if (shops === undefined || (shops.length > 0 && !nearest)) {
    target = <Skeleton height={48} />;
  } else if (!nearest) {
    target = <Text style={[type.body, styles.text]}>Walk a loop to claim your first blocks.</Text>;
  } else {
    const { shop, distance } = nearest;
    if (shop.holderId === player.playerId) {
      const stored = shop.top.find((t) => t.playerId === player.playerId)?.heldMs ?? 0;
      const held = stored + (shop.holderSince ? Math.max(0, now - shop.holderSince) : 0);
      target = (
        <>
          <Text style={[type.body, styles.text]}>{`You hold ${shop.name} with a ${shop.strength}-block loop.`}</Text>
          <Text style={[type.caption, styles.muted]}>{`Held for ${formatHeld(held)}`}</Text>
        </>
      );
    } else {
      target = (
        <Text style={[type.body, styles.text]}>
          <Text style={styles.reward}>{shop.reward}</Text>
          {` at ${shop.name}, ${formatDistance(distance)} away. `}
          {shop.holderName ? (
            <>
              {`Held by ${shop.holderName} with a ${shop.strength}-block loop. Enclose `}
              <Text style={styles.accent}>{shop.needed}</Text>
              {' to take it.'}
            </>
          ) : (
            <>
              {'Nobody holds it. Enclose '}
              <Text style={styles.accent}>{blocks(shop.needed)}</Text>
              {' to take it.'}
            </>
          )}
        </Text>
      );
    }
  }

  const stealText = steal ? stealParts(steal) : null;

  return (
    <View style={styles.fill}>
      {mapCenter ? (
        <LassoMap
          cells={cells}
          myId={player.playerId}
          center={mapCenter}
          follow={follow}
          onUserDrag={() => setFollow(false)}
          onCellPress={setSelectedCell}
          onMapPress={() => setSelectedCell(null)}>
          {shops?.map((s) => (
            <ShopPin key={s.shopId} lat={s.lat} lng={s.lng} name={s.name} mine={s.holderId === player.playerId} />
          ))}
        </LassoMap>
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.fill]} />
      )}

      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.pulse, { opacity: pulse }]} />

      {/* Top overlay */}
      <View style={[styles.top, { paddingTop: insets.top + space.sm }]} pointerEvents="box-none">
        {stealText && (
          <Banner
            variant="danger"
            onDismiss={dismissSteal}
            icon={<Swords size={size.icon} strokeWidth={size.iconStroke} color={color.danger} />}>
            {stealText.lead}
            {stealText.flag ? (
              <>
                {': '}
                <Text style={{ color: steal?.byColor }}>{`“${stealText.flag}”`}</Text>
                {'.'}
              </>
            ) : (
              '.'
            )}
            {stealText.tail}
          </Banner>
        )}
        <View style={styles.topRow} pointerEvents="box-none">
          <View style={styles.topLeft} pointerEvents="box-none">
            <Pressable
              accessibilityLabel={`${player.name}, ${myBlocks === undefined ? '' : blocks(myBlocks)}`}
              delayLongPress={ADMIN_HOLD_MS}
              onLongPress={() => router.push('/admin')}>
              <GlassCard style={styles.chip}>
                <PlayerDot playerColor={player.color} />
                <Text style={[type.bodyStrong, styles.text]} numberOfLines={1}>
                  {player.name}
                </Text>
                <Text style={[type.callout, styles.muted, styles.tabular]}>
                  {myBlocks === undefined ? '…' : blocks(myBlocks)}
                </Text>
              </GlassCard>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={player.flag ? 'Your flag' : 'Add a flag'}
              onPress={() => setFlagSheet(true)}
              disabled={!config}>
              <GlassCard style={styles.flagChip}>
                {player.flag ? (
                  <FlagText flag={player.flag} playerColor={player.color} lines={1} />
                ) : (
                  <Text style={[type.callout, styles.accent]}>Add a flag</Text>
                )}
              </GlassCard>
            </Pressable>
            {usingVenue && <Pill label="Using the venue as your location" />}
            {reconnecting && <Pill label="Reconnecting…" variant="danger" />}
          </View>
          {config?.demoMode && (
            <Button label="Demo tools" variant="secondary" size="medium" onPress={() => router.push('/admin')} />
          )}
        </View>
      </View>

      {/* Bottom overlay */}
      <View style={[styles.bottom, { paddingBottom: insets.bottom + space.lg }]} pointerEvents="box-none">
        {!follow && mapCenter && (
          <Button label="Recenter" variant="secondary" size="medium" onPress={() => setFollow(true)} style={styles.recenter} />
        )}

        {saved && (
          <GlassCard style={styles.card}>
            <Text style={[type.bodyStrong, styles.text]}>Resume your walk?</Text>
            <View style={styles.buttonRow}>
              <Button
                label="Resume"
                size="medium"
                variant="secondary"
                onPress={() => {
                  setPendingWalk({ mode: 'resume', points: saved.points });
                  setSaved(null);
                  router.push('/walk');
                }}
              />
              <Button
                label="Discard"
                size="medium"
                variant="ghost"
                onPress={() => {
                  clearWalk();
                  setSaved(null);
                }}
              />
            </View>
          </GlassCard>
        )}

        {cell && (
          <GlassCard style={styles.card}>
            <Text style={[type.body, styles.text]}>
              {cell.ownerId === player.playerId
                ? `Your block, held with a ${cell.strength}-block loop`
                : `${cell.ownerName}'s block, held with a ${cell.strength}-block loop`}
            </Text>
            {cell.ownerFlag ? <FlagText flag={cell.ownerFlag} playerColor={cell.ownerColor} /> : null}
          </GlassCard>
        )}

        {needsPermission ? (
          <GlassCard style={styles.card}>
            <Text style={[type.bodyStrong, styles.text]}>Lasso needs your location to record walks</Text>
            <Button label="Open settings" variant="secondary" size="medium" onPress={() => Linking.openSettings()} />
          </GlassCard>
        ) : (
          <GlassCard style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={[type.overline, styles.muted]}>Nearest shop</Text>
              <View>
                <Button label="Shops" variant="secondary" size="medium" onPress={() => router.push('/shops')} />
                {hasUnredeemed && <View style={styles.dot} />}
              </View>
            </View>
            {target}
          </GlassCard>
        )}

        <Button label="Start walk" onPress={() => router.push('/walk')} fullWidth disabled={!mapCenter} />
      </View>

      {config && <FlagSheet visible={flagSheet} onClose={() => setFlagSheet(false)} maxChars={config.maxFlagChars} />}
    </View>
  );
}

const DOT = space.md;

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: color.bg },
  pulse: { borderWidth: space.xs, borderColor: color.danger },
  top: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: space.lg, gap: space.sm },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: space.sm },
  topLeft: { gap: space.sm, alignItems: 'flex-start', flexShrink: 1 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: space.sm },
  flagChip: { paddingVertical: space.sm, maxWidth: size.chipMax },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: space.lg, gap: space.md },
  recenter: { alignSelf: 'flex-end' },
  card: { gap: space.sm },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  buttonRow: { flexDirection: 'row', gap: space.sm },
  dot: {
    position: 'absolute',
    top: -space.xxs,
    right: -space.xxs,
    width: DOT,
    height: DOT,
    borderRadius: radius.pill,
    backgroundColor: color.reward,
    borderWidth: size.hairline * 2,
    borderColor: color.bg,
  },
  text: { color: color.text },
  muted: { color: color.textMuted },
  reward: { color: color.reward },
  accent: { color: color.accent },
  tabular: { fontVariant: ['tabular-nums'] },
});
