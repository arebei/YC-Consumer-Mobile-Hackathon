import { useMutation, useQuery } from 'convex/react';
import { useRouter } from 'expo-router';

import { useState, type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import seedShops from '../../assets/seed-shops.json';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { squareLoop, type LatLng } from '../../convex/lib/loop';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { CloseButton } from '../components/CloseButton';
import { FlagField } from '../components/FlagField';
import { PlayerDot } from '../components/PlayerDot';
import { Skeleton } from '../components/Skeleton';
import { useToast } from '../components/Toast';
import { errorMessage } from '../lib/format';
import { usePlayer } from '../lib/player';
import { useCurrentPosition } from '../lib/position';
import { setPendingWalk } from '../lib/savedWalk';
import { demoRedeem, lastResult, useStore } from '../lib/store';
import { color, playerColors, radius, size, space, type } from '../theme';

type ShopSeed = { name: string; lat: number; lng: number; reward: string; feeCents: number };

const SMALL_SIDE_M = 130;
const LARGE_SIDE_M = 200;

function isShopList(v: unknown): v is ShopSeed[] {
  return (
    Array.isArray(v) &&
    v.every(
      (s) =>
        s &&
        typeof s.name === 'string' &&
        typeof s.lat === 'number' &&
        typeof s.lng === 'number' &&
        typeof s.reward === 'string' &&
        typeof s.feeCents === 'number',
    )
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card style={styles.section}>
      <Text style={[type.overline, styles.muted]}>{title}</Text>
      {children}
    </Card>
  );
}

export default function Admin() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const { player, deviceId, setPlayer } = usePlayer();

  const config = useQuery(api.config.public);
  const players = useQuery(api.players.list);
  const shops = useQuery(api.shops.list);
  const lastWalk = useQuery(api.walks.last, player ? { playerId: player.playerId } : 'skip');
  const { position } = useCurrentPosition(config?.center, config?.demoMode);

  const join = useMutation(api.players.join);
  const submit = useMutation(api.walks.submit);
  const seed = useMutation(api.admin.seedShops);
  const endSeason = useMutation(api.season.end);
  const reset = useMutation(api.admin.reset);
  const grantPoints = useMutation(api.admin.grantPoints);

  const demo = useStore(demoRedeem);

  const [busy, setBusy] = useState<string | null>(null);
  const [showSwitch, setShowSwitch] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(1);
  const [newFlag, setNewFlag] = useState('');
  const [around, setAround] = useState<'here' | Id<'shops'>>('here');
  const [json, setJson] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    try {
      await fn();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const aroundCenter = (): LatLng | null => {
    if (around === 'here') return position;
    const shop = shops?.find((s) => s.shopId === around);
    return shop ? { lat: shop.lat, lng: shop.lng } : null;
  };

  const fakeLoop = (side: number, key: string) =>
    run(key, async () => {
      const center = aroundCenter();
      if (!player) throw new Error('no player');
      if (!center) {
        toast.error('No position yet. Try again in a few seconds.');
        return;
      }
      const res = await submit({ playerId: player.playerId, points: squareLoop(center, side, Date.now()) });
      lastResult.set(res);
      router.replace('/result');
    });

  const addPlayer = () =>
    run('add', async () => {
      if (!deviceId) return;
      const nickname = newName.trim();
      const flag = newFlag.trim();
      const res = await join({
        deviceId: `${deviceId}#${nickname}`,
        name: nickname,
        color: playerColors[newColor],
        ...(flag ? { flag } : {}),
      });
      setPlayer({ playerId: res.playerId, name: res.name, color: res.color, flag: res.flag });
      setShowAdd(false);
      setNewName('');
      setNewFlag('');
      toast.show(`Now acting as ${res.name}.`);
    });

  const seedFrom = (key: string, list: ShopSeed[]) =>
    run(key, async () => {
      const res = await seed({ shops: list });
      toast.show(`${res.count} shops on the map.`);
    });

  const seedJson = () => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(json);
    } catch {
      toast.error('That is not valid JSON.');
      return;
    }
    if (!isShopList(parsed)) {
      toast.error('Expected a list of {name, lat, lng, reward, feeCents}.');
      return;
    }
    seedFrom('json', parsed);
  };

  return (
    <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.header, { paddingTop: insets.top + space.md }]}>
        <Text style={[type.title1, styles.text]}>Demo tools</Text>
        <CloseButton onPress={() => router.back()} />
      </View>

      <ScrollView
        style={styles.fill}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + space.xxl }]}>
        {/* Acting as */}
        <Section title="Acting as">
          {player ? (
            <View style={styles.row}>
              <PlayerDot playerColor={player.color} />
              <Text style={[type.bodyStrong, styles.text]}>{player.name}</Text>
            </View>
          ) : (
            <Text style={[type.body, styles.muted]}>Nobody</Text>
          )}
          <View style={styles.buttons}>
            <Button label="Switch player" variant="secondary" size="medium" onPress={() => setShowSwitch((s) => !s)} />
            <Button label="Add test player" variant="secondary" size="medium" onPress={() => setShowAdd((s) => !s)} />
          </View>

          {showSwitch &&
            (players === undefined ? (
              <Skeleton height={44} />
            ) : (
              players.map((p) => (
                <Pressable
                  key={p.playerId}
                  accessibilityRole="button"
                  accessibilityLabel={p.name}
                  onPress={() => {
                    setPlayer({ playerId: p.playerId, name: p.name, color: p.color, flag: p.flag });
                    setShowSwitch(false);
                    toast.show(`Now acting as ${p.name}.`);
                  }}
                  style={[styles.option, p.playerId === player?.playerId && styles.optionOn]}>
                  <PlayerDot playerColor={p.color} />
                  <Text style={[type.body, styles.text]}>{p.name}</Text>
                </Pressable>
              ))
            ))}

          {showAdd && (
            <View style={styles.form}>
              <TextInput
                accessibilityLabel="Nickname"
                value={newName}
                onChangeText={setNewName}
                maxLength={size.nameMax}
                placeholder="Nickname"
                placeholderTextColor={color.textFaint}
                autoCorrect={false}
                style={[type.body, styles.input]}
              />
              <View style={styles.swatches}>
                {playerColors.map((c, i) => (
                  <Pressable
                    key={c}
                    accessibilityRole="radio"
                    accessibilityLabel={`Colour ${i + 1}`}
                    accessibilityState={{ selected: i === newColor }}
                    onPress={() => setNewColor(i)}
                    style={[styles.swatch, { backgroundColor: c }, i === newColor && styles.swatchOn]}
                  />
                ))}
              </View>
              {config && <FlagField value={newFlag} onChange={setNewFlag} max={config.maxFlagChars} />}
              <Button
                label="Add player"
                size="medium"
                onPress={addPlayer}
                loading={busy === 'add'}
                disabled={newName.trim().length === 0}
              />
            </View>
          )}
        </Section>

        {/* Fake loop */}
        <Section title="Fake loop">
          <View style={styles.chips}>
            {[{ key: 'here' as const, label: 'Here' }, ...(shops ?? []).map((s) => ({ key: s.shopId, label: s.name }))].map(
              (o) => (
                <Pressable
                  key={o.key}
                  accessibilityRole="radio"
                  accessibilityLabel={`Around: ${o.label}`}
                  accessibilityState={{ selected: around === o.key }}
                  onPress={() => setAround(o.key)}
                  style={[styles.chip, around === o.key && styles.chipOn]}>
                  <Text style={[type.caption, around === o.key ? styles.onAccent : styles.text]}>{`Around: ${o.label}`}</Text>
                </Pressable>
              ),
            )}
          </View>
          <View style={styles.buttons}>
            <Button
              label="Fake loop: small"
              size="medium"
              variant="secondary"
              onPress={() => fakeLoop(SMALL_SIDE_M, 'small')}
              loading={busy === 'small'}
              disabled={!player}
            />
            <Button
              label="Fake loop: large"
              size="medium"
              variant="secondary"
              onPress={() => fakeLoop(LARGE_SIDE_M, 'large')}
              loading={busy === 'large'}
              disabled={!player}
            />
          </View>
          <Button
            label="Replay last walk"
            size="medium"
            variant="secondary"
            disabled={!player || lastWalk === undefined}
            onPress={() => {
              if (!lastWalk || lastWalk.points.length === 0) {
                toast.error(`${player?.name ?? 'This player'} has no captured walk to replay yet.`);
                return;
              }
              setPendingWalk({ mode: 'replay', points: lastWalk.points });
              router.replace('/walk');
            }}
          />
        </Section>

        {/* Shops */}
        <Section title="Shops">
          <Button
            label="Seed venue shops"
            variant="secondary"
            size="medium"
            onPress={() => seedFrom('venue', seedShops as ShopSeed[])}
            loading={busy === 'venue'}
          />
          <TextInput
            accessibilityLabel="Shops JSON"
            value={json}
            onChangeText={setJson}
            multiline
            placeholder='[{"name": "Blue Door", "lat": 37.76, "lng": -122.39, "reward": "Free coffee", "feeCents": 100}]'
            placeholderTextColor={color.textFaint}
            autoCapitalize="none"
            autoCorrect={false}
            style={[type.caption, styles.input, styles.json]}
          />
          <Button
            label="Seed shops from JSON"
            variant="secondary"
            size="medium"
            onPress={seedJson}
            loading={busy === 'json'}
            disabled={json.trim().length === 0}
          />
        </Section>

        {/* Points */}
        <Section title="Points">
          <Button
            label="Add 500 points"
            variant="secondary"
            size="medium"
            loading={busy === 'points'}
            disabled={!player}
            onPress={() =>
              run('points', async () => {
                if (!player) return;
                const res = await grantPoints({ playerId: player.playerId, amount: 500 });
                toast.show(`${player.name} now has ${res.balance} points.`);
              })
            }
          />
        </Section>

        {/* Season */}
        <Section title="Season">
          <Button
            label="End the week"
            variant="secondary"
            size="medium"
            loading={busy === 'end'}
            onPress={() =>
              run('end', async () => {
                const res = await endSeason();
                toast.show(
                  `Week ended. ${res.rewardsCreated === 1 ? '1 reward' : `${res.rewardsCreated} rewards`} created.`,
                );
              })
            }
          />
          {config?.demoMode && (
            <View style={styles.toggleRow}>
              <Text style={[type.body, styles.text]}>Demo redeem</Text>
              <Switch
                accessibilityLabel="Demo redeem"
                value={demo}
                onValueChange={(v) => demoRedeem.set(v)}
                trackColor={{ true: color.accent, false: color.border }}
                thumbColor={color.text}
              />
            </View>
          )}
        </Section>

        {/* Reset */}
        <Section title="Reset">
          {confirmReset ? (
            <View style={styles.form}>
              <Text style={[type.bodyStrong, styles.text]}>Clear every block, walk and reward?</Text>
              <View style={styles.buttons}>
                <Button
                  label="Reset"
                  variant="danger"
                  size="medium"
                  loading={busy === 'reset'}
                  onPress={() =>
                    run('reset', async () => {
                      await reset();
                      setConfirmReset(false);
                      toast.show('Map cleared.');
                    })
                  }
                />
                <Button label="Cancel" variant="ghost" size="medium" onPress={() => setConfirmReset(false)} />
              </View>
            </View>
          ) : (
            <Button label="Reset map" variant="danger" size="medium" onPress={() => setConfirmReset(true)} />
          )}
        </Section>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: color.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.lg,
    paddingBottom: space.md,
  },
  content: { paddingHorizontal: space.lg, gap: space.lg },
  section: { gap: space.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingVertical: space.md,
    paddingHorizontal: space.md,
    borderRadius: radius.md,
    backgroundColor: color.elevated,
  },
  optionOn: { borderWidth: size.hairline, borderColor: color.accent },
  form: { gap: space.md },
  input: {
    color: color.text,
    backgroundColor: color.bgRaised,
    borderColor: color.border,
    borderWidth: size.hairline,
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
  json: { minHeight: size.buttonLarge * 2, textAlignVertical: 'top' },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  swatch: { width: size.buttonMedium, height: size.buttonMedium, borderRadius: radius.pill },
  swatchOn: { borderWidth: size.ring, borderColor: color.text },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: {
    height: size.pill + space.sm,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    borderWidth: size.hairline,
    borderColor: color.border,
    justifyContent: 'center',
  },
  chipOn: { backgroundColor: color.accent, borderColor: color.accent },
  onAccent: { color: color.onAccent },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  text: { color: color.text },
  muted: { color: color.textMuted },
});
