import { ConvexError } from 'convex/values';

import { getSettings } from './settings';

export const GENERIC_ERROR = 'Something went wrong. Try again.';

/** The plain sentence from a ConvexError, or the generic sentence for anything else. */
export function errorMessage(e: unknown): string {
  if (e instanceof ConvexError && typeof e.data === 'string') return e.data;
  // ConvexError can lose its prototype across bundles; fall back to the data field.
  const data = (e as { data?: unknown } | null)?.data;
  if (typeof data === 'string' && data.length > 0) return data;
  return GENERIC_ERROR;
}

/** Metres: "300 m" / "1.2 km". Miles (Settings): "500 ft" under 0.1 mi, else "0.4 mi". */
export function formatDistance(m: number): string {
  if (getSettings().units === 'miles') {
    const mi = m / 1609.344;
    if (mi < 0.1) return `${Math.round(m * 3.28084)} ft`;
    return `${mi.toFixed(1)} mi`;
  }
  if (m < 1000) return `${Math.round(m)} m`;
  return `${(m / 1000).toFixed(1)} km`;
}

/** "under a minute", "12 min", "2 h 10 min". */
export function formatHeld(ms: number): string {
  const min = Math.floor(ms / 60000);
  if (min < 1) return 'under a minute';
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const rest = min % 60;
  return rest === 0 ? `${h} h` : `${h} h ${rest} min`;
}

/** "$1.00" */
export function formatFee(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/** "1 block" / "7 blocks" */
export function blocks(n: number): string {
  return n === 1 ? '1 block' : `${n} blocks`;
}

/** Counts user-visible characters (emoji count as one), as the spec asks. */
export function charCount(text: string): number {
  return Array.from(text).length;
}

export function clampChars(text: string, max: number): string {
  const chars = Array.from(text);
  return chars.length <= max ? text : chars.slice(0, max).join('');
}

/** "just now", "5 min ago", "3 h ago", "2 d ago". */
export function timeAgo(ts: number, now: number = Date.now()): string {
  const min = Math.floor(Math.max(0, now - ts) / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min} min ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} h ago`;
  return `${Math.floor(h / 24)} d ago`;
}

/** "300 pts" */
export function pts(n: number): string {
  return `${n.toLocaleString('en-US')} pts`;
}

/** "+12" / "-300" */
export function signed(n: number): string {
  return n > 0 ? `+${n}` : `${n}`;
}
