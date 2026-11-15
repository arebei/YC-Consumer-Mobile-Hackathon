import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { makeCode } from "./lib/rules";
import { addPoints } from "./lib/ledger";

export type OfferView = {
  offerId: Id<"offers">; shopId: Id<"shops">; shopName: string; shopLat: number; shopLng: number; title: string; cost: number;
};

export const list = query({
  args: {},
  handler: async (ctx): Promise<OfferView[]> => {
    const out: OfferView[] = [];
    for (const shop of await ctx.db.query("shops").collect()) {
      for (const o of await ctx.db.query("offers").withIndex("by_shopId", (q) => q.eq("shopId", shop._id)).collect()) {
        out.push({ offerId: o._id, shopId: shop._id, shopName: shop.name, shopLat: shop.lat, shopLng: shop.lng, title: o.title, cost: o.cost });
      }
    }
    return out.sort((a, b) => a.shopName.localeCompare(b.shopName) || a.cost - b.cost);
  },
});

export const exchange = mutation({
  args: { playerId: v.id("players"), offerId: v.id("offers") },
  handler: async (ctx, { playerId, offerId }): Promise<{ ok: boolean; reason?: "not_enough_points"; code?: string }> => {
    const player = await ctx.db.get(playerId);
    if (!player) throw new ConvexError("That player no longer exists. Join again.");
    const offer = await ctx.db.get(offerId);
    if (!offer) throw new ConvexError("That offer is no longer available.");
    const shop = await ctx.db.get(offer.shopId);
    if (!shop) throw new ConvexError("That shop is no longer part of Lasso.");
    if ((player.points ?? 0) < offer.cost) return { ok: false, reason: "not_enough_points" };
    const now = Date.now();
    await addPoints(ctx, playerId, -offer.cost, `Exchanged: ${offer.title} at ${shop.name}`, now);
    const code = makeCode();
    await ctx.db.insert("vouchers", { playerId, offerId, shopId: shop._id, code, createdAt: now });
    return { ok: true, code };
  },
});
