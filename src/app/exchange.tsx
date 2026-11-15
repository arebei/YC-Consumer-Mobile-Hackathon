import { useMutation, useQuery } from 'convex/react';
import type { FunctionReturnType } from 'convex/server';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { api } from '../../convex/_generated/api';
import { haversineM } from '../../convex/lib/loop';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { Store } from '../components/icons';
import { ScreenHeader } from '../components/ScreenHeader';
import { Skeleton } from '../components/Skeleton';
import { useToast } from '../components/Toast';
import { errorMessage, formatDistance, pts } from '../lib/format';
import { usePlayer } from '../lib/player';
import { useCurrentPosition } from '../lib/position';
import { color, size, space, type } from '../theme';

type Offer = FunctionReturnType<typeof api.offers.list>[number];

export default function Exchange() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const { player } = usePlayer();
  const config = useQuery(api.config.public);
  const offers = useQuery(api.offers.list);
  const wallet = useQuery(api.wallet.mine, player ? { playerId: player.playerId } : 'skip');
  const exchange = useMutation(api.offers.exchange);
  const { position } = useCurrentPosition(config?.center, config?.demoMode);
  const [busy, setBusy] = useState<string | null>(null);

  // offers.list is sorted by shop name, then cost: group consecutive offers by shop.
  const groups = useMemo(() => {
    const out: { shopId: string; shopName: string; distance: number | null; offers: Offer[] }[] = [];
    for (const o of offers ?? []) {
      let g = out.find((x) => x.shopId === o.shopId);
      if (!g) {
        g = {
          shopId: o.shopId,
          shopName: o.shopName,
          distance: position ? haversineM(position, { lat: o.shopLat, lng: o.shopLng }) : null,
          offers: [],
        };
        out.push(g);
      }
      g.offers.push(o);
    }
    return out;
  }, [offers, position?.lat, position?.lng]); // eslint-disable-line react-hooks/exhaustive-deps

  const balance = wallet?.balance;

  const buy = async (o: Offer) => {
    if (!player) return;
    setBusy(o.offerId);
    try {
      const res = await exchange({ playerId: player.playerId, offerId: o.offerId });
      if (res.ok) {
        toast.show('Voucher added to your wallet');
        router.replace('/wallet');
      } else {
        toast.error(`You need ${o.cost - (balance ?? 0)} more points`);
      }
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={styles.fill}>
      <ScreenHeader title="Exchange" />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + space.xxl }]}>
        <Text style={[type.body, styles.muted]}>
          {balance === undefined ? ' ' : `You have ${pts(balance)} to spend.`}
        </Text>
        {offers === undefined ? (
          <Skeleton height={160} />
        ) : groups.length === 0 ? (
          <EmptyState
            icon={<Store size={size.icon} strokeWidth={size.iconStroke} color={color.reward} />}
            title="No offers yet."
            body="Shops add offers when they join the map."
          />
        ) : (
          groups.map((g) => (
            <View key={g.shopId} style={styles.group}>
              <Text style={[type.overline, styles.muted]}>
                {g.distance === null ? g.shopName : `${g.shopName} · ${formatDistance(g.distance)}`}
              </Text>
              {g.offers.map((o) => {
                const short = balance !== undefined && balance < o.cost ? o.cost - balance : 0;
                return (
                  <Card key={o.offerId} style={styles.card}>
                    <View style={styles.row}>
                      <View style={styles.grow}>
                        <Text style={[type.bodyStrong, styles.text]}>{o.title}</Text>
                        <Text style={[type.callout, styles.muted]}>{o.shopName}</Text>
                      </View>
                      <Text style={[type.title2, styles.accent, styles.tabular]}>{pts(o.cost)}</Text>
                    </View>
                    <Button
                      label="Exchange"
                      size="medium"
                      onPress={() => buy(o)}
                      loading={busy === o.offerId}
                      disabled={balance === undefined || short > 0 || (busy !== null && busy !== o.offerId)}
                    />
                    {short > 0 && <Text style={[type.callout, styles.muted]}>{`You need ${short} more points`}</Text>}
                  </Card>
                );
              })}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: color.bg },
  content: { paddingHorizontal: space.lg, gap: space.lg },
  group: { gap: space.sm },
  card: { gap: space.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  grow: { flex: 1 },
  text: { color: color.text },
  muted: { color: color.textMuted },
  accent: { color: color.accent },
  tabular: { fontVariant: ['tabular-nums'] },
});
