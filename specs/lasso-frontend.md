# Lasso frontend spec (phone app) — version 3

You are the frontend agent for a one-day hackathon build. You own the phone app. A separate backend agent owns `convex/`, a Capy cloud agent builds the big-screen web map in `screen/`, and a Lead agent coordinates everyone. Feature freeze is 4:45 PM. Submission is 5:45 PM.

## 1. Read first

1. Read `CLAUDE.md`, then this whole file, then `specs/lasso-lead.md` section 2 (the rules). You are HACK-FRONTEND. `CLAUDE.md` wins on how the team works; this spec wins on what to build. The app uses Expo Router under `src/`: screens go in `src/app/`, shared pieces in `src/components/`, tokens in `src/theme.ts`. If existing screens belong to a different app idea, replace them and tell the Lead.
2. Inspect the repo. It is Expo SDK 58 with Expo Router, TypeScript and the Convex client. It runs in Expo Go on the owners' phones, so use only libraries that work in Expo Go.
3. Do not edit anything under `convex/`, `screen/` or `web/` (the landing page, which is finished). Do not start `npx convex dev`; one copy is already running.
4. The Lead has already installed every library in section 6. Tell the Lead before adding anything else, because a new native library means a new build for the Revyl cloud device.
5. The backend ships stubs for every function first, so you build against real generated types from the start. Stubs return empty arrays and fixed values.
6. Import the generated API and helpers with relative paths from `src/` (for example `../../convex/_generated/api`). You may import pure helpers from `convex/lib/loop.ts` (`squareLoop`, `haversineM`, `pathLengthM`, types `Point`, `LatLng`). That file has no server imports. Import nothing else from `convex/lib/`.

## 2. The product in brief

Lasso is a walking game. The map is split into blocks. A player walks a closed loop and claims the blocks inside it. A block's strength is the number of blocks in the loop that claimed it. A rival steals a block only with a loop of more blocks than its strength. Some blocks contain a partner shop. Whoever holds a shop's block for the longest in a week wins that shop's reward and redeems it in person.

Every player also has one flag: a short message planted on all the blocks they hold. Other players see it when they tap a block, and in the alert when that player takes their blocks. It is there for personality: neighbours tease each other, and that rivalry is a reason to open the app.

A human tests on real phones outdoors. You can also see the app yourself on a Revyl cloud device once the Lead tells you it is up (section 9). Keep screens simple, make every failure visible on screen in plain words, and never leave the user at a spinner.

## 3. Hard rules

- No game rules on the phone. The phone records points, sends them, and draws what the backend returns. The phone never computes which blocks a loop contains.
- No passwords and no sign-in providers.
- Location only while the app is open. No background tracking, no push notifications.
- No payment screens. The only payment surface is one link to Whop's hosted invoice in the Shops screen.
- Every backend error and every rejected walk shows a plain sentence on screen. A thrown `ConvexError` carries the sentence in `error.data`; show it. For anything else show "Something went wrong. Try again."
- Every colour, size and font comes from `theme.ts` (section 5). No hex codes or font sizes inside screens.
- Every button and input has a visible text label that matches this spec exactly. The Revyl tests find controls by their words.
- Do not run git; in this repo only the Lead does (see `CLAUDE.md`). After each milestone, append a report to `.team/reports.md` headed `F<n>: <what works>` and message the Lead, who commits.

## 4. API contract

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

## 5. Design system: "Night map"

A dark map where territory glows. The map is the screen; everything else floats over it on glass. One accent colour, lime, means "you can act on this". Gold means a shop or a reward. Red means you lost something.

Four rules:

1. One primary button per screen, lime, at the bottom, reachable with a thumb.
2. Numbers are the heroes: block counts and held time are set large in the display font.
3. Sentences say what happened and what to do next, with the number: "Enclose 10 to take them back."
4. Motion marks a change of ownership and nothing else.

### 5.1 Tokens (`theme.ts`)

```ts
export const color = {
  bg: "#07070A", bgRaised: "#0E0E13", surface: "#15151C", elevated: "#1E1E28",
  border: "#2A2A36", borderStrong: "#3A3A4A",
  text: "#F5F5F7", textMuted: "#A0A0AE", textFaint: "#6B6B7A",
  accent: "#C6FF3D", accentDim: "#8FB82C", onAccent: "#0A0A0A",
  danger: "#FF3B5C", reward: "#FFC83D", info: "#3D9BFF", success: "#3DDC84",
  glass: "rgba(21,21,28,0.72)", scrim: "rgba(0,0,0,0.6)",
} as const;

// The six player colours offered on Join, in this order.
export const playerColors = ["#3D7BFF", "#FF4D5E", "#9B5CFF", "#FF8A3D", "#2ED3E6", "#FF5CC8"] as const;

export const space = { xxs: 2, xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 } as const;
export const radius = { sm: 8, md: 12, lg: 16, xl: 24, pill: 999 } as const;
export const glow = (hex: string) => ({
  shadowColor: hex, shadowOpacity: 0.55, shadowRadius: 18, shadowOffset: { width: 0, height: 0 }, elevation: 12,
});

export const font = {
  display: "SpaceGrotesk_700Bold", displaySemi: "SpaceGrotesk_600SemiBold",
  body: "Inter_400Regular", bodyMedium: "Inter_500Medium", bodySemi: "Inter_600SemiBold",
} as const;

export const type = {
  hero:       { fontFamily: font.display,     fontSize: 44, lineHeight: 48 },
  title1:     { fontFamily: font.display,     fontSize: 28, lineHeight: 34 },
  title2:     { fontFamily: font.displaySemi, fontSize: 22, lineHeight: 28 },
  body:       { fontFamily: font.body,        fontSize: 17, lineHeight: 24 },
  bodyStrong: { fontFamily: font.bodySemi,    fontSize: 17, lineHeight: 24 },
  callout:    { fontFamily: font.bodyMedium,  fontSize: 15, lineHeight: 20 },
  caption:    { fontFamily: font.bodyMedium,  fontSize: 13, lineHeight: 16 },
  overline:   { fontFamily: font.bodySemi,    fontSize: 11, lineHeight: 14, letterSpacing: 1.2, textTransform: "uppercase" as const },
} as const;
```

Load the fonts in the root layout with `useFonts` from `@expo-google-fonts/space-grotesk` and `@expo-google-fonts/inter`. Until they load, show a plain `bg`-coloured screen. If loading fails, carry on with the system font; never block the app on fonts. Numbers use `fontVariant: ["tabular-nums"]`.

### 5.2 Components (build once in `components/`)

| Component | Spec |
|---|---|
| `Button` | Variants: primary (accent background, `onAccent` text), secondary (`surface` background, `text`, 1 px `border`), ghost (text only), danger. Heights: large 56, medium 44. Radius pill. Label in `bodyStrong`. Press: scale to 0.97 over 90 ms plus a light haptic. Loading: a spinner replaces the label and the width stays fixed. Disabled: 40% opacity. |
| `GlassCard` | `BlurView` (intensity 40, tint dark) over `glass`, radius `lg`, padding `lg`, 1 px `border`. Used for the target card, the walk HUD and the banner. |
| `Card` | `surface` background, radius `lg`, padding `lg`, 1 px `border`. Used in lists. |
| `Pill` | Height 28, radius pill, `caption` text. Variants: neutral, accent, danger, reward, and a player colour. |
| `PlayerDot` | A 12 px circle in a player's colour beside their name. |
| `FlagText` | Shows a flag. Always inside curly quotation marks, so it reads as the player's words and not the app's. `numberOfLines={2}` with an ellipsis. Plain text only: never parse it as markup or a link. Colour: the flag owner's player colour. |
| `FlagField` | A text input labelled "Your flag", placeholder "A message for whoever takes your blocks", with a counter such as "12 / 40" from `maxFlagChars`. Count with `Array.from(text).length` and stop input at the limit. Used on Join, in the flag sheet and on Result. |
| `Banner` | A `GlassCard` at the top under the safe area with an icon, up to three lines, and a close button labelled "Dismiss". Danger variant has a 3 px `danger` left edge. |
| `StatNumber` | A `hero` number over an `overline` label, for example "7" over "BLOCKS". |
| `Toast` | Top of screen, glass, one line, 3 seconds. Errors stay until dismissed. |
| `EmptyState` | An icon in a 64 px `surface` circle, a `title2` line, one `body` line in `textMuted`, and at most one button. |
| `Skeleton` | `surface` blocks with a shimmer sweep on a 1.2 s loop. Used while a query is `undefined`. |

Icons: `lucide-react-native`, 24 px, 2 px stroke. Use `Flag` (start point), `Store` (shop), `Trophy` (reward), `Footprints` (walk), `Swords` (steal), `Wrench` (demo tools), `X` (close).

### 5.3 The map

- `react-native-maps` `MapView` with `userInterfaceStyle="dark"`, `showsUserLocation`, `showsCompass={false}`, `toolbarEnabled={false}`, `pitchEnabled={false}`, `rotateEnabled={false}`. On Android, where `userInterfaceStyle` does nothing with the Google provider, pass a dark `customMapStyle`; if that costs more than ten minutes, leave Android light.
- A cell is a `Polygon` from `boundary`. Fill: the owner's colour at 45% opacity, 65% for my own. Stroke: the same colour, 1.5 px, 2.5 px for my own. Set `tappable` and handle `onPress` (section 7B, "Tap a block").
- A shop is a `Marker` with a custom view: a 36 px circle, `reward` gold border 2 px, `bg` fill, the `Store` icon in gold. If I hold it, the border is `accent`. Under it, a `Pill` with the shop's name.
- My walk path is a `Polyline`, `accent`, 5 px, round caps.
- Keep the camera on the player on Home and Walk until the player drags the map; then show a small "Recenter" button.
- React keys: `cellId` for polygons and `shopId` for markers. Never the array index, or the map flickers on every update.

### 5.4 Motion and haptics

| Moment | Animation | Duration | Haptic (`expo-haptics`) |
|---|---|---|---|
| Loop closes | The path line flashes `accent` | 300 ms | Success notification |
| Blocks captured | Each cell in `claimedCellIds` fades its fill from 0 to 65%, 60 ms apart, then the block count counts up from 0 | 800 ms total | Medium impact when it starts |
| Blocks lost (banner appears) | The banner slides down from the top; the screen edge pulses `danger` once | 350 ms | Heavy impact |
| Reward won | The reward card scales from 0.9 to 1 and the code fades in | 400 ms | Success notification |
| Button press | Scale 0.97 | 90 ms | Light impact |

Use React Native's built-in `Animated` API. If the system "Reduce Motion" setting is on (`AccessibilityInfo.isReduceMotionEnabled`), skip the animations and show the end state.

### 5.5 Voice

Short and concrete. Say the number. Never blame the walker. "You claimed 7 blocks." "Sam took 3 of your blocks." "Enclose 10 to take them back." No exclamation marks, no emoji.

## 6. Shared client pieces

- **Libraries (already installed):** `react-native-maps`, `expo-location`, `expo-keep-awake`, `expo-haptics`, `@react-native-async-storage/async-storage`, `expo-font`, `@expo-google-fonts/space-grotesk`, `@expo-google-fonts/inter`, `expo-blur`, `react-native-svg`, `lucide-react-native`. The repo also has `expo-glass-effect` and `@expo/ui`; do not use them for the components in section 5, so the look is the same on every phone.
- **Identity:** on first launch create a random `deviceId`, store it with AsyncStorage, and keep the `playerId` returned by `players.join` in a context. The admin panel can switch the active `playerId` in that context; store the active one too, so a reload keeps it.
- **Location:** ask for foreground permission on the Join screen, after the player presses "Start". If denied, show "Lasso needs your location to record walks" with a button "Open settings".
- **No location fix:** if there is no position eight seconds after asking, or permission is denied while `demoMode` is true, use `center` from `config.public` as the position, and show a `Pill` on Home: "Using the venue as your location". This is what makes the app usable on a cloud device and indoors.
- **Queries:** a Convex `useQuery` result of `undefined` means loading: show a `Skeleton`, never a spinner over the whole screen. If the connection drops, Convex reconnects by itself; show a small `Pill` "Reconnecting…" when the connection state is not connected.
- **Distance:** `haversineM` from `convex/lib/loop.ts`, for display only (nearest shop, distance to the start flag). Under 1,000 m show whole metres ("300 m"); above, one decimal ("1.2 km").
- **Held time:** `formatHeld(ms)`: under a minute "under a minute", under an hour "12 min", otherwise "2 h 10 min".
- **Money:** `formatFee(cents)`: "$1.00".
- **Thresholds:** read `closeRadiusM`, `minLoopM`, `redeemRadiusM`, `shopMinBlocks` and `maxFlagChars` from `config.public`. Do not hard-code them.
- **My flag:** keep the `flag` returned by `players.join` and `players.setFlag` in the player context. When the admin panel switches player, take that player's `flag` from `players.list`.
- **Android maps:** outside Expo Go, `react-native-maps` on Android needs a Google Maps key. Tell the Lead if this blocks a build.

## 7. Screens

Each screen lists what it shows when loading, empty, failing and working.

### A. Join

- `bg` background. "Lasso" in `hero`. Under it, in `body` `textMuted`: "Walk a loop. Own the blocks inside it."
- A text field labelled "Nickname" (max 16 characters), six colour swatches (48 px circles, the chosen one has a 3 px `text` ring), an optional `FlagField`, and a primary button "Start".
- Pass the flag to `players.join` as `flag`. Leave it out when the field is empty.
- "Start" is disabled until the nickname has at least one character. Pressing it calls `players.join`, then asks for location permission, then goes Home.
- Failing: show the error sentence under the button.
- Skipped on later launches when a `playerId` is stored.

### B. Home

- Full-screen map centred on the player, with all cells from `cells.all` and a pin for each shop from `shops.list`.
- Top left, a `GlassCard` chip: my `PlayerDot`, my nickname, and my block count (cells in `cells.all` that I own) as "12 blocks". Pressing and holding it for two seconds opens the admin panel. When `demoMode` is true, also show a small secondary button "Demo tools" at the top right that opens the same panel.
- The target card, a `GlassCard` pinned above the button. Pick the nearest shop on the client from `shops.list` and the current position:
  - Held by someone else: "Free coffee at Blue Door, 300 m away. Held by Sam with a 7-block loop. Enclose 8 to take it."
  - Unheld: "Free coffee at Blue Door, 300 m away. Nobody holds it. Enclose 6 blocks to take it."
  - Held by me: "You hold Blue Door with a 7-block loop." and under it, in `caption`: "Held for 2 h 10 min" (stored time for me in `top` plus `Date.now() - holderSince`, refreshed every 30 seconds).
  - No shops yet: "Walk a loop to claim your first blocks."
  - The reward text is in `reward` gold. The number to enclose is in `accent`.
- A primary button "Start walk", large, full width, at the bottom.
- A secondary button "Shops" beside the target card's title. If I have an unredeemed reward, it shows a gold dot.
- The steal banner, for the newest item in `events.forMe` that is newer than the last one I dismissed (store the dismissed `createdAt` in AsyncStorage): "Sam took 3 of your blocks with a 9-block loop. Enclose 10 to take them back." If `shopName` is set, add "They now hold Blue Door." Danger variant. "Dismiss" hides it.
- **Flag chip.** Under the player chip, a small `GlassCard` chip showing my flag as `FlagText` on one line, or "Add a flag" when I have none. Pressing it opens a sheet with a `FlagField`, a primary button "Save" that calls `players.setFlag`, and a ghost button "Remove" that calls it with an empty string.
- **Tap a block.** Pressing a cell polygon opens a small `GlassCard` above the target card. Pressing the map elsewhere closes it.
  - Someone else's block: "Sam's block, held with a 7-block loop", then the flag as `FlagText` on its own line if `ownerFlag` is set.
  - My block: "Your block, held with a 7-block loop", then my flag if set.
- **Steal banner with a flag.** When `byFlag` is set, add it in quotes after a colon. The sentences stay in the same order: Sam took 3 of your blocks with a 9-block loop: “thanks for the coffee”. Enclose 10 to take them back. Without a flag the banner is unchanged.
- Loading: map visible, target card is a `Skeleton`.

### C. Walk

- The map follows the player. A `Flag` marker sits on the first recorded point.
- Record with `Location.watchPositionAsync({ accuracy: Location.Accuracy.High, timeInterval: 2000, distanceInterval: 5 })`. iOS ignores `timeInterval`, so also drop any point that arrives less than one second after the last one you kept. Store `{ lat, lng, t: location.timestamp, acc: location.coords.accuracy ?? 10 }`.
- Do not record points with `acc` above 50 in the drawn path; still keep counting. The server does the real filtering, so send every point you kept.
- Draw the path as a `Polyline`.
- The HUD, a `GlassCard` at the bottom:
  - Before the path reaches `minLoopM`: a `StatNumber` with the distance walked and the label "WALKED", a thin progress bar toward `minLoopM`, and "Keep going. A loop needs at least 150 m."
  - After: the distance, and "Return to the flag to close your loop. 85 m to go." (distance from the current position to the first point).
  - Weak signal (last point's `acc` above 25): a `Pill` "Weak GPS signal. Stay in the open."
- Keep the screen awake while this screen is open (`useKeepAwake`).
- Auto-close: when the path is at least `minLoopM` long, the player has been more than `2 * closeRadiusM` from the start at some point, and is now within `closeRadiusM` of the start, vibrate and submit with `walks.submit`. Also show a primary button "Close loop" once the path is long enough, for when auto-close does not fire.
- While submitting: the button shows its spinner and the HUD says "Counting your blocks…". If there is no answer in ten seconds, or the call fails, keep the points and show "Couldn't reach the server." with a button "Try again". Never throw a walk away because of a network error.
- A ghost button "Cancel" at the top left. It asks inside the screen: "Discard this walk?" with "Discard" and "Keep walking".
- If the app goes to the background (`AppState`), stop recording and, on return, show "Walk paused. Keep Lasso open while you walk." with "Resume" and "Discard". Resuming continues the same path.
- Save the points to AsyncStorage every ten points and clear them on submit or discard. If the app restarts with saved points less than 30 minutes old, offer "Resume your walk?".

### D. Result

- Captured: play the capture animation on a map fitted to `claimedCellIds`, then show a `StatNumber` with `claimed` and the label "BLOCKS CLAIMED", and "You claimed 7 blocks with a 9-block loop." If `stolen` is above 0, add "3 of them were taken from other players." Show each string in `notes` as its own line in `textMuted`. If `claimed` is 0, the headline is "No new blocks this time." instead.
- Rejected, by `reason`, with an `EmptyState`:
  - `not_closed`: "You need to finish where you started."
  - `too_fast`: "That was faster than a run, so it doesn't count."
  - `too_small`: "That loop was too small to hold a block."
  - `too_big`: "That loop is too big for today."
- After a captured walk, if I have no flag yet, show one extra block under the result: "Plant a flag on your new blocks" with a `FlagField` and a secondary button "Save". Skip it once I have a flag.
- One primary button "Back to map".

### E. Shops

- A header "Shops" in `title1` and a close button.
- "YOUR REWARDS" (`overline`), from `rewards.mine`. Each is a `Card` with a gold left edge: the shop's name, the reward, the code in `hero` with wide letter spacing, and a primary button "Redeem".
  - "Redeem" is enabled within `redeemRadiusM` of the shop, or whenever the Demo redeem toggle is on. Otherwise it is disabled and the card says "Go to Blue Door to redeem."
  - It calls `rewards.redeem` with the current position and `demo: true` when the toggle is on.
  - `too_far`: "You're too far from Blue Door to redeem." `already_redeemed`: "This reward was already redeemed."
  - After redeeming: the button is replaced by "Redeemed." in `success`, and a fee line in `caption`:
    - `pending`: "Blue Door owes $1.00"
    - `invoiced`: "Blue Door was invoiced $1.00" and, when `feeUrl` is set and `demoMode` is true, a ghost button "Open invoice" (`Linking.openURL(feeUrl)`)
    - `charged`: "Blue Door paid $1.00"
    - `failed`: "Fee could not be charged."
    - `none`: no line.
  - Empty: "No rewards yet. Hold a shop's block the longest this week to win one."
- "ALL SHOPS", from `shops.list`. Each is a `Card`: name, reward in gold, "Held by Sam with a 7-block loop" or "Nobody holds it", "Enclose 8 to take it" in `accent`, and up to three rows of `PlayerDot`, name and held time. For the current holder add `Date.now() - holderSince` to their stored `heldMs`; sort the rows by the resulting time.
  - Empty: "No shops on the map yet."

### F. Admin panel ("Demo tools")

A full-screen sheet on `bg` with a header "Demo tools" and a close button. Every action shows its result as a toast.

- **Acting as:** the active player's name. A button "Switch player" lists `players.list`; choosing one makes it the active player. A button "Add test player" asks for a nickname, a colour and an optional flag and calls `players.join` with `deviceId = <this device's id> + "#" + nickname`, then switches to it.
- **Fake loop:** a choice "Around: Here" plus one entry per shop from `shops.list` ("Around: Blue Door"), and two buttons, "Fake loop: small" and "Fake loop: large". Each builds `squareLoop(centre, 130 or 200, Date.now())` and sends it to `walks.submit` as the active player, then opens the Result screen. This is how humans, and the Revyl tests, play indoors.
- **Replay last walk:** load `walks.last`, open the Walk screen drawing the path at ten times speed, then submit the same points with timestamps shifted so the last one is now. It submits as the active player, so switch player or reset first when showing a steal.
- **Seed venue shops:** calls `admin.seedShops` with the list bundled in `assets/seed-shops.json`.
- **Seed shops from JSON:** a text box that accepts a JSON array of `{name, lat, lng, reward, feeCents}`.
- **End the week:** `season.end`. Toast: "Week ended. 2 rewards created."
- **Demo redeem:** a toggle, shown only when `demoMode` is true.
- **Reset map:** `admin.reset`, behind an in-panel confirm: "Clear every block, walk and reward?" with "Reset" and "Cancel".

## 8. The big-screen map and the landing page

`web/index.html` is the finished landing page. It is one file with no build step; leave it alone.

`screen/` is built by a Capy cloud agent from the brief in the Lead spec, on a branch, and merged by the Lead. You do not build it. If the Lead tells you Capy is unavailable, build it from that brief after F6.

## 9. Checking your own work on a Revyl cloud device

When the Lead says the Revyl dev loop is up, you can open the app on a cloud iPhone and look at each screen after you change it. Follow the Revyl agent skill installed in the repo for the exact commands. The cloud device has no GPS, so the app falls back to the venue's position there; use "Demo tools" and "Fake loop: small" to exercise capture. Before reporting a milestone done, check on the device that the screen renders, the labels match this spec, and no error overlay appears. If the dev loop is not up, type-check, and tell the Lead what a human should look at.

## 10. Milestones

Report to the Lead at the end of each one with: what works, what a human should check on a phone, anything you could not test.

| # | Deliver | Needs from backend | Human check on a phone |
|---|---|---|---|
| F0 | `theme.ts`, fonts loading, `Button`, `GlassCard`, `Card`, `Pill`, `Toast`, Convex provider. Target: 15 minutes. | none | none |
| F1 | Join, and Home with the dark map and the player's position (or the venue fallback). | B0 stubs | Blue dot on two phones |
| F2 | Cell drawing, the admin panel with Fake loop, Add test player and Switch player, the Result screen without animation. | B2 | A fake loop on one phone colours cells on both within a second |
| F3 | Walk screen with real tracking, the HUD, auto-close, "Close loop", cancel, pause and retry. | B2 | A real loop walked outside is captured |
| F4 | Steal banner with its haptic. | B3 | Phone B takes blocks from phone A; A sees the banner |
| F4b | Flags: `FlagText`, `FlagField`, the Join field, the flag chip and sheet, tap a block, the banner with `byFlag`, the Result prompt. Budget 25 minutes. First thing to cut if behind. | B3 | B's flag shows in A's banner and on B's blocks |
| F5 | Shop pins, target card, Shops screen, End the week, Seed venue shops, Fake loop around a shop. | B4 | Ending the week shows a code on the winner's phone |
| F6 | Redeem, fee line, "Open invoice", Demo redeem toggle. | B5 | Redeem shows "Redeemed." and a fee line |
| F7 | Replay, capture animation, Reset map, saved-walk resume. | B6 | Replay runs indoors start to finish |
| F8 | Polish pass against section 5: spacing, glass, empty states, Reduce Motion. | none | Looks right on both phones |
| F9 | Stretch, only if everything above passes: a "Top walkers" list from `leaderboard.top` in the Shops screen, a faint grid of unclaimed blocks from `grid.around`, and a live "Closing now takes 7 blocks" line in the walk HUD from `walks.preview` (query at most once every ten new points). | B7 | Shows on Home and Walk |

Build order inside each screen: working with real data first, then loading and error states, then looks. If you are behind at 4:00, tell the Lead and skip F8 detail; the tokens already carry most of the look.

## 11. Out of scope today

Leagues and invites, the weekly reset timer, perks for runners-up, hiding blocks near home, shop sign-up, step counting, AI-written alerts, push notifications, background location, a 3D map.

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
