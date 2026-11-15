// @vitest-environment edge-runtime
/// <reference types="vite/client" />
// B8: contract v4 (points, exchange, vouchers, wallet, stats, points leaderboard).
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import { VENUE } from "./lib/config";
import { squareLoop } from "./lib/loop";
import { walkPoints } from "./lib/rules";

const modules = import.meta.glob("./**/*.ts");
const SHOP = { name: "Blue Door", lat: VENUE.lat, lng: VENUE.lng, reward: "Free coffee", feeCents: 100 };

test("walkPoints: floor(lengthM / 10) + 10 per claimed block", () => {
  expect(walkPoints(523.9, 7)).toBe(52 + 70);
  expect(walkPoints(9.9, 0)).toBe(0);
});

test("a captured walk earns points with a ledger row; a rejected walk earns 0", async () => {
  const t = convexTest(schema, modules);
  const now = Date.now();
  const a = await t.mutation(api.players.join, { deviceId: "a", name: "Ana", color: "#3D7BFF" });
  const r = await t.mutation(api.walks.submit, { playerId: a.playerId, points: squareLoop(VENUE, 130, now) });
  expect(r.status).toBe("captured");
  expect(r.pointsEarned).toBeGreaterThan(10 * r.claimed);
  const walk = await t.run(async (ctx) => (await ctx.db.query("walks").collect())[0]);
  expect(r.pointsEarned).toBe(walkPoints(walk.lengthM, r.claimed));

  const bad = await t.mutation(api.walks.submit, { playerId: a.playerId, points: squareLoop(VENUE, 130, now).slice(0, 5) });
  expect(bad).toMatchObject({ status: "rejected", pointsEarned: 0 });

  const w = await t.query(api.wallet.mine, { playerId: a.playerId });
  expect(w.balance).toBe(r.pointsEarned);
  expect(w.history).toEqual([
    { delta: r.pointsEarned, reason: `Walk: ${r.claimed} blocks, ${Math.round(walk.lengthM)} m`, createdAt: expect.any(Number) },
  ]);
  expect(w.vouchers).toEqual([]);

  const s = await t.query(api.stats.mine, { playerId: a.playerId });
  expect(s).toMatchObject({
    points: r.pointsEarned, blocksHeld: r.claimed, walks: 1, totalM: Math.round(walk.lengthM), stealsMade: 0, stealsSuffered: 0,
  });
  expect(s.recent.map((x) => x.status)).toEqual(["rejected", "captured"]);
});

test("exchange: not enough points, then enough; voucher used once; reset clears points", async () => {
  const t = convexTest(schema, modules);
  await t.mutation(api.admin.seedShops, { shops: [SHOP] });
  await t.mutation(api.admin.seedShops, { shops: [SHOP] }); // offers are not duplicated
  const offers = await t.query(api.offers.list, {});
  expect(offers.map((o) => [o.title, o.cost, o.shopName])).toEqual([
    ["10% off your order", 100, "Blue Door"],
    ["Free coffee", 300, "Blue Door"],
  ]);
  const coffee = offers[1];

  const a = await t.mutation(api.players.join, { deviceId: "a", name: "Ana", color: "#3D7BFF" });
  const b = await t.mutation(api.players.join, { deviceId: "b", name: "Sam", color: "#FF4D5E" });
  expect(await t.mutation(api.offers.exchange, { playerId: a.playerId, offerId: coffee.offerId })).toEqual({
    ok: false, reason: "not_enough_points",
  });

  expect(await t.mutation(api.admin.grantPoints, { playerId: a.playerId, amount: 500 })).toEqual({ balance: 500 });
  await t.mutation(api.admin.grantPoints, { playerId: b.playerId, amount: 100 });
  const ex = await t.mutation(api.offers.exchange, { playerId: a.playerId, offerId: coffee.offerId });
  expect(ex.ok).toBe(true);
  expect(ex.code).toMatch(/^[A-Z2-9]{6}$/);

  const w = await t.query(api.wallet.mine, { playerId: a.playerId });
  expect(w.balance).toBe(200);
  expect(w.history.map((h) => [h.delta, h.reason])).toEqual([
    [-300, "Exchanged: Free coffee at Blue Door"],
    [500, "Demo points"],
  ]);
  expect(w.vouchers).toHaveLength(1);
  expect(w.vouchers[0]).toMatchObject({ title: "Free coffee", shopName: "Blue Door", code: ex.code, usedAt: null });

  expect((await t.query(api.leaderboard.points, {})).map((p) => [p.name, p.points])).toEqual([["Ana", 200], ["Sam", 100]]);

  const voucherId = w.vouchers[0].voucherId;
  const far = { lat: VENUE.lat + 0.01, lng: VENUE.lng };
  expect(await t.mutation(api.vouchers.use, { voucherId, ...far })).toEqual({ ok: false, reason: "too_far" });
  expect(await t.mutation(api.vouchers.use, { voucherId, ...VENUE })).toEqual({ ok: true });
  expect(await t.mutation(api.vouchers.use, { voucherId, ...far, demo: true })).toEqual({ ok: false, reason: "already_used" });
  expect((await t.query(api.wallet.mine, { playerId: a.playerId })).vouchers[0].usedAt).not.toBeNull();

  await t.mutation(api.admin.reset, {});
  const after = await t.query(api.wallet.mine, { playerId: a.playerId });
  expect(after).toEqual({ balance: 0, history: [], vouchers: [] });
  expect(await t.query(api.offers.list, {})).toHaveLength(2); // offers stay
});

test("stats.mine counts steals made and suffered", async () => {
  const t = convexTest(schema, modules);
  const now = Date.now();
  const a = await t.mutation(api.players.join, { deviceId: "a", name: "Ana", color: "#3D7BFF" });
  const b = await t.mutation(api.players.join, { deviceId: "b", name: "Sam", color: "#FF4D5E" });
  await t.mutation(api.walks.submit, { playerId: a.playerId, points: squareLoop(VENUE, 130, now) });
  await t.mutation(api.walks.submit, { playerId: b.playerId, points: squareLoop(VENUE, 200, now) });
  expect(await t.query(api.stats.mine, { playerId: a.playerId })).toMatchObject({ stealsMade: 0, stealsSuffered: 1, blocksHeld: 0 });
  expect(await t.query(api.stats.mine, { playerId: b.playerId })).toMatchObject({ stealsMade: 1, stealsSuffered: 0 });
});
