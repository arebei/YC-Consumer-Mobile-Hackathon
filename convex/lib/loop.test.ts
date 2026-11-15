import { describe, expect, test } from "vitest";
import { GRID, MAX_FAST_SHARE, VENUE } from "./config";
import { cleanPoints, fastShare, haversineM, isClosed, pathLengthM, squareLoop, validateWalk } from "./loop";
import { cellBoundary, cellCenter, cellOf, cellsAround, cellsInLoop, pointInPolygon } from "./grid";
import { makeCode, planCapture, seasonWinners, shopNeeded, type CellState, type ShopRef } from "./rules";

const NOW = 1_800_000_000_000;

describe("loop", () => {
  test("1. 50 m square at walking pace is closed and not too fast", () => {
    const p = squareLoop(VENUE, 50, NOW);
    expect(pathLengthM(p)).toBeGreaterThan(195);
    expect(pathLengthM(p)).toBeLessThan(205);
    expect(isClosed(cleanPoints(p))).toBe(true);
    expect(fastShare(p)).toBeLessThanOrEqual(MAX_FAST_SHARE);
    expect(p[p.length - 1].t).toBe(NOW);
  });
  test("2. 30 m square is not closed (under MIN_LOOP_M)", () => {
    expect(isClosed(cleanPoints(squareLoop(VENUE, 30, NOW)))).toBe(false);
  });
  test("3. a path ending 60 m from its start is not closed", () => {
    const p = squareLoop(VENUE, 60, NOW);
    const open = p.slice(0, p.length - 12); // stop 60 m short along the last side
    expect(haversineM(open[0], open[open.length - 1])).toBeGreaterThan(55);
    expect(isClosed(cleanPoints(open))).toBe(false);
    expect(validateWalk(open)).toMatchObject({ ok: false, reason: "not_closed" });
  });
  test("4. 50 m square at 10 m/s is too fast", () => {
    const p = squareLoop(VENUE, 50, NOW, 10);
    expect(fastShare(p)).toBeGreaterThan(MAX_FAST_SHARE);
    expect(validateWalk(p)).toMatchObject({ ok: false, reason: "too_fast" });
  });
  test("5. one point with acc 80 is dropped and the loop still closes", () => {
    const p = squareLoop(VENUE, 50, NOW);
    p[10] = { ...p[10], acc: 80 };
    const c = cleanPoints(p);
    expect(c.length).toBe(p.length - 1);
    expect(isClosed(c)).toBe(true);
  });
  test("a single GPS teleport is dropped, not counted as speeding", () => {
    const p = squareLoop(VENUE, 130, NOW);
    p[20] = { ...p[20], lat: p[20].lat + 0.003 }; // ~330 m jump with good accuracy
    expect(validateWalk(p).ok).toBe(true);
  });
  test("a running pace of 4.5 m/s passes", () => {
    expect(validateWalk(squareLoop(VENUE, 130, NOW, 4.5)).ok).toBe(true);
  });
  test("unsorted points are sorted by time", () => {
    const p = squareLoop(VENUE, 50, NOW).reverse();
    expect(validateWalk(p).ok).toBe(true);
  });
});

describe("grid", () => {
  test("6. 130 m square holds 5 to 11 hexagons (9 to 16 squares), all centres inside", () => {
    const loop = squareLoop(VENUE, 130, NOW);
    const ids = cellsInLoop(loop);
    const [lo, hi] = GRID === "h3" ? [5, 11] : [9, 16];
    expect(ids.length).toBeGreaterThanOrEqual(lo);
    expect(ids.length).toBeLessThanOrEqual(hi);
    for (const id of ids) expect(pointInPolygon(cellCenter(id), loop)).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
  });
  test("the large Fake loop (200 m) always beats the small one (130 m)", () => {
    for (const [dLat, dLng] of [[0, 0], [0.0004, 0.0003], [-0.0007, 0.0011], [0.0013, -0.0009], [-0.0021, -0.0017]]) {
      const c = { lat: VENUE.lat + dLat, lng: VENUE.lng + dLng };
      const small = cellsInLoop(squareLoop(c, 130, NOW)).length;
      const large = cellsInLoop(squareLoop(c, 200, NOW)).length;
      expect(small).toBeGreaterThanOrEqual(6); // enough for a shop block
      expect(large).toBeGreaterThan(small);
    }
  });
  test("cellOf / cellBoundary / cellsAround", () => {
    const id = cellOf(VENUE);
    const b = cellBoundary(id);
    expect(b.length).toBeGreaterThanOrEqual(4);
    expect(pointInPolygon(VENUE, b)).toBe(true);
    expect(cellsAround(VENUE).length).toBe(GRID === "h3" ? 127 : 169);
  });
});

describe("rules", () => {
  const ids = ["a", "b", "c", "d", "e", "f", "g", "h"];
  const shop: ShopRef = { shopId: "S1", name: "Blue Door", cellId: "c" };
  const shops = new Map([[shop.cellId, shop]]);
  const mk = (owner: string, strength: number, list: string[], claimedAt = NOW - 3_600_000) =>
    new Map<string, CellState>(list.map((cellId) => [cellId, { cellId, ownerId: owner, strength, claimedAt }]));

  test("empty map: everything is claimed", () => {
    const plan = planCapture({ ids, playerId: "A", now: NOW, cells: new Map(), shops });
    expect(plan.creates).toEqual(ids);
    expect(plan.result).toMatchObject({ status: "captured", strength: 8, claimed: 8, stolen: 0, blocked: 0 });
    expect(plan.events).toEqual([]);
  });
  test("bigger loop steals, credits the shop holder, writes one event per victim", () => {
    const plan = planCapture({ ids: [...ids, "i", "j"], playerId: "B", now: NOW, cells: mk("A", 8, ids), shops });
    expect(plan.takes.length).toBe(8);
    expect(plan.creates).toEqual(["i", "j"]);
    expect(plan.result).toMatchObject({ strength: 10, claimed: 10, stolen: 8, blocked: 0 });
    expect(plan.holdCredits).toEqual([{ shopId: "S1", playerId: "A", addMs: 3_600_000 }]);
    expect(plan.events).toEqual([{ fromPlayerId: "A", cellCount: 8, strength: 10, shopId: "S1" }]);
  });
  test("equal or smaller loop is blocked", () => {
    const plan = planCapture({ ids, playerId: "B", now: NOW, cells: mk("A", 8, ids), shops });
    expect(plan.takes).toEqual([]);
    expect(plan.result).toMatchObject({ claimed: 0, stolen: 0, blocked: 8 });
    expect(plan.result.notes).toContain("8 blocks are held by a bigger loop.");
  });
  test("a 4-block loop cannot touch a shop block, even an empty one", () => {
    const plan = planCapture({ ids: ["a", "b", "c", "d"], playerId: "A", now: NOW, cells: new Map(), shops });
    expect(plan.creates).toEqual(["a", "b", "d"]);
    expect(plan.result.notes).toEqual(["Blue Door's block needs a loop of 6 or more blocks."]);
  });
  test("my own cells: strength only goes up, clock never resets, nothing counted", () => {
    const up = planCapture({ ids: [...ids, "i"], playerId: "A", now: NOW, cells: mk("A", 8, ids), shops });
    expect(up.upgrades.length).toBe(8);
    expect(up.result).toMatchObject({ claimed: 1, stolen: 0 });
    const down = planCapture({ ids: ids.slice(0, 6), playerId: "A", now: NOW, cells: mk("A", 8, ids), shops });
    expect(down.upgrades).toEqual([]);
    expect(down.result.claimed).toBe(0);
  });
  test("two victims produce two events", () => {
    const cells = new Map([...mk("A", 3, ["a", "b"]), ...mk("C", 3, ["d"])]);
    const plan = planCapture({ ids, playerId: "B", now: NOW, cells, shops });
    expect(plan.events.length).toBe(2);
    expect(plan.result.stolen).toBe(3);
  });
  test("shopNeeded", () => {
    expect(shopNeeded(0)).toBe(6);
    expect(shopNeeded(5)).toBe(6);
    expect(shopNeeded(8)).toBe(9);
  });
  test("season: stored time plus the current stretch decides", () => {
    const cells = mk("B", 10, ["c"], NOW - 1_000);
    const w = seasonWinners({ shops: [shop, { shopId: "S2", name: "x", cellId: "zz" }],
      holds: [{ shopId: "S1", playerId: "A", heldMs: 5_000 }, { shopId: "S1", playerId: "B", heldMs: 4_500 }], cells, now: NOW });
    expect(w).toEqual([{ shopId: "S1", playerId: "B", heldMs: 5_500 }]);
  });
  test("codes are 6 unambiguous characters", () => {
    expect(makeCode()).toMatch(/^[A-HJKMNP-Z2-9]{6}$/);
  });
});
