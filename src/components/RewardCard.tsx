import { useMutation } from 'convex/react';
import type { FunctionReturnType } from 'convex/server';
import { Haptics } from '../lib/haptics';
import { useEffect, useRef, useState } from 'react';
import { Animated, Linking, StyleSheet, Text } from 'react-native';

import { api } from '../../convex/_generated/api';
import { haversineM } from '../../convex/lib/loop';
import { errorMessage, formatFee } from '../lib/format';
import { useReduceMotion } from '../lib/motion';
import { demoRedeem, useStore } from '../lib/store';
import { color, space, type } from '../theme';
import { Button } from './Button';
import { Card } from './Card';

type Reward = FunctionReturnType<typeof api.rewards.mine>[number];

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

export function RewardCard({
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


const styles = StyleSheet.create({
  cardGap: { gap: space.sm },
  code: { color: color.text, letterSpacing: CODE_SPACING, fontVariant: ['tabular-nums'] },
  text: { color: color.text },
  muted: { color: color.textMuted },
  reward: { color: color.reward },
  success: { color: color.success },
  danger: { color: color.danger },
});
