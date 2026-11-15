import { StyleSheet, View } from 'react-native';

import { size } from '../theme';

export function PlayerDot({ playerColor, dotSize = size.playerDot }: { playerColor: string; dotSize?: number }) {
  return (
    <View style={[styles.dot, { backgroundColor: playerColor, width: dotSize, height: dotSize, borderRadius: dotSize / 2 }]} />
  );
}

const styles = StyleSheet.create({ dot: {} });
