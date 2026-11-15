import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { color, space, type } from '../theme';
import { CloseButton } from './CloseButton';

/** Full-screen page header: title in `title1` and a "Close" button that goes back. */
export function ScreenHeader({ title }: { title: string }) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  return (
    <View style={[styles.header, { paddingTop: insets.top + space.md }]}>
      <Text style={[type.title1, styles.text]}>{title}</Text>
      <CloseButton onPress={() => (router.canGoBack() ? router.back() : router.replace('/home'))} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.lg,
    paddingBottom: space.md,
  },
  text: { color: color.text },
});
