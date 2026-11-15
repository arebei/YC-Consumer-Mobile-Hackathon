// Tiny in-memory stores shared between screens (route params only carry strings).
import { useSyncExternalStore } from 'react';

import type { FunctionReturnType } from 'convex/server';

import type { api } from '../../convex/_generated/api';

export type SubmitResult = FunctionReturnType<typeof api.walks.submit>;

function createStore<T>(initial: T) {
  let value = initial;
  const listeners = new Set<() => void>();
  return {
    get: () => value,
    set: (next: T) => {
      value = next;
      listeners.forEach((l) => l());
    },
    subscribe: (l: () => void) => {
      listeners.add(l);
      return () => {
        listeners.delete(l);
      };
    },
  };
}

/** The newest walks.submit answer, read by the Result screen. */
export const lastResult = createStore<SubmitResult | null>(null);

/** Demo tools "Demo redeem" toggle, read by the Shops screen. */
export const demoRedeem = createStore<boolean>(false);

export function useStore<T>(store: ReturnType<typeof createStore<T>>): T {
  return useSyncExternalStore(store.subscribe, store.get, store.get);
}
