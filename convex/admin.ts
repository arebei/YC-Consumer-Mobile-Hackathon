import { ConvexError, v } from "convex/values";
import { mutation } from "./_generated/server";
import { cellOf } from "./lib/grid";
import { addPoints } from "./lib/ledger";

export const seedShops = mutation({
  args: {
    shops: v.array(v.object({ name: v.string(), lat: v.number(), lng: v.number(), reward: v.string(), feeCents: v.number() })),
  },
  handler: async (ctx, { shops }): Promise<{ count: number }> => {
    for (const s of shops) {
      const cellId = cellOf({ lat: s.lat, lng: s.lng });
      const all = await ctx.db.query("shops").collect(); // tiny table
      const same = all.find((x) => x.name === s.name);
      // Two shops in one block: keep the first, skip the second.
      if (all.some((x) => x.cellId === cellId && x._id !== same?._id)) continue;
      const doc = { name: s.name, lat: s.lat, lng: s.lng, cellId, reward: s.reward, feeCents: s.feeCents };
      let shopId;
      if (same) {
        await ctx.db.patch(same._id, doc);
        shopId = same._id;
      } else {
        shopId = await ctx.db.insert("shops", doc);
      }
      // Contract v4: two offers per shop if it has none.
      if (!(await ctx.db.query("offers").withIndex("by_shopId", (q) => q.eq("shopId", shopId)).first())) {
        await ctx.db.insert("offers", { shopId, title: s.reward, cost: 300 });
        await ctx.db.insert("offers", { shopId, title: "10% off your order", cost: 100 });
      }
    }
    return { count: (await ctx.db.query("shops").collect()).length };
  },
});

export const reset = mutation({
  args: {},
  handler: async (ctx): Promise<null> => {
    for (const table of ["cells", "shopHolds", "walks", "events", "rewards", "ledger", "vouchers"] as const) {
      for (const doc of await ctx.db.query(table).collect()) await ctx.db.delete(doc._id);
    }
    for (const s of await ctx.db.query("season").collect()) await ctx.db.patch(s._id, { endedAt: undefined });
    // Contract v4: balances back to 0. Offers stay.
    for (const p of await ctx.db.query("players").collect()) await ctx.db.patch(p._id, { points: 0 });
    return null;
  },
});

/** Demo tools: "Add 500 points". Ledger reason "Demo points". */
export const grantPoints = mutation({
  args: { playerId: v.id("players"), amount: v.number() },
  handler: async (ctx, { playerId, amount }): Promise<{ balance: number }> => {
    if (!(await ctx.db.get(playerId))) throw new ConvexError("That player no longer exists. Join again.");
    return { balance: await addPoints(ctx, playerId, amount, "Demo points") };
  },
});
