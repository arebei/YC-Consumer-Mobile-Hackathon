# Submission fields (copy and paste)

Where: https://vibeapps.dev/judging/consumer-mobile-hackathon/submit (sign in first).
Due 6:30 PM Pacific per the submit page; our target is **5:30 PM**.
Required: tag **Consumer Mobile Hackathon**, a **demo video**, a **public GitHub repo**, and Capy + Revyl + Convex all used.

**Name:** Lasso

**Tag / category:** Consumer Mobile Hackathon

**Tagline (one line):** Walk a loop. Own the blocks inside it.

**Short description:**
Lasso is a walking game for your neighbourhood. Walk a closed loop to claim every map block inside it. Neighbours steal blocks back with bigger loops, and a red banner tells you who took them, with their taunt, and exactly how big a loop wins them back. Local shops put up the prizes: hold a shop's block the longest this week and you win its reward, redeemed in person, while the shop pays a small fee through Whop.

**Who it's for / why they'd open it tomorrow:**
For people who find exercise boring. You open it tomorrow because someone took your blocks overnight, the week's prize is still in play, and the map is live: every capture shows on every phone in under a second.

**GitHub (public):** https://github.com/azizjonrahimov/YC-Consumer-Mobile-Hackathon

**Demo video:** <link to the recorded video: owner records it; see DEMO.md>

**How we used the sponsor tools:**
- **Convex:** the whole backend: database, all game rules, live updates to every phone and the big screen, and scheduled functions that call Whop. Capture is one transaction, so a block can never have two owners. H3 hexagon grid runs inside Convex functions. 34 tests.
- **Capy:** cloud agents driven through the Capy API. PR #1 built the big-screen live map (`screen/`); a second thread built the iOS app on Revyl, ran our smoke tests, and opened PR #2 to turn on Revyl proof of changes.
- **Revyl:** the app built for iOS and run on a cloud iPhone 16 with three plain-English smoke tests (capture, steal, reward). Capture report: https://app.revyl.ai/tests/report?token=2903123c-f791-45a8-9e96-37b03be6db72
- **Whop (sponsor):** redeeming a reward creates a $1.00 invoice for the shop in Whop's sandbox and follows it until paid.

**Build log with evidence:** https://github.com/azizjonrahimov/YC-Consumer-Mobile-Hackathon/blob/main/hackathon.md

**Team:** <names of up to 3 teammates>

**Platform:** iOS and Android (Expo); demoed on iPhone with Expo Go and a Revyl cloud iPhone.
