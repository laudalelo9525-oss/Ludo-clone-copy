# LudoVerse - Milestones & Issue Breakdown

This document outlines the project milestones and granular issues to be tracked in GitHub Projects. Claude Code (as the Senior Engineer) will implement these issues sequentially.

---

## 🟢 Phase 1: Foundation (Architect/Scaffolder)
**Objective:** Repository setup, architecture, CI/CD, and basic skeletons.
- [x] **Issue 1.1**: Initialize repository structure and `.gitignore`.
- [x] **Issue 1.2**: Generate Architecture Documents (SRS, SDD, API Contracts).
- [x] **Issue 1.3**: Set up local DevOps (Docker Compose, GitHub Actions).
- [x] **Issue 1.4**: Scaffold NestJS + Colyseus Backend.
- [x] **Issue 1.5**: Initialize the client skeleton and asset structure.
      **Unity was dropped** — its Editor does not run on Android, the only
      available development machine. Replaced by a TypeScript web client
      (Vite), which is written and previewed on the phone, verified in CI, and
      wraps to an Android APK via Capacitor. See `client/README.md`.

### Phase 1 hardening pass (Claude Code review of the scaffold)
The scaffold was reviewed against the blueprint in `README.md` and brought up to
production standard:
- Colyseus is now actually bootstrapped (Issue 1.4 previously shipped the
  dependencies only) with a managed lifecycle on its own port.
- The generated NestJS starter boilerplate was replaced by a configuration
  module, a `/health` endpoint, and tests covering both.
- CI now installs, formats, lints, tests, builds, and validates the Docker
  stack, instead of running an empty job.
- `docker-compose.yml` runs the backend image via `docker/Dockerfile`, with
  healthchecks and environment-driven credentials.
- Blueprint folders (`shared/`, `design/`, `scripts/`, `assets/`, `tests/`) now
  exist; see `docs/STRUCTURE.md` for the blueprint-to-repository mapping.

---

## 🟡 Phase 2: Core Gameplay (Claude Code)
**Objective:** Implement the board logic, rules engine and board UI.
- [ ] **Issue 2.1**: Implement the Ludo Board UI and grid system (client).
      *(Grid geometry done in `client/src/game/board-geometry.ts`; the playable
      board UI is not.)*
- [x] **Issue 2.2**: Create the Pawn movement logic and pathfinding.
- [ ] **Issue 2.3**: Implement the Dice RNG and animation. *(RNG done and
      authoritative — `SecureDiceRoller` on the server; the animation is
      client work.)*
- [x] **Issue 2.4**: Build the turn-based state machine (Turn -> Roll -> Move -> Check Win).
- [x] **Issue 2.5**: Add game rules (Safe zones, capturing pawns, winning).
- [x] **Issue 2.6**: Implement offline Undo feature.

### Rules engine notes
The rules live **only on the server** (`server/src/game/rules/`), which
validates every move. When Unity was dropped, the parallel C# engine and its AI
went with it: a TypeScript client shares the server's implementation rather than
duplicating it, which removes the client/server drift risk entirely. That code
remains in git history if it is ever wanted for a .NET client.

`shared/board-constants.json` is still the source of truth for board geometry;
the server asserts against it, and so does the client's rendering grid.

Classic rules covered: leaving the yard on a six, exact roll to reach home,
capture on unprotected cells, the eight safe cells, extra turn on a six or a
capture or reaching home, three sixes forfeiting the turn, and win detection.
Blocking (two pawns barring a cell) is left to Custom Rules and is not
implemented.

Still open in this phase: the board and pawn visuals, dice animation, and
wiring the client to a live match. The client now renders the board grid; see
`client/README.md`.

---

## 🟠 Phase 3: Online Multiplayer (Claude Code)
**Objective:** Real-time multiplayer synchronization using Colyseus.
- [ ] **Issue 3.1**: Integrate Firebase Auth in the client and NestJS.
- [x] **Issue 3.2**: Create Colyseus `LudoRoom` state schema on the backend.
- [x] **Issue 3.3**: Implement client-side Colyseus connection and state sync.
      *(Joins, syncs, renders pawns from live state, and sends roll/move. Dice
      and pawn animation are Issue 2.3/2.1.)*
- [x] **Issue 3.4**: Move dice RNG and move validation to the authoritative server.
- [x] **Issue 3.5**: Build the matchmaking queue and room creation API.
      *(Quick match done; private rooms and invite codes still open.)*
- [ ] **Issue 3.6**: Implement network reconnection and state recovery logic.
      *(Server holds a dropped seat for 60s and the client is told it dropped;
      what is missing is the client automatically re-joining with its
      reconnection token instead of asking the player to reload.)*

### Matchmaking notes
`POST /matchmaking/ticket` validates the mode and seat count, reserves a seat
through the Colyseus matchmaker, and returns the reservation the client SDK
consumes; `GET /matchmaking/status/:ticketId` looks it up again. Tickets expire
after five minutes.

Colyseus already solves finding-or-creating a room with a free seat (across
processes once Redis presence is configured), so the gateway owns the ticket
lifecycle rather than reimplementing matchmaking. The ticket indirection is
what lets skill buckets, party grouping or backfill arrive later without
changing the client contract.

Not done: private rooms and invite codes, and any notion of rating.

### Authoritative server notes
The room is registered as `ludo`; clients reach it with
`joinOrCreate("ludo")` on the Colyseus port.

The server owns every rule decision. Dice come from `SecureDiceRoller`, which
uses the crypto RNG rather than `Math.random` — the latter's stream is
reconstructable from observed output, which would let a client predict rolls.
Client messages carry no state: `MOVE_PAWN` names a pawn index and nothing
else, and anything out of turn, out of phase, or not in the server's legal move
list is answered with `ON_REJECTED` while the board stays untouched.

The rules exist once, here. The client renders and asks; it never decides, so
there is no second implementation to drift. `shared/board-constants.json`
remains the source of truth for board geometry, asserted by the server's tests
and by the client's grid tests.

What the server does **not** have yet: persistence and auth (Issue 3.1).

---

## 🔵 Phase 4: Voice & Video (Claude Code)
**Objective:** Integrate LiveKit for real-time media.
- [ ] **Issue 4.1**: Set up LiveKit Server integration on NestJS (Token generation).
- [ ] **Issue 4.2**: Integrate the LiveKit web SDK in the client.
- [ ] **Issue 4.3**: Implement Voice Chat (Push-to-talk, muting, noise suppression).
- [ ] **Issue 4.4**: Implement Video Chat (Picture-in-Picture, Camera toggles).

---

## 🟣 Phase 5: Social Systems & DB (Claude Code)
**Objective:** Friends, profiles, and leaderboards.
- [ ] **Issue 5.1**: Implement PostgreSQL Prisma/TypeORM models in NestJS.
- [ ] **Issue 5.2**: Build Friends system (Add, Accept, Remove) and Presence via Redis.
- [ ] **Issue 5.3**: Create Global and Friends Leaderboard APIs.
- [ ] **Issue 5.4**: Implement Player Profiles and Match History UI in the client.
- [ ] **Issue 5.5**: Add in-game Text Chat and Emotes.

---

## 🔴 Phase 6: Monetization & AI (Claude Code)
**Objective:** Shop, passes, and bot logic.
- [ ] **Issue 6.1**: Implement Offline AI opponent (Easy/Medium/Hard).
      *(Was done in C#; removed with Unity. Needs redoing in TypeScript — the
      server's `bot.ts` is a working starting point.)*

### AI opponent notes
**The offline C# AI was removed with Unity.** The surviving implementation is
the server's auto-play bot (`server/src/game/rules/bot.ts`, Issue 6.2), which
mirrors the same considerations. An offline opponent for the web client is
still to be written, in TypeScript, on top of the server's rules module.

The original C# opponent, and the measured difficulty ladder below, are in git
history (commit `f83d491`).

Difficulty is expressed as *what an opponent is blind to*, not as search depth:

| Level  | Behaviour |
| ------ | --------- |
| Easy   | Picks a legal move at random (seeded, so replays are reproducible) |
| Medium | Chases captures, home and progress; ignores danger entirely |
| Hard   | Also counts threats: avoids landing in front of opponents and moves hunted pawns |

Measured over two independent runs of 400 seeded matches each:

| Match-up       | Win rate for the stronger side |
| -------------- | ------------------------------ |
| Hard vs Easy   | 91–94% |
| Medium vs Easy | 85–91% |
| Hard vs Medium | 53–59% |
| Easy vs Easy   | ~50% (control) |

Hard's edge over Medium is genuine but thin, because the evaluation is one ply
and Ludo is dice-driven. Widening that gap is what **Expert** should be — a
lookahead search — and Expert plus Adaptive AI (both named in the blueprint)
remain unimplemented. `ILudoAi` is also the seam for the AFK auto-play takeover
in Issue 6.2.
- [x] **Issue 6.2**: Add server-side AFK detection and Auto-Play Bot takeover.

### AFK and auto-play notes
Turns are timed in the room. A player who does not act within the turn timeout
(20s, configurable per room) has that turn played for them, and two consecutive
missed turns flag the seat as away — broadcast as `ON_PLAYER_AFK` and mirrored
in `Player.afk` so the UI can show it. Acting again clears the flag and
broadcasts `ON_PLAYER_RETURNED`.

A seat whose player has dropped is covered immediately rather than after the
full timeout, so one lost connection does not stall everyone else for 20
seconds a turn. Auto-played rolls and moves are broadcast with
`automated: true`, so clients can present them as the bot playing.

This closes the stall risk the room shipped with: before it, a player who
simply stopped sending `ROLL_DICE` froze the match indefinitely.

The server's move picker (`rules/bot.ts`) mirrors the Hard offline opponent's
considerations. It does *not* have to agree with the client the way the rules
do — it only plays for an absent human, so there is no prediction to keep in
sync.
- [ ] **Issue 6.3**: Build the In-Game Store UI (Skins, Dice, Frames).
- [ ] **Issue 6.4**: Integrate Payment gateway / Virtual Economy APIs.

---

## ⚫ Phase 7: Quality & Release
**Objective:** Polish, testing, and deployment.
- [ ] **Issue 7.1**: UI motion polish and blurred-glass surfaces.
- [ ] **Issue 7.2**: Implement an audio manager and SFX (Web Audio).
- [ ] **Issue 7.3**: Memory profiling, Object Pooling, and 120 FPS optimization.
- [ ] **Issue 7.4**: Final deployment to production infrastructure.
