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
