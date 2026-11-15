# YC Consumer Mobile Hackathon (Sunday 15 November 2026, YC San Francisco)

Sources: https://consumermobilehackathon.com/ (guides, submit, schedule, prizes, help) and
https://events.ycombinator.com/ConsumerMobileHack. Read on 15 Nov at 11:09 AM Pacific.

## Hard rules (from the event pages)
- Build an iOS or Android **consumer** app that someone would want to open again tomorrow. It must run on a device for a live demo; no App Store release is needed.
- **All code is written after 10:00 AM Pacific on 15 Nov.** Start from scratch: no code copied from older projects.
- **Must use Capy, Revyl and Convex.** Projects without all three are not eligible for prizes.
- Teams of up to 3. **Submissions are due at 6:00 PM Pacific**; instructions are on https://consumermobilehackathon.com/submit (live from 10:00 AM).
- Schedule: 6:30 PM dinner, 7:00 PM finalist demos, 8:00 PM winners. Tracks with their own prizes were announced at kickoff; ask the owner which track, if any.
- Prizes: 1st a YC interview + iPhone 18 Pro each, 2nd MacBook Neo each, 3rd Apple Watch each.
- Help: Discord discord.gg/RfTHVTVFX (#capy, #revyl, #convex, #general).

## Stack (as the guides prescribe)
- **Expo + Expo Router + TypeScript** at the repo root.
- **Convex** backend in `convex/` (schema, queries, mutations, Convex Auth if accounts are needed). Follow https://www.convex.dev/agent-setup.md. `EXPO_PUBLIC_CONVEX_URL` lives in `.env.local` (git-ignored), so cloud builds must get it set explicitly.
- **Capy** (capy.ai) works on the GitHub repo through threads that open pull requests; its env var `CONVEX_DEPLOY_KEY` is set in the Capy project. Use Capy for real tasks, at the least: the Revyl build, the cloud-iPhone install and one device check. Also turn on "Revyl proof of changes" on pull requests. Optional: the Convex hackathon skill (`hackathon.md` build log).
- **Revyl** runs the app on cloud iOS/Android phones and checks it from plain-English steps. The easiest path is through Capy ("Build the iOS app in this repo on Revyl as a standalone simulator build with the JavaScript bundled and EXPO_PUBLIC_CONVEX_URL set. Install it on a cloud iPhone, add one item and screenshot the result."). The CLI path is `revyl auth login`, `revyl init`, `revyl build`, `revyl device start`, `revyl device validation`.
- Optional sponsors: Whop (payments), Supermemory (memory for AI features), Keiki (app over text), OpenAI ($100 credits).

## Team
- **HACK-LEAD**: plans, owns `.team/`, README, the demo script and the submission. Is the only one who runs git (branches, commits, push, merging Capy's PRs). Drives Capy and Revyl.
- **HACK-BACKEND**: owns `convex/` (schema, functions, auth, seed data).
- **HACK-FRONTEND**: owns the Expo app (`app/` or `src/app/`, `components/`, `assets/`, styling).
- Tasks are in `.team/inbox-<role>.md`, reports go in `.team/reports.md` (append only), and the plan is `.team/PLAN.md`.
- Workers never run git. They edit only the files they own and send LEAD a message after each report.
- Accounts, sign-ins, API keys and payments are done by the owner. Never type or print secrets.

## Machine
Windows 11, 8 GB RAM, Git Bash + PowerShell. One heavy job at a time (npm install, builds). No iOS simulator on Windows: devices come from Revyl cloud phones, or Expo Go on the owner's phone.

## gstack
`D:\Projects\CLAUDE.md` applies: gstack is required, and /browse is used for web pages.
