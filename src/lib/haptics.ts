import * as ExpoHaptics from 'expo-haptics';

import { getSettings } from './settings';

/** expo-haptics, silenced when Settings > Haptics is off. Same names as the module. */
export const Haptics = {
  ImpactFeedbackStyle: ExpoHaptics.ImpactFeedbackStyle,
  NotificationFeedbackType: ExpoHaptics.NotificationFeedbackType,
  impactAsync: (style?: ExpoHaptics.ImpactFeedbackStyle) =>
    getSettings().haptics ? ExpoHaptics.impactAsync(style) : Promise.resolve(),
  notificationAsync: (type?: ExpoHaptics.NotificationFeedbackType) =>
    getSettings().haptics ? ExpoHaptics.notificationAsync(type) : Promise.resolve(),
};
