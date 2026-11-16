import { useState } from 'react';
import { Linking, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { QrCode } from '../components/QrCode';
import { ScreenHeader } from '../components/ScreenHeader';
import { useToast } from '../components/Toast';
import { WEBSITE_URL } from '../lib/links';
import { color, radius, size, space, type } from '../theme';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function Invite() {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const [email, setEmail] = useState('');

  const sendEmail = () => {
    const subject = encodeURIComponent('Join me on Lasso');
    const body = encodeURIComponent(
      `Walk a loop, own the blocks inside it, and win prizes from local shops.\n\nPlay Lasso: ${WEBSITE_URL}`,
    );
    Linking.openURL(`mailto:${email.trim()}?subject=${subject}&body=${body}`).catch(() =>
      toast.error('No email app is set up on this device.'),
    );
  };

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

        <Card style={styles.emailCard}>
          <Text style={[type.overline, styles.muted]}>Invite by email</Text>
          <TextInput
            accessibilityLabel="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="neighbour@example.com"
            placeholderTextColor={color.textFaint}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            style={[type.body, styles.input]}
          />
          <Button label="Send invite" variant="secondary" size="medium" onPress={sendEmail} disabled={!EMAIL_RE.test(email.trim())} />
        </Card>
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
  emailCard: { gap: space.md },
  input: {
    color: color.text,
    backgroundColor: color.bgRaised,
    borderColor: color.border,
    borderWidth: size.hairline,
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
  text: { color: color.text },
  muted: { color: color.textMuted },
  center: { textAlign: 'center' },
});
