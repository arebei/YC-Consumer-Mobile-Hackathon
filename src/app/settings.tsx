import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { AppState, Linking, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { ScreenHeader } from '../components/ScreenHeader';
import { usePlayer } from '../lib/player';
import { updateSettings, useSettings, type Units } from '../lib/settings';
import { color, radius, size, space, type } from '../theme';

type PermState = 'checking' | 'granted' | 'denied' | 'undetermined';

const PERM_TEXT: Record<PermState, string> = {
  checking: 'Checking…',
  granted: 'Allowed while using the app',
  denied: 'Not allowed',
  undetermined: 'Not asked yet',
};

function usePermission(): PermState {
  const [state, setState] = useState<PermState>('checking');
  useEffect(() => {
    const check = () =>
      Location.getForegroundPermissionsAsync()
        .then((p) => setState(p.granted ? 'granted' : p.status === 'undetermined' ? 'undetermined' : 'denied'))
        .catch(() => setState('denied'));
    check();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && check());
    return () => sub.remove();
  }, []);
  return state;
}

function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={styles.rowBetween}>
      <Text style={[type.body, styles.text]}>{label}</Text>
      <Switch
        accessibilityLabel={label}
        value={value}
        onValueChange={onChange}
        trackColor={{ true: color.accent, false: color.border }}
        thumbColor={color.text}
      />
    </View>
  );
}

export default function Settings() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const settings = useSettings();
  const permission = usePermission();
  const { setPlayer } = usePlayer();
  const [confirmSignOut, setConfirmSignOut] = useState(false);

  const signOut = () => {
    // Only this device forgets the player; the player and their blocks stay on the server.
    // Home redirects to Join as soon as no player is stored, so go back to it.
    setPlayer(null);
    if (router.canDismiss()) router.dismissAll();
    else router.replace('/join');
  };

  return (
    <View style={styles.fill}>
      <ScreenHeader title="Settings" />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + space.xxl }]}>
        <Card style={styles.card}>
          <Text style={[type.overline, styles.muted]}>Distance units</Text>
          <View style={styles.segment}>
            {(['metres', 'miles'] as Units[]).map((u) => (
              <Pressable
                key={u}
                accessibilityRole="radio"
                accessibilityLabel={u === 'metres' ? 'Metres' : 'Miles'}
                accessibilityState={{ selected: settings.units === u }}
                onPress={() => updateSettings({ units: u })}
                style={[styles.segmentItem, settings.units === u && styles.segmentOn]}>
                <Text style={[type.bodyStrong, settings.units === u ? styles.onAccent : styles.text]}>
                  {u === 'metres' ? 'Metres' : 'Miles'}
                </Text>
              </Pressable>
            ))}
          </View>
        </Card>

        <Card style={styles.card}>
          <ToggleRow label="Haptics" value={settings.haptics} onChange={(v) => updateSettings({ haptics: v })} />
          <ToggleRow
            label="Reduce motion"
            value={settings.reduceMotion}
            onChange={(v) => updateSettings({ reduceMotion: v })}
          />
          <Text style={[type.caption, styles.faint]}>The system Reduce Motion setting is always respected too.</Text>
        </Card>

        <Card style={styles.card}>
          <Text style={[type.overline, styles.muted]}>Location permission</Text>
          <Text style={[type.bodyStrong, permission === 'granted' ? styles.success : styles.text]}>
            {PERM_TEXT[permission]}
          </Text>
          <Button label="Open settings" variant="secondary" size="medium" onPress={() => Linking.openSettings().catch(() => {})} />
        </Card>

        <Card style={styles.card}>
          {confirmSignOut ? (
            <>
              <Text style={[type.bodyStrong, styles.text]}>Sign out on this device?</Text>
              <Text style={[type.callout, styles.muted]}>Your player and blocks stay on the map.</Text>
              <View style={styles.buttons}>
                <Button label="Sign out" variant="danger" size="medium" onPress={signOut} />
                <Button label="Cancel" variant="ghost" size="medium" onPress={() => setConfirmSignOut(false)} />
              </View>
            </>
          ) : (
            <Button label="Sign out on this device" variant="secondary" size="medium" onPress={() => setConfirmSignOut(true)} />
          )}
        </Card>

        <Button label="About Lasso" variant="ghost" onPress={() => router.push('/about')} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: color.bg },
  content: { paddingHorizontal: space.lg, gap: space.md },
  card: { gap: space.md },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  segment: { flexDirection: 'row', gap: space.sm },
  segmentItem: {
    flex: 1,
    height: size.buttonMedium,
    borderRadius: radius.pill,
    borderWidth: size.hairline,
    borderColor: color.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentOn: { backgroundColor: color.accent, borderColor: color.accent },
  buttons: { flexDirection: 'row', gap: space.sm },
  text: { color: color.text },
  muted: { color: color.textMuted },
  faint: { color: color.textFaint },
  success: { color: color.success },
  onAccent: { color: color.onAccent },
});
