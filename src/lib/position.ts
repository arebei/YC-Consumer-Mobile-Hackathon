import * as Location from 'expo-location';
import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import type { LatLng } from '../../convex/lib/loop';

export type PermissionState = 'unknown' | 'granted' | 'denied';

export type PositionState = {
  position: LatLng | null;
  /** True when `position` is the venue centre, not a real fix. */
  usingVenue: boolean;
  permission: PermissionState;
};

/** Seconds without a fix before falling back to the venue (spec section 6). */
const FIX_TIMEOUT_MS = 8000;

export async function requestLocationPermission(): Promise<boolean> {
  try {
    const res = await Location.requestForegroundPermissionsAsync();
    return res.granted;
  } catch {
    return false;
  }
}

/**
 * The player's position while the app is open, for Home.
 * Falls back to `center` when there is no fix after 8 s, or when permission is denied in demo mode.
 */
export function useCurrentPosition(center: LatLng | undefined, demoMode: boolean | undefined): PositionState {
  const [fix, setFix] = useState<LatLng | null>(null);
  const [permission, setPermission] = useState<PermissionState>('unknown');
  const [timedOut, setTimedOut] = useState(false);
  const [recheck, setRecheck] = useState(0);
  const gotFix = useRef(false);

  // Re-read the permission when coming back from Settings.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') setRecheck((n) => n + 1);
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    let sub: Location.LocationSubscription | null = null;
    let cancelled = false;
    const timer = setTimeout(() => {
      if (!gotFix.current) setTimedOut(true);
    }, FIX_TIMEOUT_MS);

    (async () => {
      try {
        let perm = await Location.getForegroundPermissionsAsync();
        // Never asked yet (for example a stored player after a reinstall): ask once here.
        if (!perm.granted && perm.status === Location.PermissionStatus.UNDETERMINED) {
          perm = await Location.requestForegroundPermissionsAsync();
        }
        if (cancelled) return;
        if (!perm.granted) {
          setPermission('denied');
          return;
        }
        setPermission('granted');
        const last = await Location.getLastKnownPositionAsync().catch(() => null);
        if (last && !cancelled) {
          gotFix.current = true;
          setFix({ lat: last.coords.latitude, lng: last.coords.longitude });
        }
        sub = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.Balanced, timeInterval: 3000, distanceInterval: 5 },
          (loc) => {
            gotFix.current = true;
            setTimedOut(false);
            setFix({ lat: loc.coords.latitude, lng: loc.coords.longitude });
          },
        );
        if (cancelled) sub.remove();
      } catch {
        if (!cancelled) setTimedOut(true);
      }
    })();

    return () => {
      cancelled = true;
      clearTimeout(timer);
      sub?.remove();
    };
  }, [recheck]);

  if (fix) return { position: fix, usingVenue: false, permission };
  const fallback = timedOut || (permission === 'denied' && demoMode === true);
  if (fallback && center) return { position: center, usingVenue: true, permission };
  return { position: null, usingVenue: false, permission };
}
