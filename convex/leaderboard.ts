import { query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

export const top = query({
  args: {},
  handler: async (ctx): Promise<{ playerId: Id<"players">; name: string; color: string; blocks: number }[]> => {
    const counts = new Map<Id<"players">, number>();
    for (const c of await ctx.db.query("cells").collect()) counts.set(c.ownerId, (counts.get(c.ownerId) ?? 0) + 1);
    const out: { playerId: Id<"players">; name: string; color: string; blocks: number }[] = [];
    for (const [playerId, blocks] of counts) {
      const p = await ctx.db.get(playerId);
      if (p) out.push({ playerId, name: p.name, color: p.color, blocks });
    }
    return out.sort((a, b) => b.blocks - a.blocks).slice(0, 10);
  },
});
