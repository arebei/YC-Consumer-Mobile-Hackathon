import { v } from "convex/values";
import { query } from "./_generated/server";
import { effectiveStrength } from "./lib/loop";

export const mine = query({
  args: { playerId: v.id("players") },
  handler: async (ctx, { playerId }): Promise<{
    points: number; blocksHeld: number; walks: number; totalM: number; stealsMade: number; stealsSuffered: number;
    recent: { createdAt: number; lengthM: number; cellCount: number; status: "captured" | "rejected" }[];
  }> => {
    const player = await ctx.db.get(playerId);
    const now = Date.now();
    const blocksHeld = (await ctx.db.query("cells").withIndex("by_ownerId", (q) => q.eq("ownerId", playerId)).collect())
      .filter((c) => effectiveStrength(c.strength, c.claimedAt, now) > 0).length; // B12: decayed blocks are free
    const walks = await ctx.db.query("walks").withIndex("by_playerId", (q) => q.eq("playerId", playerId)).order("desc").collect();
    const captured = walks.filter((w) => w.status === "captured");
    const stealsSuffered = (await ctx.db.query("events").withIndex("by_fromPlayerId", (q) => q.eq("fromPlayerId", playerId)).collect()).length;
    // The schema has no index on byPlayerId; the events table stays small at a hackathon.
    const stealsMade = (await ctx.db.query("events").collect()).filter((e) => e.byPlayerId === playerId).length;
    return {
      points: player?.points ?? 0,
      blocksHeld,
      walks: captured.length,
      totalM: Math.round(captured.reduce((sum, w) => sum + w.lengthM, 0)),
      stealsMade,
      stealsSuffered,
      recent: walks.slice(0, 30).map((w) => ({ createdAt: w.createdAt, lengthM: w.lengthM, cellCount: w.cellCount, status: w.status })),
    };
  },
});
