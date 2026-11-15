import { query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { shopNeeded } from "./lib/rules";

export type ShopView = {
  shopId: Id<"shops">; name: string; lat: number; lng: number; reward: string; feeCents: number;
  cellId: string;
  holderId: Id<"players"> | null; holderName: string | null; holderColor: string | null;
  holderSince: number | null;
  strength: number;
  needed: number;
  top: { playerId: Id<"players">; name: string; color: string; heldMs: number }[];
};

export const list = query({
  args: {},
  handler: async (ctx): Promise<ShopView[]> => {
    const out: ShopView[] = [];
    for (const s of await ctx.db.query("shops").collect()) {
      const cell = await ctx.db.query("cells").withIndex("by_cellId", (q) => q.eq("cellId", s.cellId)).unique();
      const holder = cell ? await ctx.db.get(cell.ownerId) : null;
      const strength = cell && holder ? cell.strength : 0;

      const rows = await ctx.db.query("shopHolds").withIndex("by_shopId", (q) => q.eq("shopId", s._id)).collect();
      const holds = rows.map((r) => ({ playerId: r.playerId, heldMs: r.heldMs }));
      // The current holder is always listed, even before they have stored time.
      if (holder && !holds.some((h) => h.playerId === holder._id)) holds.push({ playerId: holder._id, heldMs: 0 });
      holds.sort((a, b) => b.heldMs - a.heldMs);

      const top: ShopView["top"] = [];
      for (const h of holds) {
        if (top.length === 3) break;
        const p = await ctx.db.get(h.playerId);
        if (p) top.push({ playerId: p._id, name: p.name, color: p.color, heldMs: h.heldMs });
      }

      out.push({
        shopId: s._id, name: s.name, lat: s.lat, lng: s.lng, reward: s.reward, feeCents: s.feeCents, cellId: s.cellId,
        holderId: holder?._id ?? null, holderName: holder?.name ?? null, holderColor: holder?.color ?? null,
        holderSince: holder && cell ? cell.claimedAt : null,
        strength, needed: shopNeeded(strength), top,
      });
    }
    return out;
  },
});
