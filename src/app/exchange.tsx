import { useQuery } from 'convex/react';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { api } from '../../convex/_generated/api';
import { haversineM } from '../../convex/lib/loop';
import { EmptyState } from '../components/EmptyState';
import { Store } from '../components/icons';
import { OfferCard, type Offer } from '../components/OfferCard';
import { ScreenHeader } from '../components/ScreenHeader';
import { Skeleton } from '../components/Skeleton';
import { formatDistance, pts } from '../lib/format';
import { usePlayer } from '../lib/player';
import { useCurrentPosition } from '../lib/position';
import { useSettings } from '../lib/settings';
import { color, size, space, type } from '../theme';

export default function Exchange() {
  useSettings(); // re-render when distance units change
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { player } = usePlayer();
  const config = useQuery(api.config.public);
  const offers = useQuery(api.offers.list);
  const wallet = useQuery(api.wallet.mine, player ? { playerId: player.playerId } : 'skip');
  const { position } = useCurrentPosition(config?.center, config?.demoMode);
  const [busy, setBusy] = useState(false);

  // offers.list is sorted by shop name, then cost: group by shop.
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
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={g.shopName}
                onPress={() => router.push({ pathname: '/store', params: { shopId: g.shopId } })}
                style={({ pressed }) => [styles.groupHeader, pressed && styles.pressed]}>
                <Store size={size.icon - space.sm} strokeWidth={size.iconStroke} color={color.reward} />
                <Text style={[type.bodyStrong, styles.text, styles.grow]} numberOfLines={1}>
                  {g.shopName}
                </Text>
                {g.distance !== null && (
                  <Text style={[type.callout, styles.muted]}>{formatDistance(g.distance)}</Text>
                )}
                <Text style={[type.callout, styles.accent]}>View</Text>
              </Pressable>
              {g.offers.map((o) => (
                <OfferCard key={o.offerId} offer={o} balance={balance} showShop={false} busyOther={busy} onBusy={setBusy} />
              ))}
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
  groupHeader: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: space.xs },
  pressed: { opacity: 0.6 },
  grow: { flex: 1 },
  text: { color: color.text },
  muted: { color: color.textMuted },
  accent: { color: color.accent },
});
