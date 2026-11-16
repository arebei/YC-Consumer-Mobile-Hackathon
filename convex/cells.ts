import { query } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { effectiveStrength, nextDropAt, type LatLng } from "./lib/loop";

export type CellView = {
  cellId: string; boundary: LatLng[];
  ownerId: Id<"players">; ownerName: string; ownerColor: string; strength: number;
  ownerFlag: string | null;
  fadesAt: number | null; // B12: when the strength next drops by 1 (ms); null when decay is off
};

export const all = query({
  args: {},
  handler: async (ctx): Promise<CellView[]> => {
    const players = new Map<Id<"players">, Doc<"players">>();
    for (const p of await ctx.db.query("players").collect()) players.set(p._id, p);
    const out: CellView[] = [];
    const now = Date.now();
    for (const c of await ctx.db.query("cells").collect()) {
      // B12: effective strength; a block decayed to 0 is free, so it is not returned.
      const strength = effectiveStrength(c.strength, c.claimedAt, now);
      if (strength <= 0) continue;
      const owner = players.get(c.ownerId);
      out.push({
        cellId: c.cellId, boundary: c.boundary,
        ownerId: c.ownerId, ownerName: owner?.name ?? "Someone", ownerColor: owner?.color ?? "#888888",
        strength, ownerFlag: owner?.flag ?? null, fadesAt: nextDropAt(c.claimedAt, now),
      });
    }
    return out;
  },
});
