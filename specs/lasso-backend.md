# Lasso backend spec (Convex) — version 3

You are the backend agent for a one-day hackathon build. You own everything under `convex/`. A separate frontend agent builds the phone app against the API contract in section 6, and a Lead agent coordinates you both. Feature freeze is 4:45 PM. Submission is 5:45 PM.

## 1. Read first

1. Read `CLAUDE.md`, then this whole file, then `specs/lasso-lead.md` section 2 (the rules). You are HACK-BACKEND. `CLAUDE.md` wins on how the team works (who runs git, where tasks and reports go); this spec wins on what to build. If older files in `convex/` or `.team/PLAN.md` describe a different app, they are superseded: tell the Lead which files you will remove or replace before you do it.
2. Inspect the repo. Confirm it is a Convex project. If `convex/_generated/ai/guidelines.md` exists, read it and follow it over anything here that conflicts on Convex syntax.
3. Do not start `npx convex dev`. The Lead or a human keeps one copy running. Ask the Lead if types are not regenerating.
4. Dependencies are already installed by the Lead: `h3-js`, `vitest`, `convex-test`, `@edge-runtime/vm`. Tell the Lead before adding anything else.
5. These files already exist in the repo. They were written today and pass 29 tests. Do not rewrite them: `convex/lib/config.ts`, `loop.ts`, `grid.ts`, `rules.ts`, `flag.ts`, `validators.ts`, `loop.test.ts`, `flag.test.ts`, and `convex/schema.ts`, `convex/walks.ts` (`submit` only), `convex/players.ts` (`join`, `setFlag`, `list`), `convex/game.test.ts`. Your job is the rest of the Convex layer around them. In `walks.ts` and `players.ts`, remove the `any` casts once the real generated types exist.

## 2. The product in brief

Lasso is a walking game. The map is split into blocks. A player walks a closed loop and claims the blocks inside it. A block's strength is the number of blocks in the loop that claimed it. A rival steals a block only with a loop of more blocks than its strength. Some blocks contain a partner shop. Whoever holds a shop's block for the longest in a week wins that shop's reward and redeems it in person. The shop pays a small fee per redemption, invoiced through Whop.

Every player also has one flag: a short message, at most 40 characters, shown on all the blocks they hold and in the alert when they take someone's blocks. Flags change nothing about claiming, stealing, strength or rewards.

A human tests on real phones outdoors. You cannot. Optimise for logic that is correct the first time, and prove it with tests.

## 3. Hard rules

- All game rules run in Convex functions. The phone only records points and draws results.
- Game rules live in pure functions in `convex/lib/`. A Convex function loads documents, calls a pure function, and writes what it returns. It makes no rule decisions of its own.
- No auth. Identity is a `deviceId` string sent by the client.
- Every tunable number lives in `convex/lib/config.ts`.
- Do not call `Date.now()` inside queries. Return timestamps and let the client compute elapsed time. Mutations and actions may use it.
- Every public function has an `args` validator. Use `v.id("table")` for ids.
- Read with `withIndex`, never `.filter()` on a table scan, except on `shops`, `players` and `season`, which stay tiny.
- Never commit secrets. Keys are Convex environment variables.
- Do not change the API contract (section 6) or the game rules. If one looks wrong, tell the Lead.
- Do not run git; in this repo only the Lead does (see `CLAUDE.md`). After each milestone, append a report to `.team/reports.md` headed `B<n>: <what works>` and message the Lead, who commits.

## 4. What is already in `convex/lib/` (verified)

| File | Exports | Notes |
|---|---|---|
| `config.ts` | all constants, `VENUE` | `GRID` switches `"h3"` / `"square"` |
| `loop.ts` | `haversineM`, `pathLengthM`, `cleanPoints`, `isClosed`, `fastShare`, `isTooFast`, `effectiveStrength`, `validateWalk`, `squareLoop`, types `LatLng`, `Point`, `RejectReason` | no Convex or h3 imports, so the phone app may import it too |
| `grid.ts` | `cellOf`, `cellCenter`, `cellBoundary`, `cellsInLoop`, `cellsAround`, `pointInPolygon` | hides which grid is in use |
| `flag.ts` | `cleanFlag(text): string \| null` | one line, trimmed, cut to `MAX_FLAG_CHARS` whole characters, `null` when empty |
| `rules.ts` | `planCapture`, `seasonWinners`, `shopNeeded`, `makeCode`, `rejected`, types `CellState`, `ShopRef`, `SubmitResult`, `CapturePlan` | no database, no clock |
| `loop.test.ts`, `flag.test.ts` | 25 tests | `npx vitest run` |

Three things differ from version 1 of this spec, on purpose:

1. `fastShare` groups points into windows of at least one second. The old rule ignored segments under a second, which let a dense, fast track through.
2. `cleanPoints` also drops a point that implies a jump faster than 30 m/s. One GPS glitch no longer rejects an honest walk as too fast.
3. `squareLoop` takes an optional `speedMps` (default 1.4), which test 4 needs.

Measured block counts at the venue, hexagon grid, resolution 11 (each block is about 50 m across, 2,230 m²):

| Square loop side | Path length | Blocks enclosed |
|---|---|---|
| 100 m | 400 m | 4 to 6 |
| 130 m (Fake loop: small) | 520 m | 7 or 8 |
| 150 m | 600 m | 9 to 11 |
| 200 m (Fake loop: large) | 800 m | 15 to 20 |
| 900 m | 3.6 km | about 362, just under `MAX_CELLS` |

On the square fallback grid a 130 m loop holds 9 to 16 blocks and a 200 m loop more, so the small/large pair still works.

## 5. Schema (`convex/schema.ts`)

```ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

import { latLng, point } from "./lib/validators";

export default defineSchema({
  players: defineTable({ deviceId: v.string(), name: v.string(), color: v.string(), flag: v.optional(v.string()) })
    .index("by_deviceId", ["deviceId"]),
  cells: defineTable({
    cellId: v.string(), boundary: v.array(latLng),
    ownerId: v.id("players"), strength: v.number(), claimedAt: v.number(),
  }).index("by_cellId", ["cellId"]).index("by_ownerId", ["ownerId"]),
  shops: defineTable({
    name: v.string(), lat: v.number(), lng: v.number(), cellId: v.string(),
    reward: v.string(), feeCents: v.number(),
  }).index("by_cellId", ["cellId"]),
  shopHolds: defineTable({ shopId: v.id("shops"), playerId: v.id("players"), heldMs: v.number() })
    .index("by_shopId", ["shopId"]),
  walks: defineTable({
    playerId: v.id("players"), points: v.array(point), lengthM: v.number(), cellCount: v.number(),
    status: v.union(v.literal("captured"), v.literal("rejected")),
    reason: v.optional(v.string()), createdAt: v.number(),
  }).index("by_playerId", ["playerId"]),
  events: defineTable({
    type: v.literal("steal"), byPlayerId: v.id("players"), fromPlayerId: v.id("players"),
    cellCount: v.number(), strength: v.number(), shopId: v.optional(v.id("shops")),
    byFlag: v.optional(v.string()), createdAt: v.number(),
  }).index("by_fromPlayerId", ["fromPlayerId"]),
  rewards: defineTable({
    shopId: v.id("shops"), playerId: v.id("players"), code: v.string(),
    redeemedAt: v.optional(v.number()),
    feeStatus: v.union(v.literal("none"), v.literal("pending"), v.literal("invoiced"), v.literal("charged"), v.literal("failed")),
    feeUrl: v.optional(v.string()), whopInvoiceId: v.optional(v.string()), feeError: v.optional(v.string()),
  }).index("by_playerId", ["playerId"]).index("by_shopId", ["shopId"]),
  season: defineTable({ endedAt: v.optional(v.number()) }),
});
```

`shopHolds.heldMs` is the time a player has held a shop's block, not counting their current unbroken stretch. The current stretch is `now - cells.claimedAt` for the current owner. Reuse the `point` and `latLng` validators from `convex/lib/validators.ts` in function `args`.

## 6. API contract

Contract version 3. Shared word for word by the backend and frontend specs. Only the Lead may change it. Function paths are `file.function`, used on the client as `api.file.function`.

### Types

```ts
type LatLng = { lat: number; lng: number };
type Point = { lat: number; lng: number; t: number; acc: number }; // t in ms since epoch, acc in metres
type CellView = {
  cellId: string; boundary: LatLng[];
  ownerId: Id<"players">; ownerName: string; ownerColor: string; strength: number;
  ownerFlag: string | null;  // the owner's current flag
};
```

### Functions

| Function | Kind | Args | Returns |
|---|---|---|---|
| `config.public` | query | none | `{ closeRadiusM, minLoopM, redeemRadiusM, shopMinBlocks, demoMode, center: LatLng, maxFlagChars }` |
| `players.join` | mutation | `{ deviceId, name, color, flag?: string }` | `{ playerId, name, color, flag: string \| null }` |
| `players.setFlag` | mutation | `{ playerId, flag: string }` | `{ flag: string \| null }`, the cleaned value that was saved. An empty string removes the flag. |
| `players.list` | query | none | `{ playerId, name, color, flag: string \| null }[]` |
| `cells.all` | query | none | `CellView[]` |
| `grid.around` | query | `{ lat, lng }` | `{ cellId, boundary }[]` for cells within 6 rings, claimed or not. Stretch. |
| `walks.submit` | mutation | `{ playerId, points: Point[] }` | `SubmitResult` below |
| `walks.last` | query | `{ playerId }` | `{ points: Point[] }` or `null` (the player's newest captured walk) |
| `walks.preview` | query | `{ points: LatLng[] }` | `{ cells: number }`. Stretch only. |
| `shops.list` | query | none | `ShopView[]` below |
| `events.forMe` | query | `{ playerId }` | `EventView[]`, newest first, at most 5 |
| `events.recent` | query | none | `EventView[]`, newest first, at most 10 |
| `season.end` | mutation | none | `{ rewardsCreated: number }` |
| `rewards.mine` | query | `{ playerId }` | `RewardView[]`, newest first |
| `rewards.redeem` | mutation | `{ rewardId, lat, lng, demo?: boolean }` | `{ ok: boolean, reason?: "too_far" \| "already_redeemed" }` |
| `admin.seedShops` | mutation | `{ shops: { name, lat, lng, reward, feeCents }[] }` | `{ count }` (shops now in the table; same name is updated, not duplicated) |
| `admin.reset` | mutation | none | `null` |
| `leaderboard.top` | query | none | `{ playerId, name, color, blocks }[]`, most blocks first, at most 10. Stretch. |

```ts
type SubmitResult = {
  status: "captured" | "rejected";
  reason?: "not_closed" | "too_fast" | "too_small" | "too_big";
  strength: number;          // blocks enclosed by the loop; 0 when rejected
  claimed: number;           // cells that became mine: new plus stolen
  stolen: number;            // of those, cells taken from another player
  blocked: number;           // cells left with a stronger owner
  claimedCellIds: string[];  // for the capture animation
  notes: string[];           // plain sentences, ready to show
};
type ShopView = {
  shopId: Id<"shops">; name: string; lat: number; lng: number; reward: string; feeCents: number;
  cellId: string;
  holderId: Id<"players"> | null; holderName: string | null; holderColor: string | null;
  holderSince: number | null;   // claimedAt of the shop's cell; the client adds (Date.now() - holderSince) to the holder's time
  strength: number;             // 0 when unheld
  needed: number;               // loop size that takes it: max(strength + 1, shopMinBlocks)
  top: { playerId: Id<"players">; name: string; color: string; heldMs: number }[]; // stored time only, up to 3
};
type EventView = {
  eventId: Id<"events">; byName: string; byColor: string; fromName: string;
  byFlag: string | null;     // the taker's flag at the moment of the steal; it does not change later
  cellCount: number; strength: number; needed: number; // needed = strength + 1
  shopName: string | null; createdAt: number;
};
type RewardView = {
  rewardId: Id<"rewards">; shopId: Id<"shops">; shopName: string; reward: string; code: string;
  shopLat: number; shopLng: number; redeemedAt: number | null;
  feeStatus: "none" | "pending" | "invoiced" | "charged" | "failed"; feeCents: number;
  feeUrl: string | null;       // Whop's hosted invoice link once feeStatus is "invoiced" or "charged"
};
```

### Errors

A function that cannot do its job throws `new ConvexError("<one plain sentence>")`, for example `"That player no longer exists. Join again."`. The client shows the sentence as is. A rejected walk is not an error: it returns a `SubmitResult` with `status: "rejected"`.

### Changes from version 2 (Flags)

1. `players.join` takes an optional `flag` and returns `flag`.
2. New mutation `players.setFlag`.
3. `players.list` items, `CellView` and `EventView` gain `flag`, `ownerFlag` and `byFlag`.
4. `config.public` also returns `maxFlagChars`.

### Changes from version 1

1. `config.public` also returns `center` (the venue), used when the phone has no location fix.
2. `RewardView.feeStatus` gains `"invoiced"`, and `RewardView` gains `feeUrl`.
3. New stretch query `walks.preview`.
4. `admin.seedShops` updates a shop with the same name instead of inserting a duplicate.
5. `walks.last` returns the newest captured walk only.

## 7. Behaviour

### 7.1 `walks.submit`: the whole game, in one mutation

A Convex mutation is one transaction. If two players submit loops over the same blocks at the same moment, Convex runs one after the other, so a block can never end up with two owners. Do not add locks.

This is the code already in `convex/walks.ts`. It passed `convex-test` tests this morning against a stand-in for the generated files. Tighten the types against the real generated files; keep the order of steps.

```ts
import { ConvexError, v } from "convex/values";
import { mutation } from "./_generated/server";
import { MAX_CELLS } from "./lib/config";
import { cellBoundary, cellsInLoop } from "./lib/grid";
import { validateWalk } from "./lib/loop";
import { planCapture, rejected, type CellState, type ShopRef } from "./lib/rules";
import { point } from "./lib/validators";

export const submit = mutation({
  args: { playerId: v.id("players"), points: v.array(point) },
  handler: async (ctx, { playerId, points }) => {
    const now = Date.now();
    const player = await ctx.db.get(playerId);
    if (!player) throw new ConvexError("That player no longer exists. Join again.");

    const saveRejected = async (reason: "not_closed" | "too_fast" | "too_small" | "too_big", pts: typeof points, lengthM: number) => {
      await ctx.db.insert("walks", { playerId, points: pts.slice(0, 600), lengthM, cellCount: 0, status: "rejected", reason, createdAt: now });
      return rejected(reason);
    };

    // 1 + 2. Clean, closed, not too fast.
    const walk = validateWalk(points);
    if (!walk.ok) return saveRejected(walk.reason, walk.points, walk.lengthM);

    // 3. Which blocks are inside.
    const ids = cellsInLoop(walk.points);
    if (ids.length === 0) return saveRejected("too_small", walk.points, walk.lengthM);
    if (ids.length > MAX_CELLS) return saveRejected("too_big", walk.points, walk.lengthM);

    // 4. Load what the rules need.
    const cellDocs = new Map<string, any>();
    const cells = new Map<string, CellState>();
    for (const id of ids) {
      const doc = await ctx.db.query("cells").withIndex("by_cellId", (q) => q.eq("cellId", id)).unique();
      if (doc) {
        cellDocs.set(id, doc);
        cells.set(id, { cellId: id, ownerId: doc.ownerId, strength: doc.strength, claimedAt: doc.claimedAt });
      }
    }
    const shops = new Map<string, ShopRef>();
    for (const s of await ctx.db.query("shops").collect()) shops.set(s.cellId, { shopId: s._id, name: s.name, cellId: s.cellId });

    // 5. Decide (pure), then write exactly what the plan says.
    const plan = planCapture({ ids, playerId, now, cells, shops });
    const n = ids.length;
    for (const id of plan.creates) {
      await ctx.db.insert("cells", { cellId: id, boundary: cellBoundary(id), ownerId: playerId, strength: n, claimedAt: now });
    }
    for (const u of plan.upgrades) await ctx.db.patch(cellDocs.get(u.cellId)._id, { strength: u.strength });
    for (const t of plan.takes) await ctx.db.patch(cellDocs.get(t.cellId)._id, { ownerId: playerId, strength: n, claimedAt: now });
    for (const h of plan.holdCredits) {
      const rows = await ctx.db.query("shopHolds").withIndex("by_shopId", (q) => q.eq("shopId", h.shopId as any)).collect();
      const row = rows.find((r) => r.playerId === h.playerId);
      if (row) await ctx.db.patch(row._id, { heldMs: row.heldMs + h.addMs });
      else await ctx.db.insert("shopHolds", { shopId: h.shopId as any, playerId: h.playerId as any, heldMs: h.addMs });
    }
    for (const e of plan.events) {
      await ctx.db.insert("events", { type: "steal", byPlayerId: playerId, fromPlayerId: e.fromPlayerId as any, cellCount: e.cellCount, strength: e.strength, shopId: e.shopId as any,
        ...(player.flag ? { byFlag: player.flag } : {}), // the taker's flag at the moment of the steal
        createdAt: now });
    }
    await ctx.db.insert("walks", { playerId, points: walk.points, lengthM: walk.lengthM, cellCount: n, status: "captured", createdAt: now });
    return plan.result;
  },
});
```

The decision order inside `planCapture`, for each block in the loop (`n` = blocks in the loop):

1. Mine already: strength becomes `max(strength, n)`. The clock (`claimedAt`) never resets. Not counted as claimed.
2. Holds a shop and `n < SHOP_MIN_BLOCKS`: unchanged, plus the note `"<shop name>'s block needs a loop of 6 or more blocks."`
3. Nobody's: created with owner = player, `strength = n`, `claimedAt = now`. Counted as claimed.
4. A rival's and `n > strength`: taken. Counted as claimed and stolen. If it holds a shop, the previous owner is credited `now - claimedAt` in `shopHolds`.
5. Otherwise: left alone. Counted as blocked.

One `steal` event is written per previous owner, with the number of blocks taken from them, `strength = n`, and `shopId` if a shop block was among them.

### 7.2 Other functions

- `config.public`: returns `{ closeRadiusM: CLOSE_RADIUS_M, minLoopM: MIN_LOOP_M, redeemRadiusM: REDEEM_RADIUS_M, shopMinBlocks: SHOP_MIN_BLOCKS, demoMode: DEMO_MODE, center: VENUE, maxFlagChars: MAX_FLAG_CHARS }`.
- `players.join` (already written): trim the name; reject an empty name or one over 16 characters with a `ConvexError`; `color` must match `/^#[0-9A-Fa-f]{6}$/`. Upsert by `deviceId`; a returning device may change its name and colour. If `flag` is sent, save `cleanFlag(flag)`; if it is not sent, leave the saved flag alone.
- `players.setFlag` (already written): save `cleanFlag(flag)`. A `null` result removes the flag. Return what was saved.
- `players.list` (already written): all players with `flag`. The admin panel's Switch player uses it.
- `cells.all`: load all players once into a `Map`, then map every cell to a `CellView`, with `ownerFlag` = the owner's current `flag` or `null`. Demo scale is a few hundred cells; no paging.
- `walks.last`: the player's newest walk with `status === "captured"` (`withIndex("by_playerId").order("desc").take(10)`, first captured one), or `null`.
- `walks.preview` (stretch): `{ cells: cellsInLoop(points).length }`. Return `{ cells: 0 }` for fewer than 3 points.
- `shops.list`: for each shop, its cell (by `by_cellId`), the holder's name and colour, `needed = shopNeeded(strength)`, and the top three `shopHolds` rows by `heldMs`. If the current holder has no `shopHolds` row, include them in `top` with `heldMs: 0` before cutting to three, so the holder is always listed.
- `events.forMe`: `withIndex("by_fromPlayerId").order("desc").take(5)`, joined with names, `needed = strength + 1`, `shopName` from `shopId`, and `byFlag` = the stored `byFlag` or `null`. Never look up the taker's current flag here: an alert keeps the flag from the moment of the steal.
- `events.recent`: `ctx.db.query("events").order("desc").take(10)`, same shape.
- `season.end`: if any reward exists, return `{ rewardsCreated: 0 }`. Otherwise build the inputs and call `seasonWinners`; insert one reward per winner with `code = makeCode()` and `feeStatus: "none"`; set `season.endedAt` (create the single document if missing). Shops nobody held get nothing.
- `rewards.mine`: by `by_playerId`, newest first, joined with the shop. `feeUrl` is `null` when unset.
- `rewards.redeem`: `already_redeemed` if `redeemedAt` is set. Unless `DEMO_MODE && demo === true`, `too_far` when `haversineM` to the shop is above `REDEEM_RADIUS_M`. Otherwise set `redeemedAt = now`, `feeStatus: "pending"`, and `ctx.scheduler.runAfter(0, internal.payments.chargeShopFee, { rewardId })`.
- `admin.seedShops`: for each input, `cellId = cellOf({lat, lng})`; update the shop with the same name if there is one, otherwise insert. Return the number of shops in the table. If two shops land in the same block, keep the first and skip the second.
- `admin.reset`: delete every document in `cells`, `shopHolds`, `walks`, `events`, `rewards`, and clear `season.endedAt`. Keep `players` and `shops`.
- `grid.around` (stretch): `cellsAround({lat, lng})` mapped to `{ cellId, boundary }`.
- `leaderboard.top` (stretch): count cells per owner, top 10.

## 8. Whop: the shop's fee (`convex/payments.ts`)

The business model is that the shop pays a small fee each time a reward is redeemed. Today that is one real call chain against Whop's sandbox: create an invoice for the fee, issue it, and store the hosted payment link. When someone pays the link with a sandbox test card, the app shows the fee as paid.

Before writing any code, open these three pages and check the field names against what is below. They are the source of truth; this section was written from them on the morning of the build and Whop's API is dated and changes.

- `https://docs.whop.com/api-reference/invoices/create-invoice.md`
- `https://docs.whop.com/api-reference/invoices/issue-invoice.md`
- `https://docs.whop.com/api-reference/invoices/retrieve-invoice.md`

What the docs said this morning:

| Fact | Value |
|---|---|
| Sandbox base URL | `https://sandbox-api.whop.com/api/v1` (no real money; keys come from `https://sandbox.whop.com/dashboard/developer`) |
| Auth | `Authorization: Bearer <key>`, server side only |
| Safe retries | optional `Idempotency-Key` header, up to 255 characters |
| Create | `POST /invoices` with `account_id` (`biz_…`) and `items` (1 to 50). An item is `{ variant_id }` or an inline `{ variant: { currency, title, initial_price, billing_type: "one_time" } }`, plus `quantity`. Recipient: `email_address` (finds or creates the customer) and `customer_name`. Also `memo` and `metadata` (string values). Returns `201`; the invoice `id` starts with `pay_` and `status` is `draft`. |
| Issue | `POST /invoices/{id}/issue` with an empty body. Opens the invoice without emailing it. Returns the invoice with `status: "open"` and `checkout_link`, the hosted page where the buyer pays. |
| Permissions on the key | `invoice:create` or `payment:charge` to create; `plan:create` for an inline variant; `payment:charge` to issue. |
| Statuses | `draft`, `open`, `paid`, `void`, `uncollectible` |

Two things the docs excerpt did not settle. Check both before the first call, and ask the Whop team on the floor if the docs are unclear:

1. Whether `initial_price` is in dollars or cents. The docs example uses `99` for a service, which reads as dollars. Start with `feeCents / 100` and look at the `total` in the response.
2. Whether an inline variant on an invoice also needs a `product` or `product_id`. If the create call returns a 400 that says so, create one product in the sandbox dashboard and pass its id from `WHOP_PRODUCT_ID`.

Environment variables (set by a human with `npx convex env set NAME value`):

| Name | Value |
|---|---|
| `WHOP_API_KEY` | sandbox API key |
| `WHOP_ACCOUNT_ID` | the sandbox business id, `biz_…` |
| `WHOP_SHOP_EMAIL` | an inbox a teammate controls; it stands in for the shop owner |
| `WHOP_API_BASE` | optional; defaults to the sandbox base URL. Never point it at production today. |

`payments.chargeShopFee` (internal action, `{ rewardId }`):

1. Load the reward and shop through an internal query. If the reward is missing or `feeStatus` is not `pending`, return.
2. If `WHOP_API_KEY` or `WHOP_ACCOUNT_ID` is missing, return and leave `pending`. The app then shows "Blue Door owes $1.00", which is an accepted fallback.
3. `POST /invoices` with `Idempotency-Key: lasso-invoice-<rewardId>`, `customer_name` = the shop's name, `email_address` = `WHOP_SHOP_EMAIL`, one inline one-time item titled `Lasso redemption fee: <shop name>`, `memo` = `Reward code <code> redeemed`, `metadata` = `{ rewardId, shopId }`.
4. `POST /invoices/<id>/issue` with `Idempotency-Key: lasso-issue-<rewardId>`.
5. Through an internal mutation, set `feeStatus: "invoiced"`, `feeUrl: checkout_link`, `whopInvoiceId: id`.
6. Schedule `payments.checkFee` in 15 seconds with `{ rewardId, attempt: 1 }`.
7. On any non-2xx response or thrown error: set `feeStatus: "failed"` and `feeError` to the status code plus the first 300 characters of the response body, and `console.error` it. Never throw out of the action.

`payments.checkFee` (internal action, `{ rewardId, attempt }`): `GET /invoices/<whopInvoiceId>`. If `status` is `paid`, set `feeStatus: "charged"`. Otherwise, if `attempt < 40`, schedule itself again in 15 seconds. That covers ten minutes, which is enough for the demo.

Use `fetch` in the default Convex runtime. Do not add an SDK. This is the only payment code in the project.

## 9. Tests

Pure logic is covered by `convex/lib/loop.test.ts` and `flag.test.ts`. `convex/game.test.ts` already covers T1, T2, T3, T8 and the core of T4, T5 and T11 with `convex-test`; extend it with the rest. It starts with `// @vitest-environment edge-runtime` and passes `import.meta.glob("./**/*.ts")` as the modules. Run everything with `npx vitest run`. Use `vi.useFakeTimers()` and `vi.setSystemTime()` where held time matters.

| # | Test | Expect |
|---|---|---|
| T1 | A joins and submits `squareLoop(VENUE, 130, now)` | `status: "captured"`, `claimed === strength`, `cells.all` has that many cells owned by A |
| T2 | B submits `squareLoop(VENUE, 200, now)` after T1 | `stolen` equals A's cell count; `events.forMe(A)` has one event with `needed === strength + 1` |
| T3 | A submits the 130 m loop again after T2 | `claimed: 0`, `blocked` above 0, cells still B's |
| T4 | Seed one shop at `VENUE`; A submits `squareLoop(VENUE, 80, now)` | the shop's cell is not claimed; `notes` has the shop sentence |
| T5 | A takes the shop with a 130 m loop, clock advances one hour, B takes it with a 200 m loop, clock advances ten minutes, `season.end` | one reward, for A; `shops.list` shows B as holder and A in `top` with about one hour |
| T6 | `rewards.redeem` far from the shop without `demo` | `{ ok: false, reason: "too_far" }` |
| T7 | `rewards.redeem` with `demo: true`, then again | first `{ ok: true }` and `feeStatus: "pending"`; second `already_redeemed` |
| T8 | `walks.submit` with 5 points | `rejected`, `not_closed`, and a rejected walk is stored |
| T9 | `admin.reset` | `cells.all` empty, players and shops still there |
| T10 | `admin.seedShops` twice with the same list | shop count unchanged the second time |
| T11 | A claims with a 130 m loop; B sets the flag `"thanks for the coffee"` and takes the cells with a 200 m loop; then B changes the flag | `events.forMe(A)[0].byFlag` is `"thanks for the coffee"` before and after the change; `cells.all` shows the new flag as `ownerFlag` on B's cells |

If `convex-test` will not run within 15 minutes, write the same checks as a script the Lead can run with `npx convex run`, and say so.

## 10. Milestones

Report to the Lead at the end of each one with: what works, how you verified it, anything untested.

| # | Deliver | Verified by |
|---|---|---|
| B0 | Schema, validators, and every function in the contract as a stub with correct args and return shapes (empty arrays, fixed values, `config.public` real). Pushed so generated types exist. Target: 15 minutes. | Types generate; the frontend can import `api`. |
| B1 | Grid proof: a temporary query returns `cellBoundary(cellOf(VENUE))` from the running deployment. If h3-js does not load in Convex within 15 minutes, set `GRID = "square"`, delete the `h3-js` import and the three `if (GRID === "h3")` branches from `convex/lib/grid.ts` so nothing imports the library, and tell the Lead. | `npx convex run` on the proof query; `npx vitest run` shows 29 passing. |
| B2 | `cells.all` (with `ownerFlag`), `walks.last`; `players.*` and `walks.submit` are already written, so check them against the real generated types. | T1, T8 |
| B3 | Stealing, blocked cells, `events.forMe`, `events.recent` (both with `byFlag`). | T2, T3, T11 |
| B4 | `admin.seedShops`, shop minimum, `shopHolds`, `shops.list`, `season.end`, `rewards.mine`. | T4, T5, T10 |
| B5 | `rewards.redeem`, `payments.chargeShopFee`, `payments.checkFee`. | T6, T7; then one live redeem with the Whop key set shows `invoiced` and a link |
| B6 | `admin.reset`, `grid.around`. | T9; manual call |
| B7 | Stretch: `leaderboard.top`, `walks.preview`. | Manual call |

After B6, stay available: the Lead will send you tuning changes from the first real walk (expect `CLOSE_RADIUS_M`, `MAX_ACCURACY_M`, `MAX_FAST_SHARE`), and you keep `hackathon.md` up to date with what was built and where Convex, Whop, Capy and Revyl were used.

## 11. Out of scope today

Leagues and invites (everyone shares one map), the weekly reset timer, strength decay, perks for runners-up, hiding blocks near home, shop sign-up, the neighbourhood champion prize, step-count checks, AI-written alerts, saved payment methods, webhooks.

## Contract version 4 additions (owner request, 15:15): points, exchange, wallet, menu

Shared word for word by both specs. Everything in version 3 stays as it is. Only the Lead may change it.

### New rules
1. A captured walk earns points: `floor(lengthM / 10) + 10 * claimed`. A rejected walk earns 0. Constants `POINTS_PER_10M = 1` and `POINTS_PER_BLOCK = 10` go in `convex/lib/config.ts`.
2. Points are spent in the exchange on shop offers. Spending creates a voucher with a code, used in person at the shop (same radius rule and demo flag as `rewards.redeem`).
3. Every change to a balance writes one ledger row. The balance is `players.points` (missing means 0).

### Schema additions
- `players`: add `points: v.optional(v.number())`.
- `ledger`: `{ playerId: v.id("players"), delta: v.number(), reason: v.string(), createdAt: v.number() }`, index `by_playerId`.
- `offers`: `{ shopId: v.id("shops"), title: v.string(), cost: v.number() }`, index `by_shopId`.
- `vouchers`: `{ playerId: v.id("players"), offerId: v.id("offers"), shopId: v.id("shops"), code: v.string(), createdAt: v.number(), usedAt: v.optional(v.number()) }`, index `by_playerId`.

### Changed
- `SubmitResult` gains `pointsEarned: number` (0 when rejected). `walks.submit` adds the points and writes a ledger row with reason `"Walk: <n> blocks, <m> m"`.
- `admin.seedShops` also creates two offers per shop if it has none: `{ title: <reward>, cost: 300 }` and `{ title: "10% off your order", cost: 100 }`.
- `admin.reset` also deletes `ledger`, `vouchers`, and sets every player's `points` to 0. Offers stay.

### New functions
| Function | Kind | Args | Returns |
|---|---|---|---|
| `wallet.mine` | query | `{ playerId }` | `{ balance: number, history: { delta, reason, createdAt }[] (newest first, at most 30), vouchers: VoucherView[] (newest first) }` |
| `offers.list` | query | none | `OfferView[]` sorted by shop name, then cost |
| `offers.exchange` | mutation | `{ playerId, offerId }` | `{ ok: boolean, reason?: "not_enough_points", code?: string }`; on ok: balance minus cost, ledger row `"Exchanged: <title> at <shop>"`, one voucher |
| `vouchers.use` | mutation | `{ voucherId, lat, lng, demo?: boolean }` | `{ ok: boolean, reason?: "too_far" \| "already_used" }` |
| `stats.mine` | query | `{ playerId }` | `{ points, blocksHeld, walks: number (captured), totalM: number (captured), stealsMade, stealsSuffered, recent: { createdAt, lengthM, cellCount, status }[] (newest first, at most 30, all statuses) }` |
| `leaderboard.points` | query | none | `{ playerId, name, color, points }[]`, most first, at most 10 |
| `admin.grantPoints` | mutation | `{ playerId, amount }` | `{ balance }`; ledger reason `"Demo points"` |

```ts
type OfferView = { offerId: Id<"offers">; shopId: Id<"shops">; shopName: string; shopLat: number; shopLng: number; title: string; cost: number };
type VoucherView = { voucherId: Id<"vouchers">; offerId: Id<"offers">; shopName: string; shopLat: number; shopLng: number; title: string; code: string; createdAt: number; usedAt: number | null };
```

### App: the menu panel (frontend)
A "Menu" button (lucide `Menu` icon with the text label "Menu") at the top right of Home opens a panel that slides in from the right over a `scrim`, on `bg`, with these rows (icon + label, each opens its screen; "Demo tools" stays as the last row and the old top-right "Demo tools" button moves into the panel, keep its exact label):
- **Home**: closes the panel.
- **Wallet**: balance as `hero`, "Exchange points" primary button, vouchers (code in `hero`, shop, "Use" button with the same radius/demo rule and lines as Redeem: "Used." in `success`), and the history list (+12 in `success`, -300 in `danger`).
- **Exchange**: `offers.list` grouped by shop, with distance from the player; each offer a `Card`: title, shop, cost "300 pts" in `accent`, button "Exchange" (disabled with "You need 120 more points" when short). On success, toast "Voucher added to your wallet" and open Wallet.
- **Rewards**: the existing "YOUR REWARDS" (season prizes from `rewards.mine`) plus unused vouchers.
- **Shops**: the existing Shops screen.
- **Ranking**: two tabs, "Blocks" (`leaderboard.top`) and "Points" (`leaderboard.points`); my row highlighted.
- **Analytics**: `stats.mine`: StatNumbers (points, blocks held, walks, distance), a 7-day bar chart of metres walked built on the client from `recent` (react-native-svg), steals made / suffered, and the last walks list.
- **Invite**: "Invite your neighbours" with the website link (`https://azizjonrahimov.github.io/YC-Consumer-Mobile-Hackathon/`), a "Share invite" button (React Native `Share`), and a QR of the link (react-native-svg; skip the QR if it costs more than 10 minutes).
- **About**: what Lasso is (the rules in five short lines), "Built at the YC Consumer Mobile Hackathon with Convex, Capy, Revyl and Whop", the website link, version.
- **Demo tools**: add "Add 500 points" (`admin.grantPoints`).
The Result screen also shows "+N points" under the block count when `pointsEarned` is above 0. Home's player chip shows the balance: "12 blocks · 340 pts".

### Milestones
- **B8** (backend, 25 min): schema, `walks.submit` points, `wallet.mine`, `offers.list`, `offers.exchange`, `vouchers.use`, `stats.mine`, `leaderboard.points`, `admin.grantPoints`, seed and reset changes, tests for points, exchange (enough and not enough), voucher use twice. Push stubs with the right types first (5 min) so the frontend can import.
- **F10** (frontend): the menu panel, Wallet, Exchange, Rewards, Ranking, Analytics, Invite, About, the Result points line and the chip balance. Build against the types as soon as B8 stubs land.
Freeze is still 4:30 PM: if behind at 4:15, cut Analytics' chart first, then the Invite QR.

## Contract version 5 additions (owner request, 16:00): store page, profile, settings, full ranking

Shared word for word by both specs. Freeze moves to 4:45 PM.

### Changed
- `leaderboard.top` and `leaderboard.points` return at most **50** rows (was 10). Same shapes. The client numbers the rows (rank = index + 1, ties share the lower number).

### App (frontend, F11)
- **Store page** `src/app/store.tsx?shopId=…`: the shop's name, reward, distance, holder line and "Enclose N to take it" (from `shops.list`), then **"Offers"**: every offer for that shop from `offers.list` as a `Card` with title, cost "300 pts" in `accent`, and "Exchange" (same rules and messages as the Exchange screen; disabled with "You need N more points"). Opened by tapping a shop pin on Home, a shop card in Shops, or a shop header in Exchange.
- **Profile** (new Menu row, second after Home): `PlayerDot`, name, colour, flag; "Edit profile" lets the player change nickname and colour (calls `players.join` with the same `deviceId`, which updates them) and the flag (`players.setFlag`); stats: points, blocks held, walks, distance (from `stats.mine`); rank by points and by blocks (from the two leaderboards; "Not ranked yet" when absent).
- **Settings** (new Menu row, before About): "Distance units" (Metres / Miles, stored in AsyncStorage, used by every distance on screen), "Haptics" on/off, "Reduce motion" on/off (in addition to the system setting), "Location permission" row showing the status with "Open settings", "Sign out on this device" (confirm, then clear the stored playerId and go to Join; the player and blocks stay on the server), and "About Lasso".
- **Ranking**: list all rows returned (up to 50) with rank numbers, colour dot, name and the value; a pinned "Your rank" card at the top ("#4 of 12 by points"; "Not ranked yet" if absent).
- **Analytics**: add "Rank by points" and "Rank by blocks" StatNumbers.
Cut order if behind at 4:35: Settings units, then Profile rank lines.

### Milestones
- **B10** (backend, 5 min): the leaderboard limits, one test each.
- **F11** (frontend): the above. Report by 4:40.
