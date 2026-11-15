import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { DEMO_MODE, REDEEM_RADIUS_M } from "./lib/config";
import { haversineM } from "./lib/loop";

export type RewardView = {
  rewardId: Id<"rewards">; shopId: Id<"shops">; shopName: string; reward: string; code: string;
  shopLat: number; shopLng: number; redeemedAt: number | null;
  feeStatus: "none" | "pending" | "invoiced" | "charged" | "failed"; feeCents: number;
  feeUrl: string | null;
};

export const mine = query({
  args: { playerId: v.id("players") },
  handler: async (ctx, { playerId }): Promise<RewardView[]> => {
    const rows = await ctx.db.query("rewards").withIndex("by_playerId", (q) => q.eq("playerId", playerId)).order("desc").collect();
    const out: RewardView[] = [];
    for (const r of rows) {
      const shop = await ctx.db.get(r.shopId);
      if (!shop) continue;
      out.push({
        rewardId: r._id, shopId: r.shopId, shopName: shop.name, reward: shop.reward, code: r.code,
        shopLat: shop.lat, shopLng: shop.lng, redeemedAt: r.redeemedAt ?? null,
        feeStatus: r.feeStatus, feeCents: shop.feeCents, feeUrl: r.feeUrl ?? null,
      });
    }
    return out;
  },
});

export const redeem = mutation({
  args: { rewardId: v.id("rewards"), lat: v.number(), lng: v.number(), demo: v.optional(v.boolean()) },
  handler: async (ctx, { rewardId, lat, lng, demo }): Promise<{ ok: boolean; reason?: "too_far" | "already_redeemed" }> => {
    const reward = await ctx.db.get(rewardId);
    if (!reward) throw new ConvexError("That reward no longer exists.");
    if (reward.redeemedAt !== undefined) return { ok: false, reason: "already_redeemed" };
    const shop = await ctx.db.get(reward.shopId);
    if (!shop) throw new ConvexError("That shop is no longer part of Lasso.");
    if (!(DEMO_MODE && demo === true) && haversineM({ lat, lng }, { lat: shop.lat, lng: shop.lng }) > REDEEM_RADIUS_M) {
      return { ok: false, reason: "too_far" };
    }
    await ctx.db.patch(rewardId, { redeemedAt: Date.now(), feeStatus: "pending" });
    await ctx.scheduler.runAfter(0, internal.payments.chargeShopFee, { rewardId });
    return { ok: true };
  },
});
