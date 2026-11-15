import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';

const TOTAL_MS = 800;
const CELL_STAGGER_MS = 60;
const FILL_END = 0.65;

/**
 * Capture animation (spec 5.4): each claimed cell fades its fill from 0 to 65%, 60 ms apart,
 * then the block count counts up from 0. 800 ms total, medium haptic at the start.
 * Starts once `ready` is true. With Reduce Motion it shows the end state at once.
 */
export function useCaptureAnimation(cellIds: string[], claimed: number, ready: boolean, reduceMotion: boolean) {
  const [fills, setFills] = useState<Record<string, number> | undefined>(() =>
    reduceMotion ? undefined : Object.fromEntries(cellIds.map((id) => [id, 0])),
  );
  const [count, setCount] = useState(reduceMotion ? claimed : 0);
  const started = useRef(false);

  useEffect(() => {
    if (started.current || !ready) return;
    started.current = true;
    if (reduceMotion || cellIds.length === 0) {
      setFills(undefined);
      setCount(claimed);
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    const timers: ReturnType<typeof setTimeout>[] = [];
    // Keep the whole sequence near 800 ms even for big loops.
    const fadeBudget = TOTAL_MS * 0.6;
    const stagger = Math.min(CELL_STAGGER_MS, fadeBudget / Math.max(1, cellIds.length));
    cellIds.forEach((id, i) => {
      timers.push(setTimeout(() => setFills((f) => ({ ...(f ?? {}), [id]: FILL_END })), i * stagger));
    });
    const countStart = cellIds.length * stagger;
    const countMs = Math.max(150, TOTAL_MS - countStart);
    const steps = Math.min(claimed, 20);
    for (let s = 1; s <= steps; s++) {
      timers.push(setTimeout(() => setCount(Math.round((claimed * s) / steps)), countStart + (countMs * s) / steps));
    }
    timers.push(setTimeout(() => setFills(undefined), TOTAL_MS + 50));
    return () => timers.forEach(clearTimeout);
  }, [ready]); // eslint-disable-line react-hooks/exhaustive-deps

  return { fills, count };
}
