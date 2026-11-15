import { v } from "convex/values";
import { query, type QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";

export type EventView = {
  eventId: Id<"events">; byName: string; byColor: string; fromName: string;
  byFlag: string | null;
  cellCount: number; strength: number; needed: number;
  shopName: string | null; createdAt: number;
};

async function toViews(ctx: QueryCtx, events: Doc<"events">[]): Promise<EventView[]> {
  const out: EventView[] = [];
  for (const e of events) {
    const by = await ctx.db.get(e.byPlayerId);
    const from = await ctx.db.get(e.fromPlayerId);
    const shop = e.shopId ? await ctx.db.get(e.shopId) : null;
    out.push({
      eventId: e._id,
      byName: by?.name ?? "Someone", byColor: by?.color ?? "#888888", fromName: from?.name ?? "Someone",
      byFlag: e.byFlag ?? null, // stored at the moment of the steal; never the taker's current flag
      cellCount: e.cellCount, strength: e.strength, needed: e.strength + 1,
      shopName: shop?.name ?? null, createdAt: e.createdAt,
    });
  }
  return out;
}

export const forMe = query({
  args: { playerId: v.id("players") },
  handler: async (ctx, { playerId }): Promise<EventView[]> => {
    const events = await ctx.db
      .query("events").withIndex("by_fromPlayerId", (q) => q.eq("fromPlayerId", playerId)).order("desc").take(5);
    return toViews(ctx, events);
  },
});

export const recent = query({
  args: {},
  handler: async (ctx): Promise<EventView[]> => toViews(ctx, await ctx.db.query("events").order("desc").take(10)),
});
