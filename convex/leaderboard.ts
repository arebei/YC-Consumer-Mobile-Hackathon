import { query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { LEADERBOARD_LIMIT } from "./lib/config";
import { effectiveStrength } from "./lib/loop";

export const top = query({
  args: {},
  handler: async (ctx): Promise<{ playerId: Id<"players">; name: string; color: string; blocks: number }[]> => {
    const counts = new Map<Id<"players">, number>();
    const now = Date.now();
    for (const c of await ctx.db.query("cells").collect()) {
      if (effectiveStrength(c.strength, c.claimedAt, now) <= 0) continue; // B12: decayed blocks are free
      counts.set(c.ownerId, (counts.get(c.ownerId) ?? 0) + 1);
    }
    const out: { playerId: Id<"players">; name: string; color: string; blocks: number }[] = [];
    for (const [playerId, blocks] of counts) {
      const p = await ctx.db.get(playerId);
      if (p) out.push({ playerId, name: p.name, color: p.color, blocks });
    }
    return out.sort((a, b) => b.blocks - a.blocks).slice(0, LEADERBOARD_LIMIT);
  },
});

export const points = query({
  args: {},
  handler: async (ctx): Promise<{ playerId: Id<"players">; name: string; color: string; points: number }[]> =>
    (await ctx.db.query("players").collect())
      .map((p) => ({ playerId: p._id, name: p.name, color: p.color, points: p.points ?? 0 }))
      .sort((a, b) => b.points - a.points)
      .slice(0, LEADERBOARD_LIMIT),
});
