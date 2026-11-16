import { useQuery } from 'convex/react';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { api } from '../../convex/_generated/api';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { Ticket } from '../components/icons';
import { ScreenHeader } from '../components/ScreenHeader';
import { Skeleton } from '../components/Skeleton';
import { StatNumber } from '../components/StatNumber';
import { VoucherCard } from '../components/VoucherCard';
import { OfferCard } from '../components/OfferCard';
import { pts, signed, timeAgo } from '../lib/format';
import { usePlayer } from '../lib/player';
import { useCurrentPosition } from '../lib/position';
import { color, radius, size, space, type } from '../theme';

export default function Wallet() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { player } = usePlayer();
  const config = useQuery(api.config.public);
  const wallet = useQuery(api.wallet.mine, player ? { playerId: player.playerId } : 'skip');
  const offers = useQuery(api.offers.list);
  const balance = wallet?.balance;
  const next =
    balance === undefined || !offers
      ? undefined
      : offers.filter((o) => o.cost > balance).sort((a, b) => a.cost - b.cost)[0] ?? null;
  const affordable =
    balance === undefined || !offers
      ? undefined
      : offers.filter((o) => o.cost <= balance).sort((a, b) => b.cost - a.cost).slice(0, 3);
  const { position } = useCurrentPosition(config?.center, config?.demoMode);

  return (
    <View style={styles.fill}>
      <ScreenHeader title="Wallet" />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + space.xxl }]}>
        {wallet === undefined ? (
          <Skeleton height={72} />
        ) : (
          <StatNumber value={wallet.balance.toLocaleString('en-US')} label="Points" valueColor={color.accent} />
        )}

        {next !== undefined && (
          <Card style={styles.history}>
            <Text style={[type.overline, styles.muted]}>Next voucher</Text>
            {next === null ? (
              <Text style={[type.body, styles.text]}>
                {offers && offers.length > 0 ? 'You can afford every offer on the map.' : 'Offers appear when shops join the map.'}
              </Text>
            ) : (
              <>
                <Text style={[type.bodyStrong, styles.text]}>
                  {`${pts(next.cost - (balance ?? 0))} to a ${next.title}`}
                </Text>
                <View style={styles.track}>
                  <View style={[styles.bar, { width: `${Math.min(100, ((balance ?? 0) / next.cost) * 100)}%` }]} />
                </View>
                <Text style={[type.caption, styles.faint]}>{`at ${next.shopName}. Every 10 m walked is 1 point, every block 10.`}</Text>
              </>
            )}
          </Card>
        )}

        <Text style={[type.overline, styles.muted, styles.sectionGap]}>Offers you can afford</Text>
        {affordable === undefined ? (
          <Skeleton height={100} />
        ) : affordable.length === 0 ? (
          <Text style={[type.body, styles.muted]}>Nothing yet. A 500 m loop earns about 50 points plus 10 per block.</Text>
        ) : (
          affordable.map((o) => <OfferCard key={o.offerId} offer={o} balance={balance} />)
        )}

        <Text style={[type.overline, styles.muted, styles.sectionGap]}>Vouchers</Text>
        {wallet === undefined || config === undefined ? (
          <Skeleton height={120} />
        ) : wallet.vouchers.length === 0 ? (
          <EmptyState
            icon={<Ticket size={size.icon} strokeWidth={size.iconStroke} color={color.accent} />}
            title="No vouchers yet."
            body="Walk to earn points, then exchange them for a shop offer."
          />
        ) : (
          wallet.vouchers.map((v) => (
            <VoucherCard key={v.voucherId} voucher={v} position={position} redeemRadiusM={config.redeemRadiusM} />
          ))
        )}

        <Text style={[type.overline, styles.muted, styles.sectionGap]}>History</Text>
        {wallet === undefined ? (
          <Skeleton height={120} />
        ) : wallet.history.length === 0 ? (
          <Text style={[type.body, styles.muted]}>Your first walk earns your first points.</Text>
        ) : (
          <Card style={styles.history}>
            {wallet.history.map((h, i) => (
              <View key={`${h.createdAt}-${i}`} style={styles.row}>
                <View style={styles.grow}>
                  <Text style={[type.callout, styles.text]} numberOfLines={2}>
                    {h.reason}
                  </Text>
                  <Text style={[type.caption, styles.faint]}>{timeAgo(h.createdAt)}</Text>
                </View>
                <Text style={[type.bodyStrong, styles.tabular, h.delta >= 0 ? styles.success : styles.danger]}>
                  {signed(h.delta)}
                </Text>
              </View>
            ))}
          </Card>
        )}
      </ScrollView>
      <View style={[styles.bottom, { paddingBottom: insets.bottom + space.lg }]}>
        <Button label="Exchange points" onPress={() => router.push('/exchange')} fullWidth />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: color.bg },
  content: { paddingHorizontal: space.lg, gap: space.md },
  sectionGap: { marginTop: space.lg },
  history: { gap: space.md },
  track: { height: space.sm, borderRadius: radius.pill, backgroundColor: color.border, overflow: 'hidden' },
  bar: { height: '100%', backgroundColor: color.accent },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  grow: { flex: 1 },
  bottom: { paddingHorizontal: space.lg, paddingTop: space.sm },
  text: { color: color.text },
  muted: { color: color.textMuted },
  faint: { color: color.textFaint },
  success: { color: color.success },
  danger: { color: color.danger },
  tabular: { fontVariant: ['tabular-nums'] },
});
