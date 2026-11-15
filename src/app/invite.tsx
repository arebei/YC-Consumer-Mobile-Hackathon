import { Linking, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { QrCode } from '../components/QrCode';
import { ScreenHeader } from '../components/ScreenHeader';
import { useToast } from '../components/Toast';
import { WEBSITE_URL } from '../lib/links';
import { color, radius, size, space, type } from '../theme';

export default function Invite() {
  const insets = useSafeAreaInsets();
  const toast = useToast();

  const share = async () => {
    try {
      await Share.share({
        message: `Walk a loop, own the blocks inside it, win prizes from local shops. Join me on Lasso: ${WEBSITE_URL}`,
        url: WEBSITE_URL,
      });
    } catch {
      toast.error('Something went wrong. Try again.');
    }
  };

  return (
    <View style={styles.fill}>
      <ScreenHeader title="Invite" />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + space.xxl }]}>
        <Text style={[type.title2, styles.text]}>Invite your neighbours</Text>
        <Text style={[type.body, styles.muted]}>
          More walkers on your streets means more blocks to fight over. Send them the link or let them scan the code.
        </Text>
        <Card style={styles.qrCard}>
          <View style={styles.qrFrame}>
            <QrCode value={WEBSITE_URL} px={size.qr} />
          </View>
          <Text style={[type.caption, styles.muted, styles.center]} selectable>
            {WEBSITE_URL}
          </Text>
        </Card>
        <Button label="Open website" variant="secondary" onPress={() => Linking.openURL(WEBSITE_URL).catch(() => {})} />
      </ScrollView>
      <View style={[styles.bottom, { paddingBottom: insets.bottom + space.lg }]}>
        <Button label="Share invite" onPress={share} fullWidth />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: color.bg },
  content: { paddingHorizontal: space.lg, gap: space.lg },
  qrCard: { alignItems: 'center', gap: space.md },
  qrFrame: { borderRadius: radius.md, overflow: 'hidden' },
  bottom: { paddingHorizontal: space.lg, paddingTop: space.sm },
  text: { color: color.text },
  muted: { color: color.textMuted },
  center: { textAlign: 'center' },
});
