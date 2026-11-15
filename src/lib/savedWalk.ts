import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Point } from '../../convex/lib/loop';

const KEY = 'lasso.savedWalk';
/** Saved walks older than this are not offered for resume. */
export const RESUME_WINDOW_MS = 30 * 60 * 1000;

export type SavedWalk = { playerId: string; points: Point[]; savedAt: number };

export async function saveWalk(playerId: string, points: Point[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify({ playerId, points, savedAt: Date.now() } satisfies SavedWalk));
  } catch {
    // Saving is a safety net only.
  }
}

export async function loadWalk(): Promise<SavedWalk | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    const w = JSON.parse(raw) as SavedWalk;
    if (!Array.isArray(w.points) || w.points.length === 0) return null;
    if (Date.now() - w.savedAt > RESUME_WINDOW_MS) return null;
    return w;
  } catch {
    return null;
  }
}

export async function clearWalk(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}

/** Points handed to the Walk screen: a saved walk to resume, or a walk to replay. */
let pending: { mode: 'resume' | 'replay'; points: Point[] } | null = null;
export function setPendingWalk(p: typeof pending) {
  pending = p;
}
export function takePendingWalk() {
  const p = pending;
  pending = null;
  return p;
}
