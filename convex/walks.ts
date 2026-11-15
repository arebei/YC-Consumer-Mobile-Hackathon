import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { MAX_CELLS } from "./lib/config";
import { cellBoundary, cellsInLoop } from "./lib/grid";
import { validateWalk, type Point } from "./lib/loop";
import { planCapture, rejected, walkPoints, type CellState, type ShopRef, type SubmitResult } from "./lib/rules";
import { addPoints } from "./lib/ledger";
import { latLng, point } from "./lib/validators";

export const submit = mutation({
  args: { playerId: v.id("players"), points: v.array(point) },
  handler: async (ctx, { playerId, points }): Promise<SubmitResult> => {
    const now = Date.now();
    const player = await ctx.db.get(playerId);
    if (!player) throw new ConvexError("That player no longer exists. Join again.");

    const saveRejected = async (reason: "not_closed" | "too_fast" | "too_small" | "too_big", pts: typeof points, lengthM: number) => {
      await ctx.db.insert("walks", { playerId, points: pts.slice(0, 600), lengthM, cellCount: 0, status: "rejected", reason, createdAt: now });
      return rejected(reason);
    };

    // 1 + 2. Clean, closed, not too fast.
    const walk = validateWalk(points);
    if (!walk.ok) return saveRejected(walk.reason, walk.points, walk.lengthM);

    // 3. Which blocks are inside.
    const ids = cellsInLoop(walk.points);
    if (ids.length === 0) return saveRejected("too_small", walk.points, walk.lengthM);
    if (ids.length > MAX_CELLS) return saveRejected("too_big", walk.points, walk.lengthM);

    // 4. Load what the rules need.
    const cellDocs = new Map<string, Doc<"cells">>();
    const cells = new Map<string, CellState>();
    for (const id of ids) {
      const doc = await ctx.db.query("cells").withIndex("by_cellId", (q) => q.eq("cellId", id)).unique();
      if (doc) {
        cellDocs.set(id, doc);
        cells.set(id, { cellId: id, ownerId: doc.ownerId, strength: doc.strength, claimedAt: doc.claimedAt });
      }
    }
    const shops = new Map<string, ShopRef>();
    for (const s of await ctx.db.query("shops").collect()) shops.set(s.cellId, { shopId: s._id, name: s.name, cellId: s.cellId });

    // 5. Decide (pure), then write exactly what the plan says.
    const plan = planCapture({ ids, playerId, now, cells, shops });
    const n = ids.length;
    for (const id of plan.creates) {
      await ctx.db.insert("cells", { cellId: id, boundary: cellBoundary(id), ownerId: playerId, strength: n, claimedAt: now });
    }
    for (const u of plan.upgrades) await ctx.db.patch(cellDocs.get(u.cellId)!._id, { strength: u.strength });
    for (const t of plan.takes) await ctx.db.patch(cellDocs.get(t.cellId)!._id, { ownerId: playerId, strength: n, claimedAt: now });
    for (const h of plan.holdCredits) {
      const shopId = h.shopId as Id<"shops">;
      const holderId = h.playerId as Id<"players">;
      const rows = await ctx.db.query("shopHolds").withIndex("by_shopId", (q) => q.eq("shopId", shopId)).collect();
      const row = rows.find((r) => r.playerId === holderId);
      if (row) await ctx.db.patch(row._id, { heldMs: row.heldMs + h.addMs });
      else await ctx.db.insert("shopHolds", { shopId, playerId: holderId, heldMs: h.addMs });
    }
    for (const e of plan.events) {
      await ctx.db.insert("events", { type: "steal", byPlayerId: playerId, fromPlayerId: e.fromPlayerId as Id<"players">, cellCount: e.cellCount, strength: e.strength,
        ...(e.shopId ? { shopId: e.shopId as Id<"shops"> } : {}),
        ...(player.flag ? { byFlag: player.flag } : {}), // the taker's flag at the moment of the steal
        createdAt: now });
    }
    await ctx.db.insert("walks", { playerId, points: walk.points, lengthM: walk.lengthM, cellCount: n, status: "captured", createdAt: now });
    // Contract v4: points for the walk, with one ledger row.
    const pointsEarned = walkPoints(walk.lengthM, plan.result.claimed);
    await addPoints(ctx, playerId, pointsEarned, `Walk: ${plan.result.claimed} blocks, ${Math.round(walk.lengthM)} m`, now);
    return { ...plan.result, pointsEarned };
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
