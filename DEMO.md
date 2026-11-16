# Lasso: 2-minute demo script

Rehearse twice. Two presenters: **P** (on stage, holds the presenting phone) and **W** (the walker, outside). A third phone plays **Sam**, the rival.

## Setup (from 4:30, done by 6:45)

Demo tools are under **Menu** (top right) > **Demo tools**, or hold the player chip for 2 s.

1. Reset and seed (LEAD/backend do this at 4:45): the map is reset and seeded with rivals: Sam holds **Happy Cow Creamery & Tea** at strength 7, Maya holds Neighbor Bakehouse at 11, Leo holds Piccino at 7, plus one steal in the feed. Do not press **Reset map** after this.
2. Real data: walk real loops outside so the map holds real blocks.
3. If Sam's phone is a real phone, join it as "Sam" too, or just show the seeded Sam on the big screen and Ranking.
4. Flags: set one on both demo phones. W's flag appears in Sam's banner and on the big screen, so make it worth reading aloud.
5. Big screen: projector laptop, `cd screen && npm run dev`, browser full screen.
6. Landing page in a second tab: `npx serve web -l 4000`, then http://localhost:4000, scrolled to the top.
7. Check **Replay last walk** works indoors on P's phone. It is the backup if the live walk is late.
8. Keep Lasso open and the phones unlocked. Do not reload the app outside.

## The two minutes

| Time | On screen | Say |
|---|---|---|
| 0:00 | Big screen: the live map of the blocks around YC | "Most people know they should walk more, and don't. Lasso turns your neighbourhood into a game against your neighbours." |
| 0:20 | P's phone: Home with the target card | "This is my target: a free boba tea at Happy Cow, 200 metres away. Sam holds it with a 7-block loop. I need 8." |
| 0:35 | W, outside, closes a real loop; blocks change colour on the big screen | "My teammate is outside right now. That loop just closed, and those blocks changed hands, on every phone and this screen, in under a second." If the walk is late: P presses **Replay last walk**. |
| 1:05 | Sam's phone: the red banner with the taker's flag in quotes | "Sam just found out, and he got my flag with it. The app tells him exactly how big a loop takes it back. That is why he opens it tomorrow." |
| 1:15 | Result "+N points", then Menu > **Exchange**: exchange an offer, the voucher lands in **Wallet** | "Every walk earns points, and points buy real vouchers from the shops on your map." |
| 1:25 | Menu > Demo tools, **End the week**, then Shops: the reward code, then **Redeem** | "At the end of the week, whoever held the shop longest wins. The redeem button only works at the counter." |
| 1:40 | The fee line, then the Whop invoice | "And this is the business. The shop just got a one-dollar invoice through Whop. It pays only when a real customer is standing in front of it." |
| 1:55 | Back to the big-screen map | "A reason to walk today, paid for by the café that wants you to walk past." |

## Say plainly on stage

- Blocks fade: each loses 1 strength an hour unless you walk it again (1 per day in a real neighbourhood). So no single athlete owns the map, and you come back daily. Strengths you see on screen are live, so read the "Enclose N" number off the phone rather than from this script.

- Today's blocks are demo-sized (about 50 m). Real neighbourhoods use bigger blocks: about a kilometre of walking takes a shop.
- The shops are real places near YC; the rewards are samples we made up.
- Built today with Convex (the whole backend), Capy (cloud agents that built the big screen and ran our Revyl tests), Revyl (a cloud iPhone running our smoke tests) and Whop (the shop's fee, in sandbox).

## If something breaks

| Problem | Do this |
|---|---|
| The live walk does not close | **Replay last walk** on P's phone |
| No GPS indoors | The app uses the venue position; use **Fake loop: large** around Happy Cow |
| The Whop invoice does not issue | Show the fee line as it is ("owes $1.00" / "invoiced $1.00") and say it is a sandbox |
| The big screen freezes | Reload the browser tab |
