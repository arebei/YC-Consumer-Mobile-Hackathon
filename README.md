# Lasso

A walking game for your own neighbourhood. Walk a loop, and the blocks inside it are yours until a neighbour walks a bigger one.

We built it in one day at the YC Consumer Mobile Hackathon in San Francisco, on 15 November 2026.

- Website: https://azizjonrahimov.github.io/YC-Consumer-Mobile-Hackathon/
- Play it in a browser: https://azizjonrahimov.github.io/YC-Consumer-Mobile-Hackathon/app/

## Why we made it

Most people know they should walk more and don't, because a walk with nowhere to go is boring. Lasso gives the walk a point. There is a block to win back from the person on the next street, and a free coffee at the corner café for whoever holds its block the longest.

The shops are the business. A shop puts up a reward, and pays a small fee only when the winner turns up at the counter to collect it.

## The rules

1. The map is split into hexagonal blocks.
2. Start a walk, go round in a loop and come back to where you started. Every block whose centre is inside the loop becomes yours.
3. A block is as strong as the loop that claimed it. A 9-block loop gives you nine blocks, each with strength 9.
4. To take someone's block, you need a loop with more blocks than its strength. Walking the same loop twice doesn't help.
5. If your loop covers only part of someone's territory, each block is decided on its own. You take the ones your loop is big enough for, and they keep the rest.
6. A block with a shop in it needs a loop of at least 6 blocks, so you can't win a café by circling it.
7. When the week ends, whoever held a shop's block the longest gets a code to redeem at the counter.
8. Only walking and running count. A loop covered at cycling or driving speed is rejected.

When someone takes your blocks, you get an alert like this:

> Sam took 3 of your blocks with a 9-block loop: "thanks for the coffee". Enclose 10 to take them back.

The part in quotes is Sam's flag, a message of up to 40 characters that each player can plant on their blocks.

Walks also earn points. You can spend them in the Exchange on vouchers from the shops on the map, and the vouchers go to your Wallet. The menu also has a ranking, a chart of your week's walking and an invite code.

## What's real and what isn't

- The blocks are demo-sized, about 50 m across, so a loop of roughly 500 m is enough to take a shop. Real neighbourhoods would use bigger blocks.
- The shops are real places near the YC office. We made up the rewards, and no shop has agreed to anything yet.
- The week ends when we press a button in Demo tools, not on a timer.
- The shop's fee runs in Whop's sandbox. No real money moves.
- Everyone who opens the app shares one map. Local leagues of nearby players aren't built.
- Strength is meant to halve each day, so that nobody can lock up the neighbourhood with one long run. The code for it is written and switched off (`DECAY_ENABLED` in `convex/lib/config.ts`).

## How it's built

The app is Expo and React Native. The hackathon asked us to use Convex, Capy and Revyl, and we added Whop for the shop's fee.

**Convex** is the whole backend: the database, every game rule and the live updates. A walk is submitted as one transaction (`walks.submit`), so two phones racing for the same block can't both end up owning it. The hexagons are H3, running inside Convex functions. There are 41 tests, run with `npx vitest run`.

**Capy** ran cloud coding agents for us. They built the big-screen map ([PR #1](https://github.com/azizjonrahimov/YC-Consumer-Mobile-Hackathon/pull/1)), set up the Revyl checks on pull requests ([PR #2](https://github.com/azizjonrahimov/YC-Consumer-Mobile-Hackathon/pull/2)), and built the website ([PR #3](https://github.com/azizjonrahimov/YC-Consumer-Mobile-Hackathon/pull/3)) and the browser version ([PR #4](https://github.com/azizjonrahimov/YC-Consumer-Mobile-Hackathon/pull/4)).

**Revyl** runs the app on a cloud iPhone 16 and checks it with three tests written in plain English, kept in `revyl/`: capture, steal and reward. Capture passed 8 of 8 steps ([report](https://app.revyl.ai/tests/report?token=2903123c-f791-45a8-9e96-37b03be6db72)) and reward passed 12 of 12. Steal passed all 9 of its steps, although Revyl still marks that run as failed.

**Whop** handles the shop's fee. When a reward is redeemed, Convex creates a $1.00 invoice for the shop in Whop's sandbox (`convex/payments.ts`). Our first run created draft invoice `pay_VMhcQG436HwYZF`. Whop won't issue it until it has verified our sandbox account.

The build log, with times and links, is in [`hackathon.md`](hackathon.md).

## Run it

```bash
npm install
npx convex dev                            # backend; writes EXPO_PUBLIC_CONVEX_URL to .env.local
npx expo start --go --tunnel ngrok        # scan the code with Expo Go on a phone
npx vitest run                            # tests
cd screen && npm install && npm run dev   # big-screen map; copy .env.example to .env first
```

Indoors, or on a cloud device with no GPS, the app uses the venue as your position. Open Menu > Demo tools and use a Fake loop button or Replay last walk.

## Where things are

| Path | What's there |
|---|---|
| `src/app/` | The app's screens |
| `src/components/`, `src/theme.ts` | Shared components and the dark map theme |
| `convex/` | Schema, functions and the Whop payment code. The game rules are plain functions in `convex/lib/`. |
| `screen/` | The big-screen map for a projector |
| `revyl/`, `.revyl/` | The Revyl tests and their config |
| `web/index.html` | The website |
| `specs/` | The specs we built from |
| `DEMO.md` | The two-minute demo script |

## Who built it

We planned it, tested it on our phones and walked the loops. Claude Code agents and Capy's cloud agents wrote most of the code. All of it was written on the day, after hacking started.
