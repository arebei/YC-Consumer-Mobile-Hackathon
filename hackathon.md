# Lasso: build log

Lasso is a walking game: walk a closed loop to claim the map blocks inside it, steal blocks from rivals with bigger loops, and hold a partner shop's block the longest to win its reward. Built on 15 November 2026 at the YC Consumer Mobile Hackathon.

## Sponsor tools and where they are used

### Convex (backend)
- Dev deployment: `fantastic-crocodile-610`.
- All game rules run server side in `convex/`. Pure rule functions live in `convex/lib/` (`loop.ts`, `grid.ts`, `rules.ts`, `flag.ts`); Convex functions load documents, call them, and write the result.
- `walks.submit` is the whole capture in one mutation. Convex runs mutations as serializable transactions, so two players racing for the same block can never both own it, with no locks.
- Live updates: the map (`cells.all`), shop standings (`shops.list`) and steal alerts (`events.forMe`) are reactive queries, so a capture shows up on every phone and on the big screen at once.
- Scheduled functions: `rewards.redeem` schedules `payments.chargeShopFee`, which polls Whop with `payments.checkFee`.
- The map grid is H3 hexagons (`h3-js`, resolution 11) running inside Convex functions.
- Tests: `convex-test` + `vitest` (`npx vitest run`): 34 tests over the pure rules and the public API.

### Whop (payments)
- The shop pays a small fee each time a reward is redeemed. `convex/payments.ts` creates and issues a Whop invoice in the sandbox and stores its hosted payment link.
- `WHOP_API_KEY` and `WHOP_ACCOUNT_ID` are set as Convex environment variables. `WHOP_SHOP_EMAIL` is still pending.

### Capy (coding agent)
- 13:36: thread `jam_01M7GJ2NQ0JGP56QYK8EKR34RN`, started via the Capy API, builds `screen/`, the big-screen live map. PR to follow.

### Revyl (cloud devices)
- Not used yet.

## Timeline (Pacific)
- 13:33: backend B0 + B1. Every API function is deployed with typed returns; H3 loads in Convex (a 150 m loop encloses 11 blocks).
- 13:35: backend B2-B4 + B6. Capture, steal, blocked blocks, flags on alerts, shops, season end, rewards, demo redeem and reset, all covered by tests (34/34).
- 13:36: Capy starts the big-screen map.
