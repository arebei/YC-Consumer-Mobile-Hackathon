# Submission fields (copy and paste)

Where: https://vibeapps.dev/judging/consumer-mobile-hackathon/submit (sign in first).
Due 6:30 PM Pacific per the submit page; our target is **5:30 PM**.
Required: tag **Consumer Mobile Hackathon**, a **demo video**, a **public GitHub repo**, and Capy + Revyl + Convex all used.

**Name:** Lasso

**Tag / category:** Consumer Mobile Hackathon

**Tagline (one line):** Walk a loop. Own the blocks inside it.

**Short description:**
Lasso is a walking game for your neighbourhood. Walk a closed loop to claim every map block inside it, and earn points to spend on vouchers from the shops on your map. Blocks fade a little every hour unless you walk them again, so no single runner can own the neighbourhood. Neighbours steal blocks back with bigger loops, and a red banner tells you who took them, with their taunt, and exactly how big a loop wins them back. Local shops put up the prizes: hold a shop's block the longest this week and you win its reward, redeemed in person, while the shop pays a small fee through Whop.

**Who it's for / why they'd open it tomorrow:**
For people who find exercise boring. You open it tomorrow because your blocks are fading and someone took a few overnight, the week's prize is still in play, and the map is live: every capture shows on every phone in under a second.

**GitHub (public):** https://github.com/azizjonrahimov/YC-Consumer-Mobile-Hackathon

**Demo video:** <link to the recorded video: owner records it; see DEMO.md>

**How we used the sponsor tools:**
- **Convex:** the whole backend: database, all game rules, live updates to every phone and the big screen, and scheduled functions that call Whop. Capture is one transaction, so a block can never have two owners. H3 hexagon grid runs inside Convex functions. Points economy (earn by walking, exchange for shop vouchers), top-50 rankings. 41 tests.
- **Capy:** cloud agents driven through the Capy API. four threads, four merged PRs: #1 the big-screen live map (`screen/`), #2 Revyl proof of changes on every PR (after building the iOS app on Revyl and running our smoke tests), #3 the public website, #4 a playable browser version with a Leaflet map.
- **Revyl:** the app built for iOS and run on a cloud iPhone 16 with three plain-English smoke tests (capture, steal, reward). Latest capture run on the final build (8/8, 2m45s): https://app.revyl.ai/tests/report?token=eab3138e-98f1-43ed-b08f-77f5c7969bff
- **Whop (sponsor):** redeeming a reward creates a $1.00 invoice for the shop in Whop's sandbox and follows it until paid.

**Build log with evidence:** https://github.com/azizjonrahimov/YC-Consumer-Mobile-Hackathon/blob/main/hackathon.md

**Team:** <names of up to 3 teammates>

**Platform:** iOS and Android (Expo); demoed on iPhone with Expo Go and a Revyl cloud iPhone.
