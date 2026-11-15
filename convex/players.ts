import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { cleanFlag } from "./lib/flag";

export const join = mutation({
  args: { deviceId: v.string(), name: v.string(), color: v.string(), flag: v.optional(v.string()) },
  handler: async (ctx, { deviceId, name, color, flag }) => {
    const clean = name.trim();
    if (clean.length < 1 || clean.length > 16) throw new ConvexError("Pick a nickname of 1 to 16 characters.");
    if (!/^#[0-9A-Fa-f]{6}$/.test(color)) throw new ConvexError("Pick one of the colours.");
    const existing = await ctx.db.query("players").withIndex("by_deviceId", (q) => q.eq("deviceId", deviceId)).unique();
    // A flag that is not sent leaves the saved one alone. A flag that is sent replaces it (blank removes it).
    const saved: string | null = flag === undefined ? (existing?.flag ?? null) : cleanFlag(flag);
    if (existing) {
      await ctx.db.patch(existing._id, { name: clean, color, flag: saved ?? undefined });
      return { playerId: existing._id, name: clean, color, flag: saved };
    }
    const playerId = await ctx.db.insert("players", { deviceId, name: clean, color, ...(saved ? { flag: saved } : {}) });
    return { playerId, name: clean, color, flag: saved };
  },
});

export const setFlag = mutation({
  args: { playerId: v.id("players"), flag: v.string() },
  handler: async (ctx, { playerId, flag }) => {
    const player = await ctx.db.get(playerId);
    if (!player) throw new ConvexError("That player no longer exists. Join again.");
    const saved = cleanFlag(flag);
    await ctx.db.patch(playerId, { flag: saved ?? undefined });
    return { flag: saved };
  },
});

export const list = query({
  args: {},
  handler: async (ctx) =>
    (await ctx.db.query("players").collect()).map((p) => ({ playerId: p._id, name: p.name, color: p.color, flag: p.flag ?? null })),
});
