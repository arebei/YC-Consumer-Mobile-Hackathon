# Lasso: build log

Lasso is a walking game: walk a closed loop to claim the map blocks inside it, steal blocks from rivals with bigger loops, and hold a partner shop's block the longest to win its reward. Built on 15 November 2026 at the YC Consumer Mobile Hackathon.

## Sponsor tools and where they are used

### Convex (backend)
- Dev deployment: `fantastic-crocodile-610`.
- All game rules run server side in `convex/`. Pure rule functions live in `convex/lib/` (`loop.ts`, `grid.ts`, `rules.ts`, `flag.ts`); Convex functions load documents, call them, and write the result.
- `walks.submit` is the whole capture in one mutation. Convex runs mutations as serializable transactions, so two players racing for the same block can never both own it, with no locks.
- Live updates: the map (`cells.all`), shop standings (`shops.list`) and steal alerts (`events.forMe`) are reactive queries, so a capture shows up on every phone and on the big screen at once.
- Scheduled functions: `rewards.redeem` schedules `payments.chargeShopFee`, which polls Whop with `payments.checkFee`.
- Points economy (contract v4): every captured walk earns points; `offers.exchange` spends them on shop offers and issues a voucher; every balance change writes one `ledger` row inside the same transaction, so a balance can never drift from its history.
- The map grid is H3 hexagons (`h3-js`, resolution 11) running inside Convex functions.
- Tests: `convex-test` + `vitest` (`npx vitest run`): 38 tests over the pure rules and the public API.

### Whop (payments)
- The shop pays a small fee each time a reward is redeemed. `convex/payments.ts` creates and issues a Whop invoice in the sandbox and stores its hosted payment link.
- `WHOP_API_KEY`, `WHOP_ACCOUNT_ID` and `WHOP_SHOP_EMAIL` are set as Convex environment variables.
- First live sandbox run (13:59): a test player held "Happy Cow Creamery & Tea", the season ended, and the reward was redeemed. Whop created draft invoice `pay_VMhcQG436HwYZF` for $1.00, confirming the fee is sent in dollars (`feeCents / 100`). Issuing it was refused until the sandbox business account completes Whop's account verification (`invoice_account_verification_required`). Found on the way: Whop caps a variant title at 30 characters, so the shop name moved into the item description.

### Capy (coding agent)
- 13:36: thread `jam_01M7GJ2NQ0JGP56QYK8EKR34RN`, started via the Capy API, built `screen/`, the big-screen live map. Merged as PR #1 (`0b165fb`).
- 13:47: thread `jam_01M7GJQ2EMP958N7KZH3R03BE1` runs the Revyl iOS build, installs it on a cloud iPhone, runs 3 smoke tests, and turns on Revyl proof of changes for pull requests. The proof-of-changes config landed as PR #2, merged as `807f693`.

### Revyl (cloud devices)
- Driven through Capy (thread `jam_01M7GJQ2EMP958N7KZH3R03BE1`). Capy built the app on Revyl's runners: Revyl app "Lasso", build `remote-8f24f156`, an iOS simulator build with the JavaScript bundled and `EXPO_PUBLIC_CONVEX_URL` set.
- 14:40-14:54: the 3 smoke tests from `revyl/*.yaml` ran on a Revyl cloud iPhone 16 (iOS 27):
  - `lasso-capture`: passed, 8/8 steps. [Report](https://app.revyl.ai/tests/report?taskId=8d0725fa-4ef3-4834-b573-bf44c5c2e378). Shareable link: https://app.revyl.ai/tests/report?token=2903123c-f791-45a8-9e96-37b03be6db72
  - `lasso-steal`: all 9/9 steps passed, including the steal banner, but Revyl marks the session as failed. [Report](https://app.revyl.ai/tests/report?taskId=aedf4084-d6eb-498a-8555-78c56b358a5d)
  - `lasso-reward`: passed, 12/12 steps. [Report](https://app.revyl.ai/tests/report?taskId=514ab368-dbe8-40a0-9445-a45828df10fb)
- Revyl proof of changes runs on every pull request (config in PR #2, `807f693`).
- Backup build: EAS cloud simulator build `6f89b0dc` (Expo project `yc-hackathon`).

## Timeline (Pacific)
- 13:33: backend B0 + B1. Every API function is deployed with typed returns; H3 loads in Convex (a 150 m loop encloses 11 blocks).
- 13:35: backend B2-B4 + B6. Capture, steal, blocked blocks, flags on alerts, shops, season end, rewards, demo redeem and reset, all covered by tests (34/34).
- 13:36: Capy starts the big-screen map.
- 13:47: Capy starts the Revyl iOS build, cloud iPhone, smoke tests and proof of changes.
- 13:50: backend B5. The Whop sandbox fee chain (create invoice, issue, poll until paid) is deployed in `convex/payments.ts`.
- 13:59: first live Whop run: invoice `pay_VMhcQG436HwYZF` created; issuing waits on Whop account verification of the sandbox business.
- 14:40-14:54: Revyl smoke tests on a cloud iPhone 16 (iOS 27): capture 8/8, steal 9/9 (session marked failed), reward 12/12.
- 15:28: backend B8. Points from walks, an exchange of points for shop offers, vouchers, wallet, stats and a points leaderboard; deployed with tests (38/38) and 8 offers seeded on the 4 partner shops.
