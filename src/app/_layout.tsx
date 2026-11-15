// Per-weight imports so only these five .ttf files are bundled, not every weight.
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { SpaceGrotesk_600SemiBold } from '@expo-google-fonts/space-grotesk/600SemiBold';
import { SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk/700Bold';
import { ConvexProvider, ConvexReactClient } from 'convex/react';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ToastProvider } from '../components/Toast';
import { PlayerProvider } from '../lib/player';
import { color, space, type } from '../theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

const CONVEX_URL = process.env.EXPO_PUBLIC_CONVEX_URL;
const convex = CONVEX_URL ? new ConvexReactClient(CONVEX_URL, { unsavedChangesWarning: false }) : null;

/** Never block the app on fonts: give up waiting after this long and use the system font. */
const FONT_TIMEOUT_MS = 4000;

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    SpaceGrotesk_700Bold,
    SpaceGrotesk_600SemiBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });
  const [gaveUp, setGaveUp] = useState(false);
  const ready = fontsLoaded || !!fontError || gaveUp;

  useEffect(() => {
    const t = setTimeout(() => setGaveUp(true), FONT_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return <View style={styles.fill} />;

  if (!convex) {
    return (
      <View style={[styles.fill, styles.center]}>
        <Text style={[type.title2, styles.text]}>Lasso can't find its server.</Text>
        <Text style={[type.body, styles.muted]}>EXPO_PUBLIC_CONVEX_URL is not set in this build.</Text>
      </View>
    );
  }

  return (
    <ConvexProvider client={convex}>
      <SafeAreaProvider>
        <PlayerProvider>
          <ToastProvider>
            <StatusBar style="light" />
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: color.bg } }}>
              <Stack.Screen name="index" options={{ animation: 'none' }} />
              <Stack.Screen name="join" options={{ animation: 'fade' }} />
              <Stack.Screen name="home" options={{ animation: 'fade', gestureEnabled: false }} />
              <Stack.Screen name="walk" options={{ animation: 'fade', gestureEnabled: false }} />
              <Stack.Screen name="result" options={{ animation: 'fade', gestureEnabled: false }} />
              <Stack.Screen name="admin" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
              <Stack.Screen name="shops" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
            </Stack>
          </ToastProvider>
        </PlayerProvider>
      </SafeAreaProvider>
    </ConvexProvider>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: color.bg },
  center: { alignItems: 'center', justifyContent: 'center', padding: space.xl, gap: space.sm },
  text: { color: color.text, textAlign: 'center' },
  muted: { color: color.textMuted, textAlign: 'center' },
});
