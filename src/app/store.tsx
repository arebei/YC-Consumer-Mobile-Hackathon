import { useQuery } from 'convex/react';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { api } from '../../convex/_generated/api';
import { haversineM } from '../../convex/lib/loop';
import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { Store as StoreIcon } from '../components/icons';
import { OfferCard } from '../components/OfferCard';
import { PlayerDot } from '../components/PlayerDot';
import { ScreenHeader } from '../components/ScreenHeader';
import { Skeleton } from '../components/Skeleton';
import { formatDistance, pts } from '../lib/format';
import { usePlayer } from '../lib/player';
import { useCurrentPosition } from '../lib/position';
import { useSettings } from '../lib/settings';
import { color, size, space, type } from '../theme';

export default function StorePage() {
  useSettings(); // re-render when distance units change
  const insets = useSafeAreaInsets();
  const { shopId } = useLocalSearchParams<{ shopId?: string }>();
  const { player } = usePlayer();
  const config = useQuery(api.config.public);
  const shops = useQuery(api.shops.list);
  const offers = useQuery(api.offers.list);
  const wallet = useQuery(api.wallet.mine, player ? { playerId: player.playerId } : 'skip');
  const { position } = useCurrentPosition(config?.center, config?.demoMode);
  const [busy, setBusy] = useState(false);

  const shop = shops?.find((s) => s.shopId === shopId);
  const shopOffers = offers?.filter((o) => o.shopId === shopId);
  const mine = !!shop && shop.holderId === player?.playerId;

  return (
    <View style={styles.fill}>
      <ScreenHeader title={shop?.name ?? 'Store'} />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + space.xxl }]}>
        {shops === undefined ? (
          <Skeleton height={140} />
        ) : !shop ? (
          <EmptyState
            icon={<StoreIcon size={size.icon} strokeWidth={size.iconStroke} color={color.reward} />}
            title="This shop is not on the map any more."
          />
        ) : (
          <Card edgeColor={color.reward} style={styles.card}>
            <Text style={[type.overline, styles.muted]}>
              {position ? `${formatDistance(haversineM(position, shop))} away` : 'Shop'}
            </Text>
            <Text style={[type.title2, styles.reward]}>{shop.reward}</Text>
            <Text style={[type.body, styles.text]}>
              {mine
                ? `You hold it with a ${shop.strength}-block loop.`
                : shop.holderName
                  ? `Held by ${shop.holderName} with a ${shop.strength}-block loop`
                  : 'Nobody holds it'}
            </Text>
            {!mine && <Text style={[type.bodyStrong, styles.accent]}>{`Enclose ${shop.needed} to take it`}</Text>}
            {shop.holderName && shop.holderColor && (
              <View style={styles.row}>
                <PlayerDot playerColor={shop.holderColor} />
                <Text style={[type.callout, styles.muted]}>{`${shop.holderName} holds the block`}</Text>
              </View>
            )}
          </Card>
        )}

        <View style={styles.offersHeader}>
          <Text style={[type.title2, styles.text]}>Offers</Text>
          {wallet && <Text style={[type.callout, styles.muted]}>{`You have ${pts(wallet.balance)}`}</Text>}
        </View>
        {shopOffers === undefined ? (
          <Skeleton height={120} />
        ) : shopOffers.length === 0 ? (
          <Text style={[type.body, styles.muted]}>No offers from this shop yet.</Text>
        ) : (
          shopOffers.map((o) => (
            <OfferCard
              key={o.offerId}
              offer={o}
              balance={wallet?.balance}
              showShop={false}
              busyOther={busy}
              onBusy={setBusy}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: color.bg },
  content: { paddingHorizontal: space.lg, gap: space.md },
  card: { gap: space.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  offersHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: space.lg },
  text: { color: color.text },
  muted: { color: color.textMuted },
  reward: { color: color.reward },
  accent: { color: color.accent },
});
