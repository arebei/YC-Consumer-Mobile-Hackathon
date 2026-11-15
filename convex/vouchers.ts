import { ConvexError, v } from "convex/values";
import { mutation } from "./_generated/server";
import { DEMO_MODE, REDEEM_RADIUS_M } from "./lib/config";
import { haversineM } from "./lib/loop";

/** Same radius rule and demo flag as rewards.redeem. */
export const use = mutation({
  args: { voucherId: v.id("vouchers"), lat: v.number(), lng: v.number(), demo: v.optional(v.boolean()) },
  handler: async (ctx, { voucherId, lat, lng, demo }): Promise<{ ok: boolean; reason?: "too_far" | "already_used" }> => {
    const voucher = await ctx.db.get(voucherId);
    if (!voucher) throw new ConvexError("That voucher no longer exists.");
    if (voucher.usedAt !== undefined) return { ok: false, reason: "already_used" };
    const shop = await ctx.db.get(voucher.shopId);
    if (!shop) throw new ConvexError("That shop is no longer part of Lasso.");
    if (!(DEMO_MODE && demo === true) && haversineM({ lat, lng }, { lat: shop.lat, lng: shop.lng }) > REDEEM_RADIUS_M) {
      return { ok: false, reason: "too_far" };
    }
    await ctx.db.patch(voucherId, { usedAt: Date.now() });
    return { ok: true };
  },
});
