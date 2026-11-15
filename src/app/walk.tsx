// Placeholder until F3 (real tracking, HUD, auto-close).
import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '../components/Button';
import { color, space, type } from '../theme';

export default function Walk() {
  const router = useRouter();
  return (
    <View style={styles.fill}>
      <Text style={[type.title2, styles.text]}>Walk recording arrives next.</Text>
      <Button label="Back to map" onPress={() => router.back()} />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: color.bg, alignItems: 'center', justifyContent: 'center', gap: space.xl, padding: space.xl },
  text: { color: color.text, textAlign: 'center' },
});
