// @vitest-environment edge-runtime
/// <reference types="vite/client" />
// B12: block decay. A block loses 1 strength per DECAY_EVERY_MS since it was claimed or refreshed; at 0 it is free.
import { convexTest } from "convex-test";
import { afterEach, expect, test, vi } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import { DECAY_EVERY_MS, VENUE } from "./lib/config";
import { effectiveStrength, nextDropAt, squareLoop } from "./lib/loop";

const modules = import.meta.glob("./**/*.ts");
const SHOP = { name: "Blue Door", lat: VENUE.lat, lng: VENUE.lng, reward: "Free coffee", feeCents: 100 };
const H = DECAY_EVERY_MS;
const T0 = new Date("2026-11-15T20:00:00Z").getTime();

afterEach(() => {
  vi.useRealTimers();
});

test("effectiveStrength loses 1 per period and stops at 0; nextDropAt is the next period boundary", () => {
  expect(effectiveStrength(7, T0, T0)).toBe(7);
  expect(effectiveStrength(7, T0, T0 + H - 1)).toBe(7);
  expect(effectiveStrength(7, T0, T0 + 3 * H)).toBe(4);
  expect(effectiveStrength(7, T0, T0 + 7 * H)).toBe(0);
  expect(effectiveStrength(7, T0, T0 + 20 * H)).toBe(0);
  expect(nextDropAt(T0, T0 + 2.5 * H)).toBe(T0 + 3 * H);
});

test("blocks decay to free: off the map, no shop holder, off the leaderboard", async () => {
  vi.useFakeTimers();
  vi.setSystemTime(T0);
  const t = convexTest(schema, modules);
  await t.mutation(api.admin.seedShops, { shops: [SHOP] });
  const a = await t.mutation(api.players.join, { deviceId: "a", name: "Ana", color: "#3D7BFF" });
  const r = await t.mutation(api.walks.submit, { playerId: a.playerId, points: squareLoop(VENUE, 130, T0) });
  const n = r.strength;

  vi.setSystemTime(T0 + 2 * H + 60_000);
  let cells = await t.query(api.cells.all, {});
  expect(cells.length).toBe(n);
  expect(cells.every((c) => c.strength === n - 2)).toBe(true);
  expect(Math.abs(cells[0].fadesAt! - (T0 + 3 * H))).toBeLessThan(1000);
  let shop = (await t.query(api.shops.list, {}))[0];
  expect(shop).toMatchObject({ holderName: "Ana", strength: n - 2 });

  vi.setSystemTime(T0 + n * H + 60_000);
  cells = await t.query(api.cells.all, {});
  expect(cells).toEqual([]);
  shop = (await t.query(api.shops.list, {}))[0];
  expect(shop).toMatchObject({ holderId: null, strength: 0, needed: 6 });
  expect(await t.query(api.leaderboard.top, {})).toEqual([]);
  expect((await t.query(api.stats.mine, { playerId: a.playerId })).blocksHeld).toBe(0);

  // A decayed block is claimed, not stolen: no steal event.
  const b = await t.mutation(api.players.join, { deviceId: "b", name: "Sam", color: "#FF4D5E" });
  const rb = await t.mutation(api.walks.submit, { playerId: b.playerId, points: squareLoop(VENUE, 130, Date.now()) });
  expect(rb).toMatchObject({ stolen: 0, blocked: 0 });
  expect(rb.claimed).toBe(n);
  expect(await t.query(api.events.forMe, { playerId: a.playerId })).toEqual([]);
  expect((await t.query(api.shops.list, {}))[0].holderName).toBe("Sam");
});

test("a smaller loop steals once the defender has decayed below it", async () => {
  vi.useFakeTimers();
  vi.setSystemTime(T0);
  const t = convexTest(schema, modules);
  const a = await t.mutation(api.players.join, { deviceId: "a", name: "Ana", color: "#3D7BFF" });
  const b = await t.mutation(api.players.join, { deviceId: "b", name: "Sam", color: "#FF4D5E" });
  const big = await t.mutation(api.walks.submit, { playerId: a.playerId, points: squareLoop(VENUE, 200, T0) });
  const small = await t.mutation(api.walks.submit, { playerId: b.playerId, points: squareLoop(VENUE, 130, T0) });
  expect(small).toMatchObject({ claimed: 0, stolen: 0 });
  expect(small.blocked).toBeGreaterThan(0);

  // After enough hours Ana's effective strength is below Sam's loop size.
  const hours = big.strength - small.strength + 1;
  vi.setSystemTime(T0 + hours * H + 60_000);
  const again = await t.mutation(api.walks.submit, { playerId: b.playerId, points: squareLoop(VENUE, 130, Date.now()) });
  expect(again.stolen).toBe(again.strength);
  expect(again.blocked).toBe(0);
  const ev = await t.query(api.events.forMe, { playerId: a.playerId });
  expect(ev[0]).toMatchObject({ byName: "Sam", cellCount: again.strength });
});

test("walking your own loop refreshes it: strength back to the loop size and the clock restarts", async () => {
  vi.useFakeTimers();
  vi.setSystemTime(T0);
  const t = convexTest(schema, modules);
  const a = await t.mutation(api.players.join, { deviceId: "a", name: "Ana", color: "#3D7BFF" });
  const r = await t.mutation(api.walks.submit, { playerId: a.playerId, points: squareLoop(VENUE, 130, T0) });
  const n = r.strength;

  const t3 = T0 + 3 * H + 60_000;
  vi.setSystemTime(t3);
  expect((await t.query(api.cells.all, {}))[0].strength).toBe(n - 3);
  const refresh = await t.mutation(api.walks.submit, { playerId: a.playerId, points: squareLoop(VENUE, 130, t3) });
  expect(refresh).toMatchObject({ claimed: 0, stolen: 0 });

  let cells = await t.query(api.cells.all, {});
  expect(cells.every((c) => c.strength === n)).toBe(true);
  expect(Math.abs(cells[0].fadesAt! - (t3 + H))).toBeLessThan(1000);

  // Without the refresh these blocks would be free by now.
  vi.setSystemTime(T0 + n * H + 60_000);
  cells = await t.query(api.cells.all, {});
  expect(cells.length).toBe(n);
  expect(cells.every((c) => c.strength === 3)).toBe(true);
});
