import { useQuery } from 'convex/react';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Card } from '../components/Card';
import { PlayerDot } from '../components/PlayerDot';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { api } from '../../convex/_generated/api';
import { EmptyState } from '../components/EmptyState';
import { Ticket, Trophy } from '../components/icons';
import { RewardCard } from '../components/RewardCard';
import { ScreenHeader } from '../components/ScreenHeader';
import { Skeleton } from '../components/Skeleton';
import { VoucherCard } from '../components/VoucherCard';
import { usePlayer } from '../lib/player';
import { useCurrentPosition } from '../lib/position';
import { color, size, space, type } from '../theme';

export default function Rewards() {
  const insets = useSafeAreaInsets();
  const { player } = usePlayer();
  const args = player ? { playerId: player.playerId } : 'skip';
  const config = useQuery(api.config.public);
  const rewards = useQuery(api.rewards.mine, args);
  const shops = useQuery(api.shops.list);
  const router = useRouter();
  const wallet = useQuery(api.wallet.mine, args);
  const { position } = useCurrentPosition(config?.center, config?.demoMode);
  const vouchers = wallet?.vouchers.filter((v) => v.usedAt === null);

  return (
    <View style={styles.fill}>
      <ScreenHeader title="Rewards" />
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

        <Text style={[type.overline, styles.muted, styles.sectionGap]}>Up for grabs this week</Text>
        {shops === undefined ? (
          <Skeleton height={120} />
        ) : shops.length === 0 ? (
          <Text style={[type.body, styles.muted]}>No shop prizes on the map yet.</Text>
        ) : (
          shops.map((s) => {
            const mine = s.holderId === player?.playerId;
            return (
              <Pressable
                key={s.shopId}
                accessibilityRole="button"
                accessibilityLabel={s.name}
                onPress={() => router.push({ pathname: '/store', params: { shopId: s.shopId } })}
                style={({ pressed }) => [pressed && styles.pressed]}>
                <Card style={styles.prize}>
                  <Text style={[type.bodyStrong, styles.reward]}>{s.reward}</Text>
                  <Text style={[type.callout, styles.text]}>{s.name}</Text>
                  <View style={styles.row}>
                    {s.holderColor && <PlayerDot playerColor={s.holderColor} />}
                    <Text style={[type.callout, styles.muted, styles.grow]}>
                      {mine ? 'You hold it now' : s.holderName ? `${s.holderName} holds it now` : 'Nobody holds it yet'}
                    </Text>
                    {!mine && <Text style={[type.callout, styles.accent]}>{`Enclose ${s.needed} to take it`}</Text>}
                  </View>
                </Card>
              </Pressable>
            );
          })
        )}

        <Text style={[type.overline, styles.muted, styles.sectionGap]}>Vouchers</Text>
        {vouchers === undefined || config === undefined ? (
          <Skeleton height={120} />
        ) : vouchers.length === 0 ? (
          <EmptyState
            icon={<Ticket size={size.icon} strokeWidth={size.iconStroke} color={color.accent} />}
            title="No vouchers to use."
            body="Exchange your points for a shop offer."
          />
        ) : (
          vouchers.map((v) => (
            <VoucherCard key={v.voucherId} voucher={v} position={position} redeemRadiusM={config.redeemRadiusM} />
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: color.bg },
  content: { paddingHorizontal: space.lg, gap: space.md },
  sectionGap: { marginTop: space.xl },
  muted: { color: color.textMuted },
  text: { color: color.text },
  reward: { color: color.reward },
  accent: { color: color.accent },
  prize: { gap: space.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' },
  grow: { flexGrow: 1 },
  pressed: { opacity: 0.7 },
});
