import { mutation } from "./_generated/server";
import { makeCode, seasonWinners, type CellState, type ShopRef } from "./lib/rules";
import type { Id } from "./_generated/dataModel";

export const end = mutation({
  args: {},
  handler: async (ctx): Promise<{ rewardsCreated: number }> => {
    if (await ctx.db.query("rewards").first()) return { rewardsCreated: 0 };
    const now = Date.now();

    const shopDocs = await ctx.db.query("shops").collect();
    const shops: ShopRef[] = shopDocs.map((s) => ({ shopId: s._id, name: s.name, cellId: s.cellId }));
    const holds: { shopId: string; playerId: string; heldMs: number }[] = [];
    const cells = new Map<string, CellState>();
    for (const s of shopDocs) {
      for (const h of await ctx.db.query("shopHolds").withIndex("by_shopId", (q) => q.eq("shopId", s._id)).collect()) {
        holds.push({ shopId: h.shopId, playerId: h.playerId, heldMs: h.heldMs });
      }
      const cell = await ctx.db.query("cells").withIndex("by_cellId", (q) => q.eq("cellId", s.cellId)).unique();
      if (cell) cells.set(s.cellId, { cellId: cell.cellId, ownerId: cell.ownerId, strength: cell.strength, claimedAt: cell.claimedAt });
    }

    const winners = seasonWinners({ shops, holds, cells, now });
    for (const w of winners) {
      await ctx.db.insert("rewards", {
        shopId: w.shopId as Id<"shops">, playerId: w.playerId as Id<"players">, code: makeCode(), feeStatus: "none",
      });
    }

    const season = await ctx.db.query("season").first();
    if (season) await ctx.db.patch(season._id, { endedAt: now });
    else await ctx.db.insert("season", { endedAt: now });
    return { rewardsCreated: winners.length };
  },
});
