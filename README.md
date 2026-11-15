# Lasso

**Walk a loop. Own the blocks inside it.**

Lasso is a walking game for your own neighbourhood. The map is split into hexagonal blocks. Walk a closed loop and you claim every block inside it. A neighbour can take your blocks back, but only with a bigger loop. Local shops put up the prizes: whoever holds a shop's block the longest this week wins its reward, redeemed in person.

Built in one day at the YC Consumer Mobile Hackathon, 15 November 2026, in San Francisco.

## Who it's for

People who know they should walk more and find exercise boring. Lasso gives them a reason to go out today: a rival on the next street, a block to win back, and a free coffee 300 m away.

## Why you'd open it again tomorrow

- **Someone took your blocks.** The red banner tells you who did it, quotes their flag at you, and tells you exactly how big a loop takes them back: "Sam took 3 of your blocks with a 9-block loop: “thanks for the coffee”. Enclose 10 to take them back."
- **The week is running.** The shop's prize goes to whoever holds its block the longest, so time held counts every day.
- **The map is live.** Every capture shows up on every phone and on the big screen in under a second.

## How it plays

1. Join with a nickname, a colour and an optional flag (a message of up to 40 characters shown on your blocks).
2. Tap **Start walk**, walk a loop and come back to the start. The loop closes by itself.
3. Every block whose centre is inside your loop is yours. A block's strength is the size of the loop that claimed it.
4. A rival takes a block only with a loop of more blocks than its strength. A shop's block needs a loop of at least 6 blocks.
5. When the week ends, the longest holder of each shop gets a code to redeem at the counter, and the shop is invoiced a small fee through Whop.
6. Only walking and running count. Loops covered faster than a run are rejected.

Today's blocks are demo-sized (about 50 m across): a loop of roughly 500 m takes a shop. The shops are real places near YC; the rewards are samples the team made up, and no shop has signed up yet.

## Sponsor tools, used for real

| Tool | What it does in Lasso | Evidence |
|---|---|---|
| **Convex** | The whole backend: database, every game rule, live updates to every phone and the big screen, and the scheduler that calls Whop. `walks.submit` is one transaction, so two phones racing for a block can never both own it. Map grid: H3 hexagons running inside Convex functions. | `convex/`, 34 tests (`npx vitest run`) |
| **Capy** | Cloud coding agents, driven through the Capy API. One thread built the big-screen live map in `screen/` as a pull request; another built the iOS app on Revyl, ran the smoke tests and turned on Revyl proof of changes. | [PR #1](https://github.com/azizjonrahimov/YC-Consumer-Mobile-Hackathon/pull/1) (big screen), [PR #2](https://github.com/azizjonrahimov/YC-Consumer-Mobile-Hackathon/pull/2) (Revyl proof of changes) |
| **Revyl** | The app built for the iOS simulator and run on a cloud iPhone 16, checked by three plain-English tests in `revyl/`: capture, steal and reward. | [lasso-capture report](https://app.revyl.ai/tests/report?token=2903123c-f791-45a8-9e96-37b03be6db72) (8/8 passed); steal 9/9 steps; reward 12/12 |
| **Whop** | The business model. When a reward is redeemed, Convex creates a $1.00 invoice for the shop in Whop's sandbox and follows it until it is paid. No real money moves. | `convex/payments.ts`; sandbox invoice `pay_VMhcQG436HwYZF` |

The full build log with times and links is in [`hackathon.md`](hackathon.md).

## Run it

```bash
npm install
npx convex dev                         # backend; writes EXPO_PUBLIC_CONVEX_URL to .env.local
npx expo start --go --tunnel ngrok     # scan with Expo Go on a phone
npx vitest run                         # 34 tests
cd screen && npm install && npm run dev   # big-screen live map (copy .env.example to .env)
```

Indoors or on a cloud device without GPS, the app uses the venue as its position: open **Demo tools** and use **Fake loop: small** / **Fake loop: large** or **Replay last walk**.

## Repo map

| Path | What |
|---|---|
| `src/app/` | Expo Router screens: Join, Home (map), Walk, Result, Shops, Demo tools |
| `src/components/`, `src/theme.ts` | "Night map" design system |
| `convex/` | Schema, functions, Whop payments; pure game rules in `convex/lib/` |
| `screen/` | Big-screen live map for a projector (built by Capy) |
| `revyl/`, `.revyl/` | Revyl smoke tests and proof-of-changes config |
| `web/index.html` | Landing page |
| `specs/` | The build specs the team worked from |

## Team

Built by a human team with three Claude Code agents (lead, backend, frontend) and Capy's cloud agents. All code was written on 15 November 2026 after 10:00 AM.
