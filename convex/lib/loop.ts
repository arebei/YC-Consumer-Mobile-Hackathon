import {
  CLOSE_RADIUS_M, DECAY_ENABLED, DECAY_EVERY_MS, MAX_ACCURACY_M, MAX_FAST_SHARE, MAX_POINTS,
  MAX_SPEED_MPS, MIN_LOOP_M, MIN_POINTS, SPIKE_SPEED_MPS,
} from "./config";

export type LatLng = { lat: number; lng: number };
export type Point = { lat: number; lng: number; t: number; acc: number };
export type RejectReason = "not_closed" | "too_fast" | "too_small" | "too_big";

const EARTH_R = 6371008.8;
const rad = (d: number) => (d * Math.PI) / 180;

export function haversineM(a: LatLng, b: LatLng): number {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function pathLengthM(points: LatLng[]): number {
  let d = 0;
  for (let i = 1; i < points.length; i++) d += haversineM(points[i - 1], points[i]);
  return d;
}

/** Drop bad points, sort by time, drop GPS jumps. Never throws. */
export function cleanPoints(points: Point[]): Point[] {
  const ok = points
    .filter(
      (p) =>
        Number.isFinite(p.lat) && Number.isFinite(p.lng) && Number.isFinite(p.t) &&
        Math.abs(p.lat) <= 90 && Math.abs(p.lng) <= 180 &&
        Number.isFinite(p.acc) && p.acc <= MAX_ACCURACY_M,
    )
    .sort((a, b) => a.t - b.t)
    .slice(0, MAX_POINTS);
  const out: Point[] = [];
  for (const p of ok) {
    const prev = out[out.length - 1];
    if (prev) {
      const dt = (p.t - prev.t) / 1000;
      const d = haversineM(prev, p);
      if (dt <= 0 && d > 0) continue;                 // same instant, different place
      if (dt > 0 && d / dt > SPIKE_SPEED_MPS) continue; // teleport
    }
    out.push(p);
  }
  return out;
}

/** Expects cleaned points. */
export function isClosed(points: Point[]): boolean {
  if (points.length < MIN_POINTS) return false;
  if (pathLengthM(points) < MIN_LOOP_M) return false;
  return haversineM(points[0], points[points.length - 1]) <= CLOSE_RADIUS_M;
}

/**
 * Share of distance covered faster than MAX_SPEED_MPS.
 * Points are grouped into windows of at least 1 second, so dense points
 * (two per second) are still measured instead of being ignored.
 */
export function fastShare(points: Point[]): number {
  if (points.length < 2) return 0;
  let total = 0, fast = 0, winD = 0, winStart = points[0].t;
  for (let i = 1; i < points.length; i++) {
    winD += haversineM(points[i - 1], points[i]);
    const dt = (points[i].t - winStart) / 1000;
    if (dt >= 1) {
      total += winD;
      if (winD / dt > MAX_SPEED_MPS) fast += winD;
      winD = 0;
      winStart = points[i].t;
    }
  }
  total += winD; // leftover under 1 s counts as distance, never as fast
  return total === 0 ? 0 : fast / total;
}

export function isTooFast(points: Point[]): boolean {
  return fastShare(points) > MAX_FAST_SHARE;
}

/** B12 decay: 1 strength lost per DECAY_EVERY_MS since the block was claimed or refreshed. 0 means the block is free. */
export function effectiveStrength(strength: number, claimedAt: number, now: number): number {
  if (!DECAY_ENABLED) return strength;
  return Math.max(0, strength - Math.floor(Math.max(0, now - claimedAt) / DECAY_EVERY_MS));
}

/** When the effective strength next drops by 1 (null when decay is off). */
export function nextDropAt(claimedAt: number, now: number): number | null {
  if (!DECAY_ENABLED) return null;
  return claimedAt + (Math.floor(Math.max(0, now - claimedAt) / DECAY_EVERY_MS) + 1) * DECAY_EVERY_MS;
}

/** When a block decays to 0 and becomes free (Infinity when decay is off). */
export function decaysAt(strength: number, claimedAt: number): number {
  return DECAY_ENABLED ? claimedAt + strength * DECAY_EVERY_MS : Infinity;
}

/** Steps 1 and 2 of walks.submit. */
export function validateWalk(raw: Point[]):
  | { ok: true; points: Point[]; lengthM: number }
  | { ok: false; reason: RejectReason; points: Point[]; lengthM: number } {
  const points = cleanPoints(raw);
  const lengthM = pathLengthM(points);
  if (!isClosed(points)) return { ok: false, reason: "not_closed", points, lengthM };
  if (isTooFast(points)) return { ok: false, reason: "too_fast", points, lengthM };
  return { ok: true, points, lengthM };
}

/** Test helper and the Fake loop: a closed square path, last point == first point. */
export function squareLoop(
  center: LatLng, sideM: number, endTime: number, speedMps = 1.4, stepM = 5,
): Point[] {
  const half = sideM / 2;
  const dLat = half / 111320;
  const dLng = half / (111320 * Math.cos(rad(center.lat)));
  const corners: LatLng[] = [
    { lat: center.lat - dLat, lng: center.lng - dLng },
    { lat: center.lat + dLat, lng: center.lng - dLng },
    { lat: center.lat + dLat, lng: center.lng + dLng },
    { lat: center.lat - dLat, lng: center.lng + dLng },
    { lat: center.lat - dLat, lng: center.lng - dLng },
  ];
  const steps = Math.max(1, Math.round(sideM / stepM));
  const path: LatLng[] = [corners[0]];
  for (let c = 0; c < 4; c++) {
    for (let s = 1; s <= steps; s++) {
      const f = s / steps;
      path.push({
        lat: corners[c].lat + (corners[c + 1].lat - corners[c].lat) * f,
        lng: corners[c].lng + (corners[c + 1].lng - corners[c].lng) * f,
      });
    }
  }
  const dtMs = ((sideM / steps) / speedMps) * 1000;
  const n = path.length;
  return path.map((p, i) => ({ ...p, t: Math.round(endTime - (n - 1 - i) * dtMs), acc: 5 }));
}
