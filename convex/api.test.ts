// @vitest-environment edge-runtime
/// <reference types="vite/client" />
// B2-B6: spec section 9 scenarios checked through the public API (game.test.ts checks the tables directly).
import { convexTest } from "convex-test";
import { afterEach, expect, test, vi } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import { VENUE } from "./lib/config";
import { squareLoop } from "./lib/loop";
import { cellOf } from "./lib/grid";

const modules = import.meta.glob("./**/*.ts");
const SHOP = { name: "Blue Door", lat: VENUE.lat, lng: VENUE.lng, reward: "Free coffee", feeCents: 100 };

afterEach(() => {
  vi.useRealTimers();
});

test("T1, T2, T3, T8 via cells.all, events.forMe, walks.last, leaderboard.top", async () => {
  const t = convexTest(schema, modules);
  const now = Date.now();
  const a = await t.mutation(api.players.join, { deviceId: "a", name: "Ana", color: "#3D7BFF" });
  const b = await t.mutation(api.players.join, { deviceId: "b", name: "Sam", color: "#FF4D5E" });
  expect(await t.query(api.walks.last, { playerId: a.playerId })).toBeNull();

  const r1 = await t.mutation(api.walks.submit, { playerId: a.playerId, points: squareLoop(VENUE, 130, now) });
  expect(r1.status).toBe("captured");
  expect(r1.claimed).toBe(r1.strength);
  let cells = await t.query(api.cells.all, {});
  expect(cells.length).toBe(r1.strength);
  expect(
    cells.every((c) => c.ownerId === a.playerId && c.ownerName === "Ana" && c.ownerColor === "#3D7BFF" && c.ownerFlag === null),
  ).toBe(true);
  expect((await t.query(api.walks.last, { playerId: a.playerId }))?.points.length).toBeGreaterThan(8);

  const r2 = await t.mutation(api.walks.submit, { playerId: b.playerId, points: squareLoop(VENUE, 200, now) });
  expect(r2.stolen).toBe(r1.strength);
  const forA = await t.query(api.events.forMe, { playerId: a.playerId });
  expect(forA.length).toBe(1);
  expect(forA[0]).toMatchObject({
    byName: "Sam", byColor: "#FF4D5E", fromName: "Ana", cellCount: r1.strength,
    strength: r2.strength, needed: r2.strength + 1, shopName: null, byFlag: null,
  });
  expect(await t.query(api.events.forMe, { playerId: b.playerId })).toEqual([]);
  expect((await t.query(api.events.recent, {})).length).toBe(1);

  const r3 = await t.mutation(api.walks.submit, { playerId: a.playerId, points: squareLoop(VENUE, 130, now) });
  expect(r3.claimed).toBe(0);
  expect(r3.blocked).toBeGreaterThan(0);
  cells = await t.query(api.cells.all, {});
  expect(cells.every((c) => c.ownerId === b.playerId)).toBe(true);

  const r8 = await t.mutation(api.walks.submit, { playerId: a.playerId, points: squareLoop(VENUE, 130, now).slice(0, 5) });
  expect(r8).toMatchObject({ status: "rejected", reason: "not_closed" });
  // walks.last skips the rejected walk and returns the newest captured one.
  expect(await t.query(api.walks.last, { playerId: a.playerId })).not.toBeNull();

  const top = await t.query(api.leaderboard.top, {});
  expect(top[0]).toMatchObject({ playerId: b.playerId, blocks: cells.length });
});

test("T11: byFlag is frozen on the event; ownerFlag follows the current flag", async () => {
  const t = convexTest(schema, modules);
  const now = Date.now();
  const a = await t.mutation(api.players.join, { deviceId: "a", name: "Ana", color: "#3D7BFF" });
  const b = await t.mutation(api.players.join, { deviceId: "b", name: "Sam", color: "#FF4D5E" });
  await t.mutation(api.walks.submit, { playerId: a.playerId, points: squareLoop(VENUE, 130, now) });
  await t.mutation(api.players.setFlag, { playerId: b.playerId, flag: "thanks for the coffee" });
  await t.mutation(api.walks.submit, { playerId: b.playerId, points: squareLoop(VENUE, 200, now) });
  expect((await t.query(api.events.forMe, { playerId: a.playerId }))[0].byFlag).toBe("thanks for the coffee");
  await t.mutation(api.players.setFlag, { playerId: b.playerId, flag: "mine now" });
  expect((await t.query(api.events.forMe, { playerId: a.playerId }))[0].byFlag).toBe("thanks for the coffee");
  const cells = await t.query(api.cells.all, {});
  expect(cells.length).toBeGreaterThan(0);
  expect(cells.every((c) => c.ownerFlag === "mine now")).toBe(true);
});

test("T4, T10: seedShops is idempotent; a small loop cannot take a shop block", async () => {
  const t = convexTest(schema, modules);
  const now = Date.now();
  expect(await t.mutation(api.admin.seedShops, { shops: [SHOP] })).toEqual({ count: 1 });
  expect(await t.mutation(api.admin.seedShops, { shops: [{ ...SHOP, reward: "Two coffees" }] })).toEqual({ count: 1 });
  // A second shop in the same block is skipped.
  expect(await t.mutation(api.admin.seedShops, { shops: [{ ...SHOP, name: "Next Door" }] })).toEqual({ count: 1 });
  let shops = await t.query(api.shops.list, {});
  expect(shops[0]).toMatchObject({
    name: "Blue Door", reward: "Two coffees", cellId: cellOf(VENUE), holderId: null, strength: 0, needed: 6, top: [],
  });

  const a = await t.mutation(api.players.join, { deviceId: "a", name: "Ana", color: "#3D7BFF" });
  const small = await t.mutation(api.walks.submit, { playerId: a.playerId, points: squareLoop(VENUE, 80, now) });
  expect(small.claimedCellIds).not.toContain(cellOf(VENUE));
  expect(small.notes).toContain("Blue Door's block needs a loop of 6 or more blocks.");
  shops = await t.query(api.shops.list, {});
  expect(shops[0].holderId).toBeNull();
});

test("T5: longest holder wins the season; shops.list shows holder and top", async () => {
  vi.useFakeTimers();
  const t0 = new Date("2026-11-15T20:00:00Z").getTime();
  vi.setSystemTime(t0);
  const t = convexTest(schema, modules);
  await t.mutation(api.admin.seedShops, { shops: [SHOP] });
  const a = await t.mutation(api.players.join, { deviceId: "a", name: "Ana", color: "#3D7BFF" });
  const b = await t.mutation(api.players.join, { deviceId: "b", name: "Sam", color: "#FF4D5E" });

  await t.mutation(api.walks.submit, { playerId: a.playerId, points: squareLoop(VENUE, 130, t0) });
  let shop = (await t.query(api.shops.list, {}))[0];
  expect(shop).toMatchObject({ holderId: a.playerId, top: [{ playerId: a.playerId, heldMs: 0 }] });
  expect(Math.abs(shop.holderSince! - t0)).toBeLessThan(1000); // the mutation's clock may tick a few ms
  expect(shop.needed).toBe(Math.max(shop.strength + 1, 6));

  const t1 = t0 + 60 * 60 * 1000;
  vi.setSystemTime(t1);
  await t.mutation(api.walks.submit, { playerId: b.playerId, points: squareLoop(VENUE, 200, t1) });
  vi.setSystemTime(t1 + 10 * 60 * 1000);

  shop = (await t.query(api.shops.list, {}))[0];
  expect(shop).toMatchObject({ holderId: b.playerId, holderName: "Sam" });
  expect(Math.abs(shop.holderSince! - t1)).toBeLessThan(1000);
  expect(shop.top[0].playerId).toBe(a.playerId);
  expect(Math.abs(shop.top[0].heldMs - 60 * 60 * 1000)).toBeLessThan(1000); // about one hour
  expect(shop.top[1]).toMatchObject({ playerId: b.playerId, heldMs: 0 });
  expect((await t.query(api.events.forMe, { playerId: a.playerId }))[0].shopName).toBe("Blue Door");

  expect(await t.mutation(api.season.end, {})).toEqual({ rewardsCreated: 1 });
  expect(await t.mutation(api.season.end, {})).toEqual({ rewardsCreated: 0 });
  const mine = await t.query(api.rewards.mine, { playerId: a.playerId });
  expect(mine.length).toBe(1);
  expect(mine[0]).toMatchObject({
    shopName: "Blue Door", reward: "Free coffee", feeStatus: "none", feeCents: 100, feeUrl: null, redeemedAt: null,
  });
  expect(mine[0].code).toMatch(/^[A-Z2-9]{6}$/);
  expect(await t.query(api.rewards.mine, { playerId: b.playerId })).toEqual([]);
});

test("T6, T7, T9: redeem distance, demo redeem once, reset keeps players and shops", async () => {
  vi.useFakeTimers();
  const t = convexTest(schema, modules);
  const now = Date.now();
  await t.mutation(api.admin.seedShops, { shops: [SHOP] });
  const a = await t.mutation(api.players.join, { deviceId: "a", name: "Ana", color: "#3D7BFF" });
  await t.mutation(api.walks.submit, { playerId: a.playerId, points: squareLoop(VENUE, 130, now) });
  await t.mutation(api.season.end, {});
  const [reward] = await t.query(api.rewards.mine, { playerId: a.playerId });

  const far = { lat: VENUE.lat + 0.01, lng: VENUE.lng };
  expect(await t.mutation(api.rewards.redeem, { rewardId: reward.rewardId, ...far })).toEqual({ ok: false, reason: "too_far" });
  expect(await t.mutation(api.rewards.redeem, { rewardId: reward.rewardId, ...far, demo: true })).toEqual({ ok: true });
  const after = (await t.query(api.rewards.mine, { playerId: a.playerId }))[0];
  expect(after.feeStatus).toBe("pending");
  expect(after.redeemedAt).not.toBeNull();
  expect(await t.mutation(api.rewards.redeem, { rewardId: reward.rewardId, ...far, demo: true })).toEqual({
    ok: false, reason: "already_redeemed",
  });

  expect(await t.mutation(api.admin.reset, {})).toBeNull();
  expect(await t.query(api.cells.all, {})).toEqual([]);
  expect(await t.query(api.events.recent, {})).toEqual([]);
  expect(await t.query(api.rewards.mine, { playerId: a.playerId })).toEqual([]);
  expect((await t.query(api.players.list, {})).length).toBe(1);
  expect((await t.query(api.shops.list, {})).length).toBe(1);
  // After a reset a new season can be ended again.
  await t.mutation(api.walks.submit, { playerId: a.playerId, points: squareLoop(VENUE, 130, now) });
  expect(await t.mutation(api.season.end, {})).toEqual({ rewardsCreated: 1 });
});
