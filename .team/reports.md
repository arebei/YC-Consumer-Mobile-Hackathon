# Reports (append only)


## B0 + B1 (HACK-BACKEND, 13:33): every contract function deployed, h3 loads in Convex
- New files in `convex/`: `config.ts` (`config.public`), `cells.ts` (`all`), `grid.ts` (`around`), `shops.ts` (`list`), `events.ts` (`forMe`, `recent`), `season.ts` (`end`), `rewards.ts` (`mine`, `redeem`), `admin.ts` (`seedShops`, `reset`), `leaderboard.ts` (`top`), `payments.ts` (internal `chargeShopFee`, `checkFee`: **stubs until B5**). `walks.ts` gains `last` and `preview`.
- These are real implementations, not empty stubs, with explicit return types matching contract v3, so the frontend gets exact types from `api`. Contract shapes unchanged. View types are exported for the frontend if useful: `CellView` (cells.ts), `ShopView` (shops.ts), `EventView` (events.ts), `RewardView` (rewards.ts), `SubmitResult` (lib/rules.ts).
- `config.public`: `public` is a reserved word in JS, so it is declared as `publicConfig` and exported as `public`; the client calls `api.config.public` as the contract says.
- Removed every `any` cast in `walks.ts` and `players.ts` (real `Doc`/`Id` types now).
- Verified: `npx tsc -p convex --noEmit` clean; the running `convex dev` regenerated `_generated/api.d.ts` with all modules; `npx convex run config:public` returns the real config; `cells:all` returns `[]`; `npx vitest run`: 29/29 pass.
- B1 grid proof: `npx convex run grid:around` at VENUE returns 127 hexagons (6 rings) with 6-point boundaries; `walks:preview` on a 150 m square returns 11 blocks (spec table: 9 to 11). `GRID` stays `"h3"`. No temporary query was added.
- Untested so far: shops/season/rewards/events end to end (T2-T7, T9-T11 tests come in B2-B6). Payments do nothing yet.
- Note: my earlier `convex/lib.ts` (Prompted) is gone from `convex/`; I assume LEAD moved it to `.team/on-hold/`.

## F0: theme, fonts, Button/GlassCard/Card/Pill/Toast, Convex provider (HACK-FRONTEND, 13:52)
- `src/theme.ts`: spec 5.1 tokens word for word, plus `size`, `motion`, `opacity`, `blur` so screens have no raw numbers.
- `src/app/_layout.tsx`: loads Space Grotesk 600/700 and Inter 400/500/600 with per-weight imports (only 5 .ttf in the bundle, not all 30). Shows a plain `bg` screen until loaded, carries on with the system font on error or after 4 s. `ConvexProvider` with `EXPO_PUBLIC_CONVEX_URL`; if the var is missing it shows "Lasso can't find its server." instead of crashing. `ToastProvider`, light status bar, headerless Stack on `bg`.
- `src/components/`: `Button` (primary/secondary/ghost/danger, 56/44, scale 0.97 over 90 ms + light haptic, spinner keeps width, 40% disabled), `GlassCard` (BlurView 40 dark over `glass`), `Card` (optional gold left edge), `Pill` (neutral/accent/danger/reward/player colour), `Toast` (`useToast().show()` 3 s, `.error()` stays until "Dismiss").
- `src/app/index.tsx` is a temporary F0 showcase screen (all components + a live `players.list` count); F1 replaces it with Join/Home.
- Removed template `src/app/explore.tsx`, `src/components/app-tabs.tsx`, `app-tabs.web.tsx`. Other template components are untouched and unused.
- Checked: `npx tsc --noEmit` clean; `npx expo export --platform ios` builds (2.9 MB bundle, output in my scratchpad, nothing written to the repo).
- Not checked on a device (no Revyl loop yet). Human check: none needed for F0.

## B2 + B3 + B4 + B6 (HACK-BACKEND, 13:36): capture, steal, flags, shops, season, rewards, reset all tested
- No new functions were needed (all written in B0). This milestone is verification.
- New test file `convex/api.test.ts` (5 tests) drives everything through the public `api`. I made it a separate file, not an extension of `game.test.ts`, to leave the kit file untouched. It covers T1, T2, T3, T8 (plus `walks.last` skipping rejected walks and `leaderboard.top`), T11 (`byFlag` frozen, `ownerFlag` live), T4 + T10 (shop minimum note; `seedShops` twice keeps count 1, updates by name, skips a second shop in the same block), T5 (fake timers: A holds 1 h, B takes it, `shops.list` shows B as holder and A first in `top` with about 1 h; `season.end` gives one reward to A, a second call gives 0; `rewards.mine` shape), T6, T7 (too_far, demo ok with `feeStatus: "pending"`, then already_redeemed) and T9 (`admin.reset` clears cells/events/rewards, keeps players and shops; a new season can end again).
- `npx vitest run`: 34/34 pass. `npx tsc -p convex --noEmit` clean.
- Untested: the live Whop call (B5, next). `grid.around` was checked by hand on the deployment in B1.
- Created `hackathon.md` at the repo root with the sponsor uses LEAD sent (Convex deployment, Whop env vars, Capy thread). If the Convex hackathon skill PR later creates its own `hackathon.md`, keep this content.

## F1: Join and Home with the dark map and position or venue fallback (HACK-FRONTEND, 14:12)
- Routing: `src/app/index.tsx` sends a stored player to `/home`, else `/join`.
- Identity `src/lib/player.tsx`: random `deviceId` in AsyncStorage, active player `{playerId, name, color, flag}` in context and AsyncStorage (ready for Switch player in F2). Home re-syncs name/colour/flag from `players.list` and sends you back to Join if your player is gone.
- Join `src/app/join.tsx`: "Lasso", tagline, "Nickname" (max 16), six swatches (labelled "Colour 1".."Colour 6" for Revyl), optional `FlagField` (counter from `config.maxFlagChars`), "Start" disabled until a nickname. Start calls `players.join` (flag left out when empty), then asks foreground location permission, then Home. Errors show the ConvexError sentence under the button.
- Home `src/app/home.tsx`: full-screen dark `react-native-maps` map (Android gets a dark `customMapStyle`), cells from `cells.all` drawn already (45%/65% fill, 1.5/2.5 stroke, keyed by cellId), player chip (dot, name, "N blocks"), camera follows you until you drag, then "Recenter". "Using the venue as your location" pill when there is no fix after 8 s or permission is denied in demo mode. "Reconnecting…" pill when the Convex socket is down. Denied permission outside demo mode: "Lasso needs your location to record walks" + "Open settings". Card shows "Walk a loop to claim your first blocks." (target card proper is F5). "Start walk" goes to a placeholder Walk screen (F3).
- Components added: `PlayerDot`, `Skeleton` (shimmer, off with Reduce Motion), `FlagText`, `FlagField`, `LassoMap`.
- Checked: `npx tsc --noEmit` clean, `npx expo export --platform ios` builds. Not run on a device yet.
- Human check on a phone: Join with a nickname, allow location, see the blue dot on the dark map on two phones; deny location on one and check the venue pill (demo mode) or the settings card.

## B5 code done, live check blocked on WHOP_SHOP_EMAIL (HACK-BACKEND, 13:50); B6 + B7 done
- `convex/payments.ts`: `chargeShopFee` (internal action) runs create invoice, then issue, then saves `feeStatus: "invoiced"` + `whopInvoiceId`, then schedules `checkFee` every 15 s, up to 40 times, which sets `"charged"` when Whop says `paid`. Any non-2xx or throw gives `feeStatus: "failed"` + `feeError` (status + first 300 chars) + `console.error`, and it never throws. Idempotency keys are `lasso-invoice-<rewardId>` and `lasso-issue-<rewardId>`. It pins the `Api-Version-Date: 2026-11-14-1` header. The base URL defaults to sandbox and only `WHOP_API_BASE` overrides it; `WHOP_ENVIRONMENT` is ignored on purpose.
- Docs checked (docs.whop.com plus the public OpenAPI spec): `initial_price` is in dollars ("5.00 means $5.00"), so `feeCents / 100`. An inline variant needs no product.
- **Spec gap:** the issued invoice's `checkout_link` is a signed token, not an openable URL. The docs say "pass it as `link` to `POST /checkout_sessions`", but that endpoint is not in the public spec. The code tries it best effort and stores `purchase_url`/`url` as `feeUrl` if it works. If not, the fee is still `invoiced` with `feeUrl: null`. FRONTEND must handle `invoiced` + `feeUrl === null` (e.g. "Invoice sent to Blue Door"). The function logs show which case happened on the first live run.
- Env on the deployment: `WHOP_API_KEY`, `WHOP_ACCOUNT_ID` set. **`WHOP_SHOP_EMAIL` missing.** Until it is set, every redeem stays `pending` (the spec's accepted fallback, "Blue Door owes $1.00"). The owner sets it with `npx convex env set WHOP_SHOP_EMAIL <inbox>`.
- Ops helper: `npx convex run payments:retry '{"rewardId":"<id>"}'` re-sends a fee stuck in `pending` or `failed` (fresh idempotency keys).
- Verified: tsc clean (declared `process.env` locally, since @types/node is not installed); 34/34 tests pass (T6, T7 cover redeem; the scheduled action no-ops in tests with no env).
- B6 (`admin.reset`: T9; `grid.around`: manual call in B1) and B7 (`leaderboard.top`: in api.test.ts; `walks.preview`: manual call in B1) were done earlier and are verified.
- Not done yet: one live redeem showing `invoiced` + link (needs `WHOP_SHOP_EMAIL`). After that I stay available for tuning and hackathon.md.
