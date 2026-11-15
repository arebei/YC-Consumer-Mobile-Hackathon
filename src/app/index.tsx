import { Redirect } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { usePlayer } from '../lib/player';
import { color } from '../theme';

/** Sends first-time players to Join and returning players straight to the map. */
export default function Index() {
  const { loaded, player } = usePlayer();
  if (!loaded) return <View style={styles.fill} />;
  return <Redirect href={player ? '/home' : '/join'} />;
}

const styles = StyleSheet.create({ fill: { flex: 1, backgroundColor: color.bg } });
