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
- `WHOP_API_KEY`, `WHOP_ACCOUNT_ID` and `WHOP_SHOP_EMAIL` are set as Convex environment variables.
- First live sandbox run (13:59): a test player held "Happy Cow Creamery & Tea", the season ended, and the reward was redeemed. Whop created draft invoice `pay_VMhcQG436HwYZF` for $1.00, confirming the fee is sent in dollars (`feeCents / 100`). Issuing it was refused until the sandbox business account completes Whop's account verification (`invoice_account_verification_required`). Found on the way: Whop caps a variant title at 30 characters, so the shop name moved into the item description.

### Capy (coding agent)
- 13:36: thread `jam_01M7GJ2NQ0JGP56QYK8EKR34RN`, started via the Capy API, built `screen/`, the big-screen live map. Merged as PR #1 (`0b165fb`).
- 13:47: thread `jam_01M7GJQ2EMP958N7KZH3R03BE1` runs the Revyl iOS build, installs it on a cloud iPhone, runs 3 smoke tests, and turns on Revyl proof of changes for pull requests.

### Revyl (cloud devices)
- Driven through Capy (thread `jam_01M7GJQ2EMP958N7KZH3R03BE1`, 13:47): iOS simulator build with the JavaScript bundled and `EXPO_PUBLIC_CONVEX_URL` set, installed on a Revyl cloud iPhone, 3 smoke tests, and proof of changes on every PR.

## Timeline (Pacific)
- 13:33: backend B0 + B1. Every API function is deployed with typed returns; H3 loads in Convex (a 150 m loop encloses 11 blocks).
- 13:35: backend B2-B4 + B6. Capture, steal, blocked blocks, flags on alerts, shops, season end, rewards, demo redeem and reset, all covered by tests (34/34).
- 13:36: Capy starts the big-screen map.
- 13:47: Capy starts the Revyl iOS build, cloud iPhone, smoke tests and proof of changes.
- 13:50: backend B5. The Whop sandbox fee chain (create invoice, issue, poll until paid) is deployed in `convex/payments.ts`.
- 13:59: first live Whop run: invoice `pay_VMhcQG436HwYZF` created; issuing waits on Whop account verification of the sandbox business.
