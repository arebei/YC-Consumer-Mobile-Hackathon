import { useConvexConnectionState } from 'convex/react';
import { useEffect, useState } from 'react';

/** Grace period on first launch before saying we are reconnecting. */
const FIRST_CONNECT_GRACE_MS = 5000;

/** True when the Convex socket is down (after first connecting, or 5 s into a cold start). */
export function useReconnecting(): boolean {
  const state = useConvexConnectionState();
  const [graceOver, setGraceOver] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setGraceOver(true), FIRST_CONNECT_GRACE_MS);
    return () => clearTimeout(t);
  }, []);
  if (state.isWebSocketConnected) return false;
  return state.hasEverConnected || graceOver;
}
