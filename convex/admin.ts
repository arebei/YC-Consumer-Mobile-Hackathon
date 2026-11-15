import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { cellOf } from "./lib/grid";

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
      if (same) await ctx.db.patch(same._id, doc);
      else await ctx.db.insert("shops", doc);
    }
    return { count: (await ctx.db.query("shops").collect()).length };
  },
});

export const reset = mutation({
  args: {},
  handler: async (ctx): Promise<null> => {
    for (const table of ["cells", "shopHolds", "walks", "events", "rewards"] as const) {
      for (const doc of await ctx.db.query(table).collect()) await ctx.db.delete(doc._id);
    }
    for (const s of await ctx.db.query("season").collect()) await ctx.db.patch(s._id, { endedAt: undefined });
    return null;
  },
});
