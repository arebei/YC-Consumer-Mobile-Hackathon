import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { cellsInLoop } from "./lib/grid";
import type { Point } from "./lib/loop";
import type { SubmitResult } from "./lib/rules";
import { captureWalk } from "./lib/capture";
import { latLng, point } from "./lib/validators";

export const submit = mutation({
  args: { playerId: v.id("players"), points: v.array(point) },
  handler: async (ctx, { playerId, points }): Promise<SubmitResult> => {
    const now = Date.now();
    const player = await ctx.db.get(playerId);
    if (!player) throw new ConvexError("That player no longer exists. Join again.");

    return captureWalk(ctx, player, points, now);
  },
});

export const last = query({
  args: { playerId: v.id("players") },
  handler: async (ctx, { playerId }): Promise<{ points: Point[] } | null> => {
    const recent = await ctx.db.query("walks").withIndex("by_playerId", (q) => q.eq("playerId", playerId)).order("desc").take(10);
    const captured = recent.find((w) => w.status === "captured");
    return captured ? { points: captured.points } : null;
  },
});

export const preview = query({
  args: { points: v.array(latLng) },
  handler: async (_ctx, { points }): Promise<{ cells: number }> =>
    ({ cells: points.length < 3 ? 0 : cellsInLoop(points).length }),
});
