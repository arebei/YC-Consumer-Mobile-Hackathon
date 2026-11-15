import { useRouter, type Href } from 'expo-router';
import { useEffect, useRef, type ComponentType } from 'react';
import { Animated, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useReduceMotion } from '../lib/motion';
import { color, radius, size, space, type } from '../theme';
import { CloseButton } from './CloseButton';
import {
  ArrowLeftRight,
  ChartColumn,
  House,
  Info,
  Medal,
  Store,
  Trophy,
  UserPlus,
  Wallet,
  Wrench,
} from './icons';

type IconType = ComponentType<{ size?: number; strokeWidth?: number; color?: string }>;
type Row = { label: string; icon: IconType; href: Href | null };

const ROWS: Row[] = [
  { label: 'Home', icon: House, href: null },
  { label: 'Wallet', icon: Wallet, href: '/wallet' },
  { label: 'Exchange', icon: ArrowLeftRight, href: '/exchange' },
  { label: 'Rewards', icon: Trophy, href: '/rewards' },
  { label: 'Shops', icon: Store, href: '/shops' },
  { label: 'Ranking', icon: Medal, href: '/ranking' },
  { label: 'Analytics', icon: ChartColumn, href: '/analytics' },
  { label: 'Invite', icon: UserPlus, href: '/invite' },
  { label: 'About', icon: Info, href: '/about' },
  { label: 'Demo tools', icon: Wrench, href: '/admin' },
];

const SLIDE_MS = 220;
const DISMISS_MS = 250;

/** Right-side menu that slides in over a scrim. "Home" just closes it. */
export function MenuPanel({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const reduce = useReduceMotion();
  const x = useRef(new Animated.Value(size.panel)).current;

  useEffect(() => {
    if (!visible) return;
    if (reduce) {
      x.setValue(0);
      return;
    }
    x.setValue(size.panel);
    Animated.timing(x, { toValue: 0, duration: SLIDE_MS, useNativeDriver: true }).start();
  }, [visible, reduce, x]);

  // iOS drops a new modal presentation that starts while this Modal is still closing,
  // so navigate only once it has dismissed (onDismiss on iOS, a short delay elsewhere).
  const pending = useRef<Href | null>(null);
  const flush = () => {
    const href = pending.current;
    pending.current = null;
    if (href) router.push(href);
  };

  const go = (href: Href | null) => {
    pending.current = href;
    onClose();
    if (Platform.OS !== 'ios') setTimeout(flush, DISMISS_MS);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      onDismiss={Platform.OS === 'ios' ? flush : undefined}>
      <Pressable style={styles.scrim} onPress={onClose} accessibilityLabel="Close menu" />
      <Animated.View
        style={[
          styles.panel,
          { paddingTop: insets.top + space.md, paddingBottom: insets.bottom + space.lg, transform: [{ translateX: x }] },
        ]}>
        <View style={styles.header}>
          <Text style={[type.title1, styles.text]}>Menu</Text>
          <CloseButton onPress={onClose} />
        </View>
        {ROWS.map(({ label, icon: Icon, href }) => (
          <Pressable
            key={label}
            accessibilityRole="button"
            accessibilityLabel={label}
            onPress={() => go(href)}
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
            <Icon size={size.icon} strokeWidth={size.iconStroke} color={label === 'Demo tools' ? color.textMuted : color.accent} />
            <Text style={[type.bodyStrong, styles.text]}>{label}</Text>
          </Pressable>
        ))}
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: color.scrim },
  panel: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: size.panel,
    backgroundColor: color.bg,
    borderLeftWidth: size.hairline,
    borderLeftColor: color.border,
    paddingHorizontal: space.lg,
    gap: space.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: space.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.md,
    paddingHorizontal: space.sm,
    borderRadius: radius.md,
  },
  rowPressed: { backgroundColor: color.surface },
  text: { color: color.text },
});
