import { useMutation, useQuery } from 'convex/react';
import { ConvexError } from 'convex/values';
import { useKeepAwake } from 'expo-keep-awake';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Linking, StyleSheet, Text, View } from 'react-native';
import { Marker, Polyline } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { api } from '../../convex/_generated/api';
import { haversineM, pathLengthM, type Point } from '../../convex/lib/loop';
import { Button } from '../components/Button';
import { GlassCard } from '../components/GlassCard';
import { Flag } from '../components/icons';
import { LassoMap } from '../components/LassoMap';
import { Pill } from '../components/Pill';
import { StatNumber } from '../components/StatNumber';
import { errorMessage, formatDistance } from '../lib/format';
import { usePlayer } from '../lib/player';
import { clearWalk, saveWalk, takePendingWalk } from '../lib/savedWalk';
import { lastResult } from '../lib/store';
import { color, radius, size, space, type } from '../theme';

type Phase = 'recording' | 'paused' | 'confirm' | 'submitting' | 'failed' | 'replaying';

const MIN_GAP_MS = 1000; // iOS ignores timeInterval, so drop points closer than this
const DRAW_MAX_ACC = 50; // metres; worse points are sent but not drawn
const WEAK_ACC = 25;
const SUBMIT_TIMEOUT_MS = 10000;
const SAVE_EVERY = 10;
const REPLAY_SPEED = 10;
const REPLAY_MAX_GAP_MS = 1500;
const NO_FIX_HINT_MS = 8000;
const PATH_WIDTH = 5;

class TimeoutError extends Error {}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new TimeoutError()), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

const toCoord = (p: { lat: number; lng: number }) => ({ latitude: p.lat, longitude: p.lng });

export default function Walk() {
  useKeepAwake();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { player } = usePlayer();
  const config = useQuery(api.config.public);
  const submitMutation = useMutation(api.walks.submit);

  const [initial] = useState(() => takePendingWalk());
  const replay = initial?.mode === 'replay' ? initial.points : null;

  const [points, setPoints] = useState<Point[]>(initial?.mode === 'resume' ? initial.points : []);
  const [phase, setPhase] = useState<Phase>(replay ? 'replaying' : 'recording');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [noFix, setNoFix] = useState(false);
  const [follow, setFollow] = useState(true);

  const pointsRef = useRef(points);
  pointsRef.current = points;
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const beforeConfirm = useRef<Phase>('recording');
  const lastKeptT = useRef(points.length ? points[points.length - 1].t : 0);
  const maxFar = useRef(0);
  const submitting = useRef(false);

  // --- derived ----------------------------------------------------------
  const drawn = useMemo(() => points.filter((p) => p.acc <= DRAW_MAX_ACC), [points]);
  const start = drawn[0] ?? null;
  const current = drawn[drawn.length - 1] ?? null;
  const lengthM = useMemo(() => pathLengthM(drawn), [drawn]);
  const toStart = start && current ? haversineM(current, start) : 0;
  const minLoop = config?.minLoopM;
  const closeR = config?.closeRadiusM;
  const longEnough = minLoop !== undefined && lengthM >= minLoop;
  const last = points[points.length - 1];
  const weak = !!last && last.acc > WEAK_ACC;

  // --- submit -----------------------------------------------------------
  const submit = async (pts: Point[] = pointsRef.current) => {
    if (!player || submitting.current) return;
    submitting.current = true;
    setSubmitError(null);
    setPhase('submitting');
    try {
      const res = await withTimeout(submitMutation({ playerId: player.playerId, points: pts }), SUBMIT_TIMEOUT_MS);
      await clearWalk();
      lastResult.set(res);
      router.replace('/result');
    } catch (e) {
      // Keep the points. A ConvexError carries its own sentence; anything else is the network.
      setSubmitError(e instanceof ConvexError ? errorMessage(e) : "Couldn't reach the server.");
      setPhase('failed');
    } finally {
      submitting.current = false;
    }
  };

  const discard = async () => {
    await clearWalk();
    router.back();
  };

  // --- recording --------------------------------------------------------
  const recording = !replay && (phase === 'recording' || phase === 'confirm');

  useEffect(() => {
    if (!recording) return;
    let sub: Location.LocationSubscription | null = null;
    let cancelled = false;
    (async () => {
      let perm = await Location.getForegroundPermissionsAsync();
      if (!perm.granted && perm.canAskAgain) perm = await Location.requestForegroundPermissionsAsync();
      if (cancelled) return;
      if (!perm.granted) {
        setPermissionDenied(true);
        return;
      }
      setPermissionDenied(false);
      sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 2000, distanceInterval: 5 },
        (loc) => {
          const t = loc.timestamp;
          if (t - lastKeptT.current < MIN_GAP_MS) return;
          lastKeptT.current = t;
          const p: Point = { lat: loc.coords.latitude, lng: loc.coords.longitude, t, acc: loc.coords.accuracy ?? 10 };
          setPoints((prev) => [...prev, p]);
        },
      );
      if (cancelled) sub.remove();
    })().catch(() => setPermissionDenied(true));
    return () => {
      cancelled = true;
      sub?.remove();
    };
  }, [recording]);

  // Hint when GPS has said nothing for a while.
  useEffect(() => {
    if (points.length > 0 || replay) return;
    const t = setTimeout(() => setNoFix(true), NO_FIX_HINT_MS);
    return () => clearTimeout(t);
  }, [points.length, replay]);

  // Save every ten points, so a crash or restart does not lose the walk.
  useEffect(() => {
    if (!player || replay || points.length === 0 || points.length % SAVE_EVERY !== 0) return;
    saveWalk(player.playerId, points);
  }, [points, player, replay]);

  // Auto-close: long enough, went far enough from the flag, and back within the close radius.
  useEffect(() => {
    if (closeR === undefined) return;
    maxFar.current = Math.max(maxFar.current, toStart);
    if (phaseRef.current !== 'recording' || submitting.current) return;
    if (longEnough && maxFar.current > 2 * closeR && toStart <= closeR) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      submit();
    }
  }, [points]); // eslint-disable-line react-hooks/exhaustive-deps

  // Going to the background stops recording; coming back shows the pause card.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'background' && phaseRef.current === 'recording') {
        setPhase('paused');
        if (player && pointsRef.current.length) saveWalk(player.playerId, pointsRef.current);
      }
    });
    return () => sub.remove();
  }, [player]);

  // Replay: draw the saved path at ten times speed, then submit it with timestamps ending now.
  useEffect(() => {
    if (!replay || replay.length === 0) return;
    let i = 0;
    let timer: ReturnType<typeof setTimeout>;
    const step = () => {
      i++;
      setPoints(replay.slice(0, i));
      if (i >= replay.length) {
        const shift = Date.now() - replay[replay.length - 1].t;
        submit(replay.map((p) => ({ ...p, t: p.t + shift })));
        return;
      }
      const gap = (replay[i].t - replay[i - 1].t) / REPLAY_SPEED;
      timer = setTimeout(step, Math.min(REPLAY_MAX_GAP_MS, Math.max(16, gap)));
    };
    step();
    return () => clearTimeout(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // --- render -----------------------------------------------------------
  const mapCenter = current ?? (last ? { lat: last.lat, lng: last.lng } : config?.center);
  const progress = minLoop ? Math.min(1, lengthM / minLoop) : 0;

  const openConfirm = () => {
    beforeConfirm.current = phase;
    setPhase('confirm');
  };

  let hud: React.ReactNode;
  if (permissionDenied && !replay) {
    hud = (
      <>
        <Text style={[type.bodyStrong, styles.text]}>Lasso needs your location to record walks</Text>
        <Button label="Open settings" variant="secondary" size="medium" onPress={() => Linking.openSettings()} />
      </>
    );
  } else if (phase === 'confirm') {
    hud = (
      <>
        <Text style={[type.title2, styles.text]}>Discard this walk?</Text>
        <View style={styles.row}>
          <Button label="Discard" variant="danger" size="medium" onPress={discard} />
          <Button label="Keep walking" variant="secondary" size="medium" onPress={() => setPhase(beforeConfirm.current)} />
        </View>
      </>
    );
  } else if (phase === 'paused') {
    hud = (
      <>
        <Text style={[type.bodyStrong, styles.text]}>Walk paused. Keep Lasso open while you walk.</Text>
        <View style={styles.row}>
          <Button label="Resume" size="medium" onPress={() => setPhase('recording')} />
          <Button label="Discard" variant="ghost" size="medium" onPress={discard} />
        </View>
      </>
    );
  } else if (phase === 'submitting') {
    hud = (
      <>
        <StatNumber value={formatDistance(lengthM)} label="Walked" />
        <Text style={[type.body, styles.text]}>Counting your blocks…</Text>
      </>
    );
  } else if (phase === 'failed') {
    hud = (
      <>
        <StatNumber value={formatDistance(lengthM)} label="Walked" />
        <Text style={[type.bodyStrong, styles.danger]}>{submitError ?? "Couldn't reach the server."}</Text>
      </>
    );
  } else if (phase === 'replaying') {
    hud = (
      <>
        <StatNumber value={formatDistance(lengthM)} label="Walked" />
        <Text style={[type.body, styles.text]}>Replaying your last walk…</Text>
      </>
    );
  } else if (!longEnough) {
    hud = (
      <>
        <StatNumber value={formatDistance(lengthM)} label="Walked" />
        <View style={styles.track}>
          <View style={[styles.fillBar, { width: `${progress * 100}%` }]} />
        </View>
        <Text style={[type.body, styles.text]}>
          {minLoop !== undefined ? `Keep going. A loop needs at least ${formatDistance(minLoop)}.` : 'Keep going.'}
        </Text>
        {noFix && points.length === 0 && (
          <Text style={[type.callout, styles.muted]}>No GPS signal yet. Stay in the open.</Text>
        )}
      </>
    );
  } else {
    hud = (
      <>
        <StatNumber value={formatDistance(lengthM)} label="Walked" />
        <Text style={[type.body, styles.text]}>
          {`Return to the flag to close your loop. ${formatDistance(toStart)} to go.`}
        </Text>
      </>
    );
  }

  const showClose = longEnough && (phase === 'recording' || phase === 'submitting');

  return (
    <View style={styles.fill}>
      {mapCenter && (
        <LassoMap cells={undefined} myId={player?.playerId} center={mapCenter} follow={follow} onUserDrag={() => setFollow(false)}>
          {drawn.length > 1 && (
            <Polyline
              coordinates={drawn.map(toCoord)}
              strokeColor={color.accent}
              strokeWidth={PATH_WIDTH}
              lineCap="round"
              lineJoin="round"
            />
          )}
          {start && (
            <Marker coordinate={toCoord(start)} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={false}>
              <View style={styles.flagPin}>
                <Flag size={size.icon - space.xs} strokeWidth={size.iconStroke} color={color.accent} />
              </View>
            </Marker>
          )}
        </LassoMap>
      )}

      <View style={[styles.top, { paddingTop: insets.top + space.sm }]} pointerEvents="box-none">
        {phase !== 'submitting' && phase !== 'confirm' ? (
          <Button label="Cancel" variant="ghost" size="medium" onPress={openConfirm} style={styles.ghostBg} />
        ) : (
          <View />
        )}
        <View style={styles.pills} pointerEvents="none">
          {weak && phase === 'recording' && <Pill label="Weak GPS signal. Stay in the open." variant="danger" />}
        </View>
      </View>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + space.lg }]} pointerEvents="box-none">
        {!follow && mapCenter && (
          <Button label="Recenter" variant="secondary" size="medium" onPress={() => setFollow(true)} style={styles.recenter} />
        )}
        <GlassCard style={styles.hud}>{hud}</GlassCard>
        {phase === 'failed' ? (
          <Button label="Try again" onPress={() => submit()} fullWidth />
        ) : showClose ? (
          <Button
            label="Close loop"
            onPress={() => {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
              submit();
            }}
            loading={phase === 'submitting'}
            fullWidth
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: color.bg },
  top: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: space.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: space.sm,
  },
  ghostBg: { backgroundColor: color.glass, borderRadius: radius.pill },
  pills: { flexShrink: 1, alignItems: 'flex-end' },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: space.lg, gap: space.md },
  recenter: { alignSelf: 'flex-end' },
  hud: { gap: space.md },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  track: { height: space.xs, borderRadius: radius.pill, backgroundColor: color.border, overflow: 'hidden' },
  fillBar: { height: '100%', backgroundColor: color.accent },
  flagPin: {
    width: size.shopPin - space.sm,
    height: size.shopPin - space.sm,
    borderRadius: radius.pill,
    backgroundColor: color.bg,
    borderWidth: size.hairline * 2,
    borderColor: color.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { color: color.text },
  muted: { color: color.textMuted },
  danger: { color: color.danger },
});
