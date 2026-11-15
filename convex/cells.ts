import { query } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import type { LatLng } from "./lib/loop";

export type CellView = {
  cellId: string; boundary: LatLng[];
  ownerId: Id<"players">; ownerName: string; ownerColor: string; strength: number;
  ownerFlag: string | null;
};

export const all = query({
  args: {},
  handler: async (ctx): Promise<CellView[]> => {
    const players = new Map<Id<"players">, Doc<"players">>();
    for (const p of await ctx.db.query("players").collect()) players.set(p._id, p);
    const out: CellView[] = [];
    for (const c of await ctx.db.query("cells").collect()) {
      const owner = players.get(c.ownerId);
      out.push({
        cellId: c.cellId, boundary: c.boundary,
        ownerId: c.ownerId, ownerName: owner?.name ?? "Someone", ownerColor: owner?.color ?? "#888888",
        strength: c.strength, ownerFlag: owner?.flag ?? null,
      });
    }
    return out;
  },
});
