import { POINTS_PER_10M, POINTS_PER_BLOCK, SHOP_MIN_BLOCKS } from "./config";
import { effectiveStrength, type RejectReason } from "./loop";

// Pure game rules. No database, no clock, no randomness: everything comes in as arguments.
export type CellState = { cellId: string; ownerId: string; strength: number; claimedAt: number };
export type ShopRef = { shopId: string; name: string; cellId: string };

export type SubmitResult = {
  status: "captured" | "rejected";
  reason?: RejectReason;
  strength: number;
  claimed: number;
  stolen: number;
  blocked: number;
  claimedCellIds: string[];
  notes: string[];
  pointsEarned: number; // contract v4: 0 when rejected; walks.submit fills it for captured walks
};

export type CapturePlan = {
  creates: string[];                                         // cellIds to insert: owner = player, strength = n, claimedAt = now
  upgrades: { cellId: string; strength: number }[];           // my own cells: patch strength only
  takes: { cellId: string; fromOwnerId: string }[];           // patch owner, strength = n, claimedAt = now
  holdCredits: { shopId: string; playerId: string; addMs: number }[];
  events: { fromPlayerId: string; cellCount: number; strength: number; shopId?: string }[];
  result: SubmitResult;
};

export function rejected(reason: RejectReason): SubmitResult {
  return { status: "rejected", reason, strength: 0, claimed: 0, stolen: 0, blocked: 0, claimedCellIds: [], notes: [], pointsEarned: 0 };
}

/** Contract v4 rule 1: points for a captured walk. */
export function walkPoints(lengthM: number, claimed: number): number {
  return Math.floor(lengthM / 10) * POINTS_PER_10M + POINTS_PER_BLOCK * claimed;
}

export function shopNeeded(strength: number): number {
  return Math.max(Math.ceil(strength) + 1, SHOP_MIN_BLOCKS);
}

export function planCapture(args: {
  ids: string[];                    // cells inside the loop, de-duplicated
  playerId: string;
  now: number;
  cells: Map<string, CellState>;    // existing cell documents for those ids
  shops: Map<string, ShopRef>;      // every shop, keyed by cellId
}): CapturePlan {
  const { ids, playerId, now, cells, shops } = args;
  const n = ids.length;
  const plan: CapturePlan = {
    creates: [], upgrades: [], takes: [], holdCredits: [], events: [],
    result: { status: "captured", strength: n, claimed: 0, stolen: 0, blocked: 0, claimedCellIds: [], notes: [], pointsEarned: 0 },
  };
  const byVictim = new Map<string, { cellCount: number; shopId?: string }>();

  for (const id of ids) {
    const cell = cells.get(id);
    const shop = shops.get(id);

    // 1. Already mine: keep the stronger number, never reset the clock.
    if (cell && cell.ownerId === playerId) {
      const eff = effectiveStrength(cell.strength, cell.claimedAt, now);
      if (n > eff) plan.upgrades.push({ cellId: id, strength: n });
      continue;
    }
    // 2. Shop blocks need a real walk.
    if (shop && n < SHOP_MIN_BLOCKS) {
      plan.result.notes.push(`${shop.name}'s block needs a loop of ${SHOP_MIN_BLOCKS} or more blocks.`);
      continue;
    }
    // 3. Nobody's: claim it.
    if (!cell) {
      plan.creates.push(id);
      plan.result.claimed++;
      plan.result.claimedCellIds.push(id);
      continue;
    }
    // 4. A rival's: take it only with a strictly bigger loop.
    const eff = effectiveStrength(cell.strength, cell.claimedAt, now);
    if (n > eff) {
      plan.takes.push({ cellId: id, fromOwnerId: cell.ownerId });
      plan.result.claimed++;
      plan.result.stolen++;
      plan.result.claimedCellIds.push(id);
      if (shop) {
        plan.holdCredits.push({ shopId: shop.shopId, playerId: cell.ownerId, addMs: Math.max(0, now - cell.claimedAt) });
      }
      const v = byVictim.get(cell.ownerId) ?? { cellCount: 0 };
      v.cellCount++;
      if (shop && !v.shopId) v.shopId = shop.shopId;
      byVictim.set(cell.ownerId, v);
    } else {
      plan.result.blocked++;
    }
  }

  for (const [fromPlayerId, v] of byVictim) {
    plan.events.push({ fromPlayerId, cellCount: v.cellCount, strength: n, shopId: v.shopId });
  }
  if (plan.result.blocked > 0) {
    plan.result.notes.push(
      `${plan.result.blocked} ${plan.result.blocked === 1 ? "block is" : "blocks are"} held by a bigger loop.`,
    );
  }
  return plan;
}

/** Winner per shop: stored time plus the current holder's unbroken stretch. Shops nobody held are skipped. */
export function seasonWinners(args: {
  shops: ShopRef[];
  holds: { shopId: string; playerId: string; heldMs: number }[];
  cells: Map<string, CellState>;
  now: number;
}): { shopId: string; playerId: string; heldMs: number }[] {
  const out: { shopId: string; playerId: string; heldMs: number }[] = [];
  for (const shop of args.shops) {
    const totals = new Map<string, number>();
    for (const h of args.holds) {
      if (h.shopId === shop.shopId) totals.set(h.playerId, (totals.get(h.playerId) ?? 0) + h.heldMs);
    }
    const cell = args.cells.get(shop.cellId);
    if (cell) totals.set(cell.ownerId, (totals.get(cell.ownerId) ?? 0) + Math.max(0, args.now - cell.claimedAt));
    let best: { playerId: string; heldMs: number } | null = null;
    for (const [playerId, heldMs] of totals) {
      // Ties go to the current holder, then to the first seen.
      if (!best || heldMs > best.heldMs || (heldMs === best.heldMs && cell?.ownerId === playerId)) best = { playerId, heldMs };
    }
    if (best) out.push({ shopId: shop.shopId, ...best });
  }
  return out;
}

const CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no 0/O, 1/I/L
export function makeCode(rand: () => number = Math.random): string {
  let s = "";
  for (let i = 0; i < 6; i++) s += CODE_CHARS[Math.floor(rand() * CODE_CHARS.length)];
  return s;
}
