import type { MutationCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";
import { MAX_CELLS } from "./config";
import { cellBoundary, cellsInLoop } from "./grid";
import { validateWalk, type Point } from "./loop";
import { planCapture, rejected, walkPoints, type CellState, type ShopRef, type SubmitResult } from "./rules";
import { addPoints } from "./ledger";

/** The whole capture for one walk: walks.submit runs it, and admin.demoSeed reuses it so demo blocks follow the real rules. */
export async function captureWalk(ctx: MutationCtx, player: Doc<"players">, points: Point[], now: number): Promise<SubmitResult> {
  const playerId = player._id;
  const saveRejected = async (reason: "not_closed" | "too_fast" | "too_small" | "too_big", pts: Point[], lengthM: number) => {
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
  // B12: a refresh restarts the decay clock.
  for (const u of plan.upgrades) await ctx.db.patch(cellDocs.get(u.cellId)!._id, { strength: u.strength, claimedAt: now });
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
}
