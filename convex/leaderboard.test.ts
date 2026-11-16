// @vitest-environment edge-runtime
/// <reference types="vite/client" />
// B10 (contract v5): both leaderboards return at most 50 rows, most first.
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

test("leaderboard.top returns at most 50 rows, most blocks first", async () => {
  const t = convexTest(schema, modules);
  await t.run(async (ctx) => {
    for (let i = 0; i < 55; i++) {
      const ownerId = await ctx.db.insert("players", { deviceId: `d${i}`, name: `P${i}`, color: "#3D7BFF" });
      // Player i owns i + 1 blocks.
      for (let k = 0; k <= i; k++) {
        await ctx.db.insert("cells", { cellId: `c${i}-${k}`, boundary: [], ownerId, strength: 1, claimedAt: Date.now() });
      }
    }
  });
  const top = await t.query(api.leaderboard.top, {});
  expect(top).toHaveLength(50);
  expect(top[0]).toMatchObject({ name: "P54", blocks: 55 });
  expect(top[49]).toMatchObject({ name: "P5", blocks: 6 });
});

test("leaderboard.points returns at most 50 rows, most points first", async () => {
  const t = convexTest(schema, modules);
  await t.run(async (ctx) => {
    for (let i = 0; i < 55; i++) await ctx.db.insert("players", { deviceId: `d${i}`, name: `P${i}`, color: "#3D7BFF", points: i * 10 });
  });
  const pts = await t.query(api.leaderboard.points, {});
  expect(pts).toHaveLength(50);
  expect(pts[0]).toMatchObject({ name: "P54", points: 540 });
  expect(pts[49]).toMatchObject({ name: "P5", points: 50 });
});
