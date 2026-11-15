// @vitest-environment edge-runtime
/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import { VENUE } from "./lib/config";
import { squareLoop } from "./lib/loop";
import { cellOf } from "./lib/grid";

const modules = import.meta.glob("./**/*.ts");

test("T1-T3, T8: capture, steal, blocked, rejected", async () => {
  const t = convexTest(schema, modules);
  const now = Date.now();
  const a = await t.mutation(api.players.join, { deviceId: "a", name: "Ana", color: "#3D7BFF" });
  const b = await t.mutation(api.players.join, { deviceId: "b", name: "Sam", color: "#FF4D5E" });

  const r1 = await t.mutation(api.walks.submit, { playerId: a.playerId, points: squareLoop(VENUE, 130, now) });
  expect(r1.status).toBe("captured");
  expect(r1.claimed).toBe(r1.strength);
  const cells1 = await t.run(async (ctx) => await ctx.db.query("cells").collect());
  expect(cells1.length).toBe(r1.strength);
  expect(cells1.every((c: any) => c.ownerId === a.playerId && c.boundary.length >= 4)).toBe(true);

  const r2 = await t.mutation(api.walks.submit, { playerId: b.playerId, points: squareLoop(VENUE, 200, now) });
  expect(r2.stolen).toBe(r1.strength);
  expect(r2.claimed).toBe(r2.strength);
  const ev = await t.run(async (ctx) => await ctx.db.query("events").collect());
  expect(ev.length).toBe(1);
  expect(ev[0]).toMatchObject({ fromPlayerId: a.playerId, byPlayerId: b.playerId, cellCount: r1.strength, strength: r2.strength });

  const r3 = await t.mutation(api.walks.submit, { playerId: a.playerId, points: squareLoop(VENUE, 130, now) });
  expect(r3).toMatchObject({ status: "captured", claimed: 0, stolen: 0, blocked: r1.strength });

  const r8 = await t.mutation(api.walks.submit, { playerId: a.playerId, points: squareLoop(VENUE, 130, now).slice(0, 5) });
  expect(r8).toMatchObject({ status: "rejected", reason: "not_closed", strength: 0 });
  const walks = await t.run(async (ctx) => await ctx.db.query("walks").collect());
  expect(walks.map((w: any) => w.status)).toEqual(["captured", "captured", "captured", "rejected"]);
});

test("T4-T5 core: shop minimum and hold credit", async () => {
  const t = convexTest(schema, modules);
  const now = Date.now();
  const a = await t.mutation(api.players.join, { deviceId: "a", name: "Ana", color: "#3D7BFF" });
  const b = await t.mutation(api.players.join, { deviceId: "b", name: "Sam", color: "#FF4D5E" });
  const shopId = await t.run(async (ctx) => await ctx.db.insert("shops", { name: "Blue Door", lat: VENUE.lat, lng: VENUE.lng, cellId: cellOf(VENUE), reward: "Free coffee", feeCents: 100 }));

  const small = await t.mutation(api.walks.submit, { playerId: a.playerId, points: squareLoop(VENUE, 80, now) });
  expect(small.notes).toContain("Blue Door's block needs a loop of 6 or more blocks.");
  let shopCell = await t.run(async (ctx) => await ctx.db.query("cells").withIndex("by_cellId", (q) => q.eq("cellId", cellOf(VENUE))).unique());
  expect(shopCell).toBeNull();

  await t.mutation(api.walks.submit, { playerId: a.playerId, points: squareLoop(VENUE, 130, now) });
  shopCell = await t.run(async (ctx) => await ctx.db.query("cells").withIndex("by_cellId", (q) => q.eq("cellId", cellOf(VENUE))).unique());
  expect(shopCell?.ownerId).toBe(a.playerId);

  await t.mutation(api.walks.submit, { playerId: b.playerId, points: squareLoop(VENUE, 200, now) });
  const holds = await t.run(async (ctx) => await ctx.db.query("shopHolds").collect());
  expect(holds.length).toBe(1);
  expect(holds[0]).toMatchObject({ shopId, playerId: a.playerId });
  expect(holds[0].heldMs).toBeGreaterThanOrEqual(0);
});

test("unknown player throws a plain sentence", async () => {
  const t = convexTest(schema, modules);
  const a = await t.mutation(api.players.join, { deviceId: "a", name: "Ana", color: "#3D7BFF" });
  await t.run(async (ctx) => await ctx.db.delete(a.playerId));
  await expect(t.mutation(api.walks.submit, { playerId: a.playerId, points: [] })).rejects.toThrow(/Join again/);
});

test("T11 core: flags ride on steal events and survive a later change", async () => {
  const t = convexTest(schema, modules);
  const now = Date.now();
  const a = await t.mutation(api.players.join, { deviceId: "a", name: "Ana", color: "#3D7BFF" });
  expect(a.flag).toBeNull();
  const b = await t.mutation(api.players.join, { deviceId: "b", name: "Sam", color: "#FF4D5E", flag: "  thanks for\n the coffee " });
  expect(b.flag).toBe("thanks for the coffee");

  await t.mutation(api.walks.submit, { playerId: a.playerId, points: squareLoop(VENUE, 130, now) });
  await t.mutation(api.walks.submit, { playerId: b.playerId, points: squareLoop(VENUE, 200, now) });
  let ev = await t.run(async (ctx) => await ctx.db.query("events").collect());
  expect(ev[0].byFlag).toBe("thanks for the coffee");

  expect(await t.mutation(api.players.setFlag, { playerId: b.playerId, flag: "mine now" })).toEqual({ flag: "mine now" });
  ev = await t.run(async (ctx) => await ctx.db.query("events").collect());
  expect(ev[0].byFlag).toBe("thanks for the coffee"); // the alert keeps the old flag
  const list = await t.query(api.players.list, {});
  expect(list.find((p) => p.playerId === b.playerId)?.flag).toBe("mine now");

  // Rejoining without a flag keeps it; an empty flag removes it.
  expect((await t.mutation(api.players.join, { deviceId: "b", name: "Sam", color: "#FF4D5E" })).flag).toBe("mine now");
  expect(await t.mutation(api.players.setFlag, { playerId: b.playerId, flag: "   " })).toEqual({ flag: null });

  // A steal by a player with no flag stores no byFlag.
  await t.mutation(api.walks.submit, { playerId: a.playerId, points: squareLoop(VENUE, 250, now) });
  ev = await t.run(async (ctx) => await ctx.db.query("events").collect());
  expect(ev[1].byFlag).toBeUndefined();
});
