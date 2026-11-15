import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

import type { Id } from '../../convex/_generated/dataModel';

export type ActivePlayer = {
  playerId: Id<'players'>;
  name: string;
  color: string;
  flag: string | null;
};

type PlayerCtx = {
  /** false until AsyncStorage has been read. */
  loaded: boolean;
  deviceId: string | null;
  player: ActivePlayer | null;
  setPlayer: (p: ActivePlayer | null) => void;
  setFlag: (flag: string | null) => void;
};

const DEVICE_KEY = 'lasso.deviceId';
const PLAYER_KEY = 'lasso.activePlayer';

const Ctx = createContext<PlayerCtx | null>(null);

export function usePlayer(): PlayerCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('usePlayer must be used inside <PlayerProvider>');
  return c;
}

function randomId(): string {
  const hex = '0123456789abcdef';
  let s = '';
  for (let i = 0; i < 32; i++) s += hex[Math.floor(Math.random() * 16)];
  return `d_${s}`;
}

async function safeGet(key: string): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string | null) {
  (value === null ? AsyncStorage.removeItem(key) : AsyncStorage.setItem(key, value)).catch(() => {});
}

/** Device identity plus the active player (switchable from Demo tools), both persisted. */
export function PlayerProvider({ children }: { children: ReactNode }) {
  const [loaded, setLoaded] = useState(false);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [player, setPlayerState] = useState<ActivePlayer | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let id = await safeGet(DEVICE_KEY);
      if (!id) {
        id = randomId();
        safeSet(DEVICE_KEY, id);
      }
      let stored: ActivePlayer | null = null;
      const raw = await safeGet(PLAYER_KEY);
      if (raw) {
        try {
          stored = JSON.parse(raw) as ActivePlayer;
        } catch {
          stored = null;
        }
      }
      if (cancelled) return;
      setDeviceId(id);
      setPlayerState(stored);
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setPlayer = useCallback((p: ActivePlayer | null) => {
    setPlayerState(p);
    safeSet(PLAYER_KEY, p ? JSON.stringify(p) : null);
  }, []);

  const setFlag = useCallback((flag: string | null) => {
    setPlayerState((cur) => {
      if (!cur) return cur;
      const next = { ...cur, flag };
      safeSet(PLAYER_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return <Ctx.Provider value={{ loaded, deviceId, player, setPlayer, setFlag }}>{children}</Ctx.Provider>;
}
