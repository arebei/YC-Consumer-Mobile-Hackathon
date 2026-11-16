import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

export type Units = 'metres' | 'miles';
export type Settings = { units: Units; haptics: boolean; reduceMotion: boolean };

const KEY = 'lasso.settings';
const DEFAULTS: Settings = { units: 'metres', haptics: true, reduceMotion: false };

let value: Settings = DEFAULTS;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

/** Read once at startup from the root layout. */
export async function loadSettings(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) {
      value = { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Settings>) };
      emit();
    }
  } catch {
    // defaults
  }
}

export function getSettings(): Settings {
  return value;
}

export function updateSettings(patch: Partial<Settings>) {
  value = { ...value, ...patch };
  emit();
  AsyncStorage.setItem(KEY, JSON.stringify(value)).catch(() => {});
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

export function useSettings(): Settings {
  return useSyncExternalStore(subscribe, getSettings, getSettings);
}
