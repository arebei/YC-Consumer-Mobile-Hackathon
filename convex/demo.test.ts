// @vitest-environment edge-runtime
/// <reference types="vite/client" />
// B9: admin.demoSeed makes a lived-in map through the real capture rules, and is idempotent.
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import { squareLoop } from "./lib/loop";

const modules = import.meta.glob("./**/*.ts");

test("demoSeed: 3 players hold their shops, 400 points each, idempotent, a 200 m loop steals Sam's shop", async () => {
  const t = convexTest(schema, modules);
  const first = await t.mutation(api.admin.demoSeed, {});
  expect(first.players).toBe(3);
  expect(first.cells).toBeGreaterThan(15);

  const shops = await t.query(api.shops.list, {});
  expect(shops).toHaveLength(4);
  const holder = (name: string) => shops.find((s) => s.name === name)!.holderName;
  expect(holder("Happy Cow Creamery & Tea")).toBe("Sam");
  expect(holder("Neighbor Bakehouse")).toBe("Maya");
  expect(holder("Piccino Coffee Bar")).toBe("Leo");
  expect(holder("Humphry Slocombe Dogpatch")).toBeNull();
  expect((await t.query(api.offers.list, {})).length).toBe(8);

  const players = await t.query(api.players.list, {});
  expect(players.map((p) => p.name).sort()).toEqual(["Leo", "Maya", "Sam"]);
  const sam = players.find((p) => p.name === "Sam")!;
  const wallet = await t.query(api.wallet.mine, { playerId: sam.playerId });
  expect(wallet.history[0]).toMatchObject({ delta: 400, reason: "Demo points" });
  expect(wallet.balance).toBeGreaterThan(400); // plus the walk's own points
  const cells = await t.query(api.cells.all, {});
  expect(cells.find((c) => c.ownerName === "Sam")?.ownerFlag).toBe("first to the boba");

  // Idempotent: nothing new on a second run.
  expect(await t.mutation(api.admin.demoSeed, {})).toEqual({ players: 0, cells: first.cells });
  expect((await t.query(api.players.list, {})).length).toBe(3);

  // A live player's 200 m loop around Happy Cow steals Sam's shop block.
  const happyCow = shops.find((s) => s.name === "Happy Cow Creamery & Tea")!;
  const me = await t.mutation(api.players.join, { deviceId: "me", name: "Ana", color: "#3D7BFF" });
  const r = await t.mutation(api.walks.submit, { playerId: me.playerId, points: squareLoop({ lat: happyCow.lat, lng: happyCow.lng }, 200, Date.now()) });
  expect(r.claimedCellIds).toContain(happyCow.cellId);
  expect((await t.query(api.shops.list, {})).find((s) => s.name === "Happy Cow Creamery & Tea")!.holderName).toBe("Ana");
});
