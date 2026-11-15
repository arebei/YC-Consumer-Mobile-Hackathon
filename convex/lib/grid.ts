import { cellToBoundary, cellToLatLng, gridDisk, latLngToCell, polygonToCells } from "h3-js";
import { AROUND_RINGS, GRID, H3_RES, REF_LAT, SQUARE_SIZE_M } from "./config";
import type { LatLng } from "./loop";

// ---- square fallback ----
const dLat = SQUARE_SIZE_M / 111320;
const dLng = SQUARE_SIZE_M / (111320 * Math.cos((REF_LAT * Math.PI) / 180));
const sqId = (i: number, j: number) => `sq:${i}:${j}`;
const sqParse = (id: string) => {
  const [, i, j] = id.split(":");
  return { i: Number(i), j: Number(j) };
};
const sqOf = (p: LatLng) => ({ i: Math.floor(p.lat / dLat), j: Math.floor(p.lng / dLng) });

export function pointInPolygon(p: LatLng, poly: LatLng[]): boolean {
  let inside = false;
  for (let a = 0, b = poly.length - 1; a < poly.length; b = a++) {
    const A = poly[a], B = poly[b];
    if ((A.lat > p.lat) !== (B.lat > p.lat) &&
        p.lng < ((B.lng - A.lng) * (p.lat - A.lat)) / (B.lat - A.lat) + A.lng) {
      inside = !inside;
    }
  }
  return inside;
}

function squareCellsInLoop(points: LatLng[]): string[] {
  let minI = Infinity, maxI = -Infinity, minJ = Infinity, maxJ = -Infinity;
  for (const p of points) {
    const { i, j } = sqOf(p);
    minI = Math.min(minI, i); maxI = Math.max(maxI, i);
    minJ = Math.min(minJ, j); maxJ = Math.max(maxJ, j);
  }
  if ((maxI - minI + 1) * (maxJ - minJ + 1) > 20000) return new Array(20000).fill("x"); // caller rejects as too_big
  const out: string[] = [];
  for (let i = minI; i <= maxI; i++) {
    for (let j = minJ; j <= maxJ; j++) {
      if (pointInPolygon({ lat: (i + 0.5) * dLat, lng: (j + 0.5) * dLng }, points)) out.push(sqId(i, j));
    }
  }
  return out;
}

// ---- public API: the rest of the backend never knows which grid is in use ----
export function cellOf(p: LatLng): string {
  if (GRID === "h3") return latLngToCell(p.lat, p.lng, H3_RES);
  const { i, j } = sqOf(p);
  return sqId(i, j);
}

export function cellCenter(cellId: string): LatLng {
  if (GRID === "h3") {
    const [lat, lng] = cellToLatLng(cellId);
    return { lat, lng };
  }
  const { i, j } = sqParse(cellId);
  return { lat: (i + 0.5) * dLat, lng: (j + 0.5) * dLng };
}

export function cellBoundary(cellId: string): LatLng[] {
  if (GRID === "h3") return cellToBoundary(cellId).map(([lat, lng]) => ({ lat, lng }));
  const { i, j } = sqParse(cellId);
  return [
    { lat: i * dLat, lng: j * dLng },
    { lat: (i + 1) * dLat, lng: j * dLng },
    { lat: (i + 1) * dLat, lng: (j + 1) * dLng },
    { lat: i * dLat, lng: (j + 1) * dLng },
  ];
}

/** Ids of cells whose centre is inside the closed polygon. De-duplicated. */
export function cellsInLoop(points: LatLng[]): string[] {
  if (points.length < 3) return [];
  if (GRID === "h3") {
    const ids = polygonToCells(points.map((p) => [p.lat, p.lng]), H3_RES);
    return Array.from(new Set(ids));
  }
  return squareCellsInLoop(points);
}

export function cellsAround(p: LatLng, rings = AROUND_RINGS): string[] {
  if (GRID === "h3") return gridDisk(cellOf(p), rings);
  const { i, j } = sqOf(p);
  const out: string[] = [];
  for (let a = -rings; a <= rings; a++) for (let b = -rings; b <= rings; b++) out.push(sqId(i + a, j + b));
  return out;
}
