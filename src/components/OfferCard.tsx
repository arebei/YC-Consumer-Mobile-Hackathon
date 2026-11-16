import { useMutation } from 'convex/react';
import type { FunctionReturnType } from 'convex/server';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { api } from '../../convex/_generated/api';
import { errorMessage, pts } from '../lib/format';
import { usePlayer } from '../lib/player';
import { color, space, type } from '../theme';
import { Button } from './Button';
import { Card } from './Card';
import { useToast } from './Toast';

export type Offer = FunctionReturnType<typeof api.offers.list>[number];

/** One shop offer: title, cost in points, "Exchange" (disabled with "You need N more points" when short). */
export function OfferCard({
  offer,
  balance,
  showShop = true,
  busyOther = false,
  onBusy,
}: {
  offer: Offer;
  balance: number | undefined;
  showShop?: boolean;
  busyOther?: boolean;
  onBusy?: (busy: boolean) => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const { player } = usePlayer();
  const exchange = useMutation(api.offers.exchange);
  const [busy, setBusy] = useState(false);
  const short = balance !== undefined && balance < offer.cost ? offer.cost - balance : 0;

  const buy = async () => {
    if (!player) return;
    setBusy(true);
    onBusy?.(true);
    try {
      const res = await exchange({ playerId: player.playerId, offerId: offer.offerId });
      if (res.ok) {
        toast.show('Voucher added to your wallet');
        router.replace('/wallet');
      } else {
        toast.error(`You need ${offer.cost - (balance ?? 0)} more points`);
      }
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
      onBusy?.(false);
    }
  };

  return (
    <Card style={styles.card}>
      <View style={styles.row}>
        <View style={styles.grow}>
          <Text style={[type.bodyStrong, styles.text]}>{offer.title}</Text>
          {showShop && <Text style={[type.callout, styles.muted]}>{offer.shopName}</Text>}
        </View>
        <Text style={[type.title2, styles.accent, styles.tabular]}>{pts(offer.cost)}</Text>
      </View>
      <Button
        label="Exchange"
        size="medium"
        onPress={buy}
        loading={busy}
        disabled={balance === undefined || short > 0 || (busyOther && !busy)}
      />
      {short > 0 && <Text style={[type.callout, styles.muted]}>{`You need ${short} more points`}</Text>}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: space.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  grow: { flex: 1 },
  text: { color: color.text },
  muted: { color: color.textMuted },
  accent: { color: color.accent },
  tabular: { fontVariant: ['tabular-nums'] },
});
