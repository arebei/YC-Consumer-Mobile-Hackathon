import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { FunctionReturnType } from 'convex/server';

import type { api } from '../../convex/_generated/api';

export type EventView = FunctionReturnType<typeof api.events.forMe>[number];

const key = (playerId: string) => `lasso.dismissedSteal.${playerId}`;

/**
 * The steal to show: the newest event newer than the last one this player dismissed.
 * Fires a heavy haptic once per newly shown event.
 */
export function useStealBanner(playerId: string | undefined, events: EventView[] | undefined) {
  const [dismissedAt, setDismissedAt] = useState<number | null>(null);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const announced = useRef<string | null>(null);

  useEffect(() => {
    if (!playerId) return;
    let alive = true;
    AsyncStorage.getItem(key(playerId))
      .catch(() => null)
      .then((v) => {
        if (!alive) return;
        setDismissedAt(v ? Number(v) : 0);
        setLoadedFor(playerId);
      });
    return () => {
      alive = false;
    };
  }, [playerId]);

  const newest = events?.[0];
  const ready = loadedFor === playerId && dismissedAt !== null;
  const event = ready && newest && newest.createdAt > (dismissedAt ?? 0) ? newest : null;

  useEffect(() => {
    if (!event || announced.current === event.eventId) return;
    announced.current = event.eventId;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
  }, [event]);

  const dismiss = useCallback(() => {
    if (!event || !playerId) return;
    setDismissedAt(event.createdAt);
    AsyncStorage.setItem(key(playerId), String(event.createdAt)).catch(() => {});
  }, [event, playerId]);

  return { event, dismiss };
}

/** Parts of the banner sentence, so the flag can be coloured. Order per spec 7B. */
export function stealParts(e: EventView) {
  const lead = `${e.byName} took ${e.cellCount} of your blocks with a ${e.strength}-block loop`;
  const tail = ` Enclose ${e.needed} to take them back.${e.shopName ? ` They now hold ${e.shopName}.` : ''}`;
  return { lead, flag: e.byFlag, tail };
}
