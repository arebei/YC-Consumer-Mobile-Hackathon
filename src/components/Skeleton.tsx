import { useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { getSettings } from '../lib/settings';
import { color, radius } from '../theme';

const SWEEP_MS = 1200;

/** A `surface` block with a shimmer sweep, shown while a query is `undefined`. */
export function Skeleton({ style, height = 20 }: { style?: StyleProp<ViewStyle>; height?: number }) {
  const t = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let loop: Animated.CompositeAnimation | null = null;
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then((reduce) => {
        if (cancelled || reduce || getSettings().reduceMotion) return;
        loop = Animated.loop(
          Animated.timing(t, { toValue: 1, duration: SWEEP_MS, easing: Easing.linear, useNativeDriver: true }),
        );
        loop.start();
      });
    return () => {
      cancelled = true;
      loop?.stop();
    };
  }, [t]);

  const translateX = t.interpolate({ inputRange: [0, 1], outputRange: [-200, 400] });

  return (
    <View style={[styles.block, { height }, style]} accessibilityLabel="Loading">
      <Animated.View style={[styles.sweep, { transform: [{ translateX }] }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  block: { backgroundColor: color.surface, borderRadius: radius.sm, overflow: 'hidden' },
  sweep: { position: 'absolute', top: 0, bottom: 0, width: 120, backgroundColor: color.elevated, opacity: 0.6 },
});
