import type { MutationCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";

/** Contract v4 rule 3: every balance change writes one ledger row. Returns the new balance. */
export async function addPoints(ctx: MutationCtx, playerId: Id<"players">, delta: number, reason: string, now = Date.now()): Promise<number> {
  const player = await ctx.db.get(playerId);
  if (!player) throw new Error("player missing");
  const balance = (player.points ?? 0) + delta;
  await ctx.db.patch(playerId, { points: balance });
  await ctx.db.insert("ledger", { playerId, delta, reason, createdAt: now });
  return balance;
}
