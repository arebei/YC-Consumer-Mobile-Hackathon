import { ConvexError, v } from "convex/values";
import { mutation, type MutationCtx } from "./_generated/server";
import { cellOf } from "./lib/grid";
import { addPoints } from "./lib/ledger";
import { captureWalk } from "./lib/capture";
import { squareLoop } from "./lib/loop";
import venueShops from "../assets/seed-shops.json";

type ShopSeed = { name: string; lat: number; lng: number; reward: string; feeCents: number };

async function upsertShops(ctx: MutationCtx, shops: ShopSeed[]): Promise<void> {
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
}

export const seedShops = mutation({
  args: {
    shops: v.array(v.object({ name: v.string(), lat: v.number(), lng: v.number(), reward: v.string(), feeCents: v.number() })),
  },
  handler: async (ctx, { shops }): Promise<{ count: number }> => {
    await upsertShops(ctx, shops);
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

// B9: three demo players, each holding a venue shop. Colours come from playerColors in src/theme.ts.
const DEMO_PLAYERS = [
  { deviceId: "demo#Sam", name: "Sam", color: "#FF4D5E", flag: "first to the boba", shop: "Happy Cow Creamery & Tea", sideM: 130 },
  { deviceId: "demo#Maya", name: "Maya", color: "#9B5CFF", flag: "my block now", shop: "Neighbor Bakehouse", sideM: 150 },
  { deviceId: "demo#Leo", name: "Leo", color: "#FF8A3D", flag: "run faster", shop: "Piccino Coffee Bar", sideM: 130 },
] as const;
const DEMO_POINTS = 400;

/**
 * Makes the map look lived-in for the demo. Every block goes through captureWalk, the same path as
 * walks.submit, so strengths, shop holds and steal events follow the real rules. Idempotent: a demo
 * player who already exists is skipped. Returns the demo players created now and the cells on the map.
 */
export const demoSeed = mutation({
  args: {},
  handler: async (ctx): Promise<{ players: number; cells: number }> => {
    const existingShops = await ctx.db.query("shops").collect();
    await upsertShops(ctx, (venueShops as ShopSeed[]).filter((s) => !existingShops.some((x) => x.name === s.name)));

    const now = Date.now();
    let players = 0;
    for (const d of DEMO_PLAYERS) {
      if (await ctx.db.query("players").withIndex("by_deviceId", (q) => q.eq("deviceId", d.deviceId)).unique()) continue;
      const shop = (await ctx.db.query("shops").collect()).find((s) => s.name === d.shop);
      if (!shop) continue; // a shop skipped by seeding (same block as another) cannot be walked around
      const playerId = await ctx.db.insert("players", { deviceId: d.deviceId, name: d.name, color: d.color, flag: d.flag });
      const player = (await ctx.db.get(playerId))!;
      await captureWalk(ctx, player, squareLoop({ lat: shop.lat, lng: shop.lng }, d.sideM, now), now);
      await addPoints(ctx, playerId, DEMO_POINTS, "Demo points", now);
      players++;
    }
    return { players, cells: (await ctx.db.query("cells").collect()).length };
  },
});
