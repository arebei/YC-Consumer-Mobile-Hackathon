import { useMutation, useQuery } from 'convex/react';
import type { FunctionReturnType } from 'convex/server';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { api } from '../../convex/_generated/api';
import { haversineM } from '../../convex/lib/loop';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { CloseButton } from '../components/CloseButton';
import { EmptyState } from '../components/EmptyState';
import { Store, Trophy } from '../components/icons';
import { PlayerDot } from '../components/PlayerDot';
import { Skeleton } from '../components/Skeleton';
import { blocks, errorMessage, formatFee, formatHeld } from '../lib/format';
import { useReduceMotion } from '../lib/motion';
import { usePlayer } from '../lib/player';
import { useCurrentPosition } from '../lib/position';
import { demoRedeem, useStore } from '../lib/store';
import { color, size, space, type } from '../theme';

type Reward = FunctionReturnType<typeof api.rewards.mine>[number];
type Shop = FunctionReturnType<typeof api.shops.list>[number];

const REWARD_IN_MS = 400;
const CODE_SPACING = 6;
/** Rewards already announced in this app session, so the haptic fires once per reward. */
const announced = new Set<string>();

function feeLine(r: Reward): string | null {
  const fee = formatFee(r.feeCents);
  switch (r.feeStatus) {
    case 'pending':
      return `${r.shopName} owes ${fee}`;
    case 'invoiced':
      return `${r.shopName} was invoiced ${fee}`;
    case 'charged':
      return `${r.shopName} paid ${fee}`;
    case 'failed':
      return 'Fee could not be charged.';
    default:
      return null;
  }
}

function RewardCard({
  reward,
  position,
  redeemRadiusM,
  demoMode,
}: {
  reward: Reward;
  position: { lat: number; lng: number } | null;
  redeemRadiusM: number;
  demoMode: boolean;
}) {
  const reduce = useReduceMotion();
  const redeem = useMutation(api.rewards.redeem);
  const demo = useStore(demoRedeem);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isNew = useRef(!announced.has(reward.rewardId) && reward.redeemedAt === null).current;
  const scale = useRef(new Animated.Value(isNew && !reduce ? 0.9 : 1)).current;
  const codeOpacity = useRef(new Animated.Value(isNew && !reduce ? 0 : 1)).current;

  useEffect(() => {
    if (!isNew) return;
    announced.add(reward.rewardId);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    if (reduce) {
      scale.setValue(1);
      codeOpacity.setValue(1);
      return;
    }
    Animated.parallel([
      Animated.timing(scale, { toValue: 1, duration: REWARD_IN_MS, useNativeDriver: true }),
      Animated.timing(codeOpacity, { toValue: 1, duration: REWARD_IN_MS, useNativeDriver: true }),
    ]).start();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const near = position
    ? haversineM(position, { lat: reward.shopLat, lng: reward.shopLng }) <= redeemRadiusM
    : false;
  const canRedeem = near || demo;
  const redeemed = reward.redeemedAt !== null;
  const fee = feeLine(reward);

  const onRedeem = async () => {
    const at = position ?? { lat: reward.shopLat, lng: reward.shopLng };
    setBusy(true);
    setError(null);
    try {
      const res = await redeem({ rewardId: reward.rewardId, lat: at.lat, lng: at.lng, ...(demo ? { demo: true } : {}) });
      if (!res.ok) {
        setError(
          res.reason === 'already_redeemed'
            ? 'This reward was already redeemed.'
            : `You're too far from ${reward.shopName} to redeem.`,
        );
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Card edgeColor={color.reward} style={styles.cardGap}>
        <Text style={[type.title2, styles.text]}>{reward.shopName}</Text>
        <Text style={[type.bodyStrong, styles.reward]}>{reward.reward}</Text>
        <Animated.Text style={[type.hero, styles.code, { opacity: codeOpacity }]} selectable>
          {reward.code}
        </Animated.Text>
        {redeemed ? (
          <>
            <Text style={[type.bodyStrong, styles.success]}>Redeemed.</Text>
            {fee && <Text style={[type.caption, styles.muted]}>{fee}</Text>}
            {reward.feeStatus === 'invoiced' && reward.feeUrl && demoMode && (
              <Button
                label="Open invoice"
                variant="ghost"
                size="medium"
                onPress={() => Linking.openURL(reward.feeUrl as string).catch(() => {})}
              />
            )}
          </>
        ) : (
          <>
            <Button label="Redeem" onPress={onRedeem} loading={busy} disabled={!canRedeem} fullWidth />
            {!canRedeem && <Text style={[type.callout, styles.muted]}>{`Go to ${reward.shopName} to redeem.`}</Text>}
          </>
        )}
        {error && <Text style={[type.callout, styles.danger]}>{error}</Text>}
      </Card>
    </Animated.View>
  );
}

function ShopCard({ shop, now }: { shop: Shop; now: number }) {
  const rows = shop.top.map((t) => ({ ...t }));
  if (shop.holderId && shop.holderName && shop.holderColor) {
    const live = shop.holderSince ? Math.max(0, now - shop.holderSince) : 0;
    const row = rows.find((r) => r.playerId === shop.holderId);
    if (row) row.heldMs += live;
    else rows.push({ playerId: shop.holderId, name: shop.holderName, color: shop.holderColor, heldMs: live });
  }
  rows.sort((a, b) => b.heldMs - a.heldMs);

  return (
    <Card style={styles.cardGap}>
      <Text style={[type.title2, styles.text]}>{shop.name}</Text>
      <Text style={[type.bodyStrong, styles.reward]}>{shop.reward}</Text>
      <Text style={[type.body, styles.text]}>
        {shop.holderName ? `Held by ${shop.holderName} with a ${shop.strength}-block loop` : 'Nobody holds it'}
      </Text>
      <Text style={[type.bodyStrong, styles.accent]}>{`Enclose ${shop.needed} to take it`}</Text>
      {rows.slice(0, 3).map((r) => (
        <View key={r.playerId} style={styles.row}>
          <PlayerDot playerColor={r.color} />
          <Text style={[type.callout, styles.text, styles.grow]} numberOfLines={1}>
            {r.name}
          </Text>
          <Text style={[type.callout, styles.muted, styles.tabular]}>{formatHeld(r.heldMs)}</Text>
        </View>
      ))}
    </Card>
  );
}

export default function Shops() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { player } = usePlayer();
  const config = useQuery(api.config.public);
  const shops = useQuery(api.shops.list);
  const top = useQuery(api.leaderboard.top);
  const rewards = useQuery(api.rewards.mine, player ? { playerId: player.playerId } : 'skip');
  const { position } = useCurrentPosition(config?.center, config?.demoMode);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  return (
    <View style={styles.fill}>
      <View style={[styles.header, { paddingTop: insets.top + space.md }]}>
        <Text style={[type.title1, styles.text]}>Shops</Text>
        <CloseButton onPress={() => router.back()} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + space.xxl }]}>
        <Text style={[type.overline, styles.muted]}>Your rewards</Text>
        {rewards === undefined || config === undefined ? (
          <Skeleton height={120} />
        ) : rewards.length === 0 ? (
          <EmptyState
            icon={<Trophy size={size.icon} strokeWidth={size.iconStroke} color={color.reward} />}
            title="No rewards yet."
            body="Hold a shop's block the longest this week to win one."
          />
        ) : (
          rewards.map((r) => (
            <RewardCard
              key={r.rewardId}
              reward={r}
              position={position}
              redeemRadiusM={config.redeemRadiusM}
              demoMode={config.demoMode}
            />
          ))
        )}

        <Text style={[type.overline, styles.muted, styles.sectionGap]}>All shops</Text>
        {shops === undefined ? (
          <Skeleton height={120} />
        ) : shops.length === 0 ? (
          <EmptyState
            icon={<Store size={size.icon} strokeWidth={size.iconStroke} color={color.reward} />}
            title="No shops on the map yet."
          />
        ) : (
          shops.map((s) => <ShopCard key={s.shopId} shop={s} now={now} />)
        )}

        {top && top.length > 0 && (
          <>
            <Text style={[type.overline, styles.muted, styles.sectionGap]}>Top walkers</Text>
            <Card style={styles.cardGap}>
              {top.map((t, i) => (
                <View key={t.playerId} style={styles.row}>
                  <Text style={[type.callout, styles.muted, styles.tabular, styles.rank]}>{i + 1}</Text>
                  <PlayerDot playerColor={t.color} />
                  <Text style={[type.callout, styles.text, styles.grow]} numberOfLines={1}>
                    {t.name}
                  </Text>
                  <Text style={[type.callout, styles.text, styles.tabular]}>{blocks(t.blocks)}</Text>
                </View>
              ))}
            </Card>
          </>
        )}
      </ScrollView>
    </View>
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
  content: { paddingHorizontal: space.lg, gap: space.md },
  sectionGap: { marginTop: space.xl },
  cardGap: { gap: space.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  grow: { flex: 1 },
  rank: { minWidth: space.lg },
  code: { color: color.text, letterSpacing: CODE_SPACING, fontVariant: ['tabular-nums'] },
  text: { color: color.text },
  muted: { color: color.textMuted },
  reward: { color: color.reward },
  accent: { color: color.accent },
  success: { color: color.success },
  danger: { color: color.danger },
  tabular: { fontVariant: ['tabular-nums'] },
});
