import { useMutation } from 'convex/react';
import type { FunctionReturnType } from 'convex/server';
import { Haptics } from '../lib/haptics';
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { api } from '../../convex/_generated/api';
import { haversineM } from '../../convex/lib/loop';
import { errorMessage } from '../lib/format';
import { demoRedeem, useStore } from '../lib/store';
import { color, space, type } from '../theme';
import { Button } from './Button';
import { Card } from './Card';

export type Voucher = FunctionReturnType<typeof api.wallet.mine>['vouchers'][number];

const CODE_SPACING = 6;

/** A voucher bought with points: code, shop, and "Use" with the same radius/demo rule as Redeem. */
export function VoucherCard({
  voucher,
  position,
  redeemRadiusM,
}: {
  voucher: Voucher;
  position: { lat: number; lng: number } | null;
  redeemRadiusM: number;
}) {
  const use = useMutation(api.vouchers.use);
  const demo = useStore(demoRedeem);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const near = position ? haversineM(position, { lat: voucher.shopLat, lng: voucher.shopLng }) <= redeemRadiusM : false;
  const canUse = near || demo;

  const onUse = async () => {
    const at = position ?? { lat: voucher.shopLat, lng: voucher.shopLng };
    setBusy(true);
    setError(null);
    try {
      const res = await use({ voucherId: voucher.voucherId, lat: at.lat, lng: at.lng, ...(demo ? { demo: true } : {}) });
      if (!res.ok) {
        setError(
          res.reason === 'already_used'
            ? 'This voucher was already used.'
            : `You're too far from ${voucher.shopName} to use it.`,
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
    <Card edgeColor={color.accent} style={styles.card}>
      <Text style={[type.bodyStrong, styles.text]}>{voucher.title}</Text>
      <Text style={[type.callout, styles.muted]}>{voucher.shopName}</Text>
      <Text style={[type.hero, styles.code]} selectable>
        {voucher.code}
      </Text>
      {voucher.usedAt !== null ? (
        <Text style={[type.bodyStrong, styles.success]}>Used.</Text>
      ) : (
        <>
          <Button label="Use" onPress={onUse} loading={busy} disabled={!canUse} fullWidth />
          {!canUse && <Text style={[type.callout, styles.muted]}>{`Go to ${voucher.shopName} to use it.`}</Text>}
        </>
      )}
      {error && <Text style={[type.callout, styles.danger]}>{error}</Text>}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: space.sm },
  code: { color: color.text, letterSpacing: CODE_SPACING, fontVariant: ['tabular-nums'] },
  text: { color: color.text },
  muted: { color: color.textMuted },
  success: { color: color.success },
  danger: { color: color.danger },
});
