import { useMutation } from 'convex/react';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { api } from '../../convex/_generated/api';
import { errorMessage } from '../lib/format';
import { usePlayer } from '../lib/player';
import { color, radius, size, space, type } from '../theme';
import { Button } from './Button';
import { FlagField } from './FlagField';
import { useToast } from './Toast';

type Props = { visible: boolean; onClose: () => void; maxChars: number };

/** Bottom sheet to change or remove my flag. */
export function FlagSheet({ visible, onClose, maxChars }: Props) {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { player, setFlag } = usePlayer();
  const setFlagMutation = useMutation(api.players.setFlag);
  const [text, setText] = useState(player?.flag ?? '');
  const [busy, setBusy] = useState<'save' | 'remove' | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setText(player?.flag ?? '');
      setError(null);
    }
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async (value: string, which: 'save' | 'remove') => {
    if (!player) return;
    setBusy(which);
    setError(null);
    try {
      const res = await setFlagMutation({ playerId: player.playerId, flag: value });
      setFlag(res.flag);
      toast.show(res.flag ? 'Flag saved.' : 'Flag removed.');
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.scrim} onPress={onClose} accessibilityLabel="Close" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.anchor}>
        <View style={[styles.sheet, { paddingBottom: insets.bottom + space.lg }]}>
          <Text style={[type.title2, styles.text]}>Your flag</Text>
          <Text style={[type.callout, styles.muted]}>Rivals see it on your blocks and when you take theirs.</Text>
          <FlagField value={text} onChange={setText} max={maxChars} />
          {error && <Text style={[type.callout, styles.danger]}>{error}</Text>}
          <Button
            label="Save"
            onPress={() => save(text, 'save')}
            loading={busy === 'save'}
            disabled={text.trim().length === 0}
            fullWidth
          />
          {player?.flag ? (
            <Button label="Remove" variant="ghost" onPress={() => save('', 'remove')} loading={busy === 'remove'} fullWidth />
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: color.scrim },
  anchor: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: color.bgRaised,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: size.hairline,
    borderColor: color.border,
    padding: space.xl,
    gap: space.md,
  },
  text: { color: color.text },
  muted: { color: color.textMuted },
  danger: { color: color.danger },
});
