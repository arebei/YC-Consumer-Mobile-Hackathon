import { v } from "convex/values";
import { query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

export type VoucherView = {
  voucherId: Id<"vouchers">; offerId: Id<"offers">; shopName: string; shopLat: number; shopLng: number;
  title: string; code: string; createdAt: number; usedAt: number | null;
};

export const mine = query({
  args: { playerId: v.id("players") },
  handler: async (ctx, { playerId }): Promise<{
    balance: number;
    history: { delta: number; reason: string; createdAt: number }[];
    vouchers: VoucherView[];
  }> => {
    const player = await ctx.db.get(playerId);
    const rows = await ctx.db.query("ledger").withIndex("by_playerId", (q) => q.eq("playerId", playerId)).order("desc").take(30);
    const vouchers: VoucherView[] = [];
    for (const vch of await ctx.db.query("vouchers").withIndex("by_playerId", (q) => q.eq("playerId", playerId)).order("desc").collect()) {
      const offer = await ctx.db.get(vch.offerId);
      const shop = await ctx.db.get(vch.shopId);
      if (!offer || !shop) continue;
      vouchers.push({
        voucherId: vch._id, offerId: vch.offerId, shopName: shop.name, shopLat: shop.lat, shopLng: shop.lng,
        title: offer.title, code: vch.code, createdAt: vch.createdAt, usedAt: vch.usedAt ?? null,
      });
    }
    return {
      balance: player?.points ?? 0,
      history: rows.map((r) => ({ delta: r.delta, reason: r.reason, createdAt: r.createdAt })),
      vouchers,
    };
  },
});
