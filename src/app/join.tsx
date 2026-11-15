import { useMutation, useQuery } from 'convex/react';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { api } from '../../convex/_generated/api';
import { Button } from '../components/Button';
import { FlagField } from '../components/FlagField';
import { Skeleton } from '../components/Skeleton';
import { errorMessage } from '../lib/format';
import { usePlayer } from '../lib/player';
import { requestLocationPermission } from '../lib/position';
import { color, playerColors, radius, size, space, type } from '../theme';

const NAME_MAX = 16;

export default function Join() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const config = useQuery(api.config.public);
  const join = useMutation(api.players.join);
  const { deviceId, setPlayer } = usePlayer();

  const [name, setName] = useState('');
  const [pick, setPick] = useState(0);
  const [flag, setFlag] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canStart = name.trim().length >= 1 && !!deviceId;

  const start = async () => {
    if (!deviceId) return;
    setBusy(true);
    setError(null);
    try {
      const trimmedFlag = flag.trim();
      const res = await join({
        deviceId,
        name: name.trim(),
        color: playerColors[pick],
        ...(trimmedFlag ? { flag: trimmedFlag } : {}),
      });
      setPlayer({ playerId: res.playerId, name: res.name, color: res.color, flag: res.flag });
      await requestLocationPermission();
      router.replace('/home');
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.fill}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.content, { paddingTop: insets.top + space.xxxl, paddingBottom: insets.bottom + space.xl }]}>
        <View style={styles.header}>
          <Text style={[type.hero, styles.text]}>Lasso</Text>
          <Text style={[type.body, styles.muted]}>Walk a loop. Own the blocks inside it.</Text>
        </View>

        <View style={styles.field}>
          <Text style={[type.callout, styles.text]}>Nickname</Text>
          <TextInput
            accessibilityLabel="Nickname"
            value={name}
            onChangeText={setName}
            maxLength={NAME_MAX}
            placeholder="What should rivals call you?"
            placeholderTextColor={color.textFaint}
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="done"
            style={[type.body, styles.input]}
          />
        </View>

        <View style={styles.field}>
          <Text style={[type.callout, styles.text]}>Your colour</Text>
          <View style={styles.swatches}>
            {playerColors.map((c, i) => (
              <Pressable
                key={c}
                accessibilityRole="radio"
                accessibilityLabel={`Colour ${i + 1}`}
                accessibilityState={{ selected: i === pick }}
                onPress={() => setPick(i)}
                style={[styles.ring, i === pick && styles.ringOn]}>
                <View style={[styles.swatch, { backgroundColor: c }]} />
              </Pressable>
            ))}
          </View>
        </View>

        {config ? <FlagField value={flag} onChange={setFlag} max={config.maxFlagChars} /> : <Skeleton height={72} />}

        <View style={styles.spacer} />

        <Button label="Start" onPress={start} loading={busy} disabled={!canStart} fullWidth />
        {error && <Text style={[type.callout, styles.error]}>{error}</Text>}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const RING_GAP = size.ring * 2;

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: color.bg },
  content: { flexGrow: 1, paddingHorizontal: space.xl, gap: space.xl },
  header: { gap: space.sm },
  field: { gap: space.sm },
  text: { color: color.text },
  muted: { color: color.textMuted },
  input: {
    color: color.text,
    backgroundColor: color.surface,
    borderColor: color.border,
    borderWidth: size.hairline,
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  ring: {
    width: size.swatch + RING_GAP * 2,
    height: size.swatch + RING_GAP * 2,
    borderRadius: radius.pill,
    borderWidth: size.ring,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringOn: { borderColor: color.text },
  swatch: { width: size.swatch, height: size.swatch, borderRadius: radius.pill },
  spacer: { flex: 1 },
  error: { color: color.danger, textAlign: 'center' },
});
