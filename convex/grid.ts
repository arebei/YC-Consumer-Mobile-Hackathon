import { v } from "convex/values";
import { query } from "./_generated/server";
import { cellBoundary, cellsAround } from "./lib/grid";
import type { LatLng } from "./lib/loop";

export const around = query({
  args: { lat: v.number(), lng: v.number() },
  handler: async (_ctx, { lat, lng }): Promise<{ cellId: string; boundary: LatLng[] }[]> =>
    cellsAround({ lat, lng }).map((cellId) => ({ cellId, boundary: cellBoundary(cellId) })),
});
