# LudoVerse - Milestones & Issue Breakdown

This document outlines the project milestones and granular issues to be tracked in GitHub Projects. Claude Code (as the Senior Engineer) will implement these issues sequentially.

---

## 🟢 Phase 1: Foundation (Architect/Scaffolder)
**Objective:** Repository setup, architecture, CI/CD, and basic skeletons.
- [x] **Issue 1.1**: Initialize repository structure and `.gitignore`.
- [x] **Issue 1.2**: Generate Architecture Documents (SRS, SDD, API Contracts).
- [x] **Issue 1.3**: Set up local DevOps (Docker Compose, GitHub Actions).
- [x] **Issue 1.4**: Scaffold NestJS + Colyseus Backend.
- [x] **Issue 1.5**: Initialize Unity 6 Client skeleton and asset structure.
      Project skeleton, package manifest, assembly layout, bootstrap scripts and
      editor tooling are committed. Unity itself must be opened once to generate
      `.meta` files, the scenes and the remaining `ProjectSettings/` assets — see
      `client/README.md`.

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
**Objective:** Implement the offline board logic and rules engine in Unity.
- [ ] **Issue 2.1**: Implement the Ludo Board UI and grid system (Unity).
- [x] **Issue 2.2**: Create the Pawn movement logic and pathfinding.
- [ ] **Issue 2.3**: Implement the Dice RNG and physics animation. *(RNG done —
      `SeededDiceRoller`; the physics animation is scene work.)*
- [x] **Issue 2.4**: Build the turn-based state machine (Turn -> Roll -> Move -> Check Win).
- [x] **Issue 2.5**: Add game rules (Safe zones, capturing pawns, winning).
- [x] **Issue 2.6**: Implement offline Undo feature.

### Rules engine notes
The engine lives in `client/Assets/Scripts/Gameplay/` and holds **no UnityEngine
references** (enforced by `noEngineReferences` on its asmdef). That serves
offline play in the Unity client and the Phase 6 AI opponent from one
implementation, and lets it be tested without an Editor.

It is **not** the authoritative implementation for online play: the game server
is TypeScript, so Issue 3.4 needs these rules mirrored there. Keeping two
implementations honest is the job of `shared/` (board constants and rule
parameters) plus contract tests in `tests/`; that mirroring is tracked as part
of Issue 3.4 and is not done yet.

Because it is engine-agnostic, CI verifies it with `dotnet test` — no Unity
licence needed — while the same test files also run in the Editor's Test Runner.
See `tests/README.md`.

Classic rules covered: leaving the yard on a six, exact roll to reach home,
capture on unprotected cells, the eight safe cells, extra turn on a six or a
capture or reaching home, three sixes forfeiting the turn, and win detection.
Blocking (two pawns barring a cell) is left to Custom Rules and is not
implemented.

Still open in this phase: the board and pawn visuals, dice physics and
animations, and wiring the engine to the scenes — all of which need the Unity
Editor (see Issue 1.5).

---

## 🟠 Phase 3: Online Multiplayer (Claude Code)
**Objective:** Real-time multiplayer synchronization using Colyseus.
- [ ] **Issue 3.1**: Integrate Firebase Auth in Unity and NestJS.
- [x] **Issue 3.2**: Create Colyseus `LudoRoom` state schema on the backend.
- [ ] **Issue 3.3**: Implement client-side Colyseus connection and state sync.
- [x] **Issue 3.4**: Move dice RNG and move validation to the authoritative server.
- [x] **Issue 3.5**: Build the matchmaking queue and room creation API.
      *(Quick match done; private rooms and invite codes still open.)*
- [ ] **Issue 3.6**: Implement network reconnection and state recovery logic.
      *(Server half done: a dropped player's seat is held for 60s and the state
      resyncs on return. The client half needs Issue 3.3.)*

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

Because the server is TypeScript and the offline engine is C#, the rules exist
twice. Both are pinned to `shared/board-constants.json`, and both test suites
fail if either drifts — verified by deliberately changing a constant and
watching each suite go red.

Rules parity with the offline engine is covered by mirrored test suites. What
the server does **not** have yet: persistence, auth (Issue 3.1), matchmaking
beyond `joinOrCreate` (Issue 3.5), and turn timers.

---

## 🔵 Phase 4: Voice & Video (Claude Code)
**Objective:** Integrate LiveKit for real-time media.
- [ ] **Issue 4.1**: Set up LiveKit Server integration on NestJS (Token generation).
- [ ] **Issue 4.2**: Integrate LiveKit Unity SDK.
- [ ] **Issue 4.3**: Implement Voice Chat (Push-to-talk, muting, noise suppression).
- [ ] **Issue 4.4**: Implement Video Chat (Picture-in-Picture, Camera toggles).

---

## 🟣 Phase 5: Social Systems & DB (Claude Code)
**Objective:** Friends, profiles, and leaderboards.
- [ ] **Issue 5.1**: Implement PostgreSQL Prisma/TypeORM models in NestJS.
- [ ] **Issue 5.2**: Build Friends system (Add, Accept, Remove) and Presence via Redis.
- [ ] **Issue 5.3**: Create Global and Friends Leaderboard APIs.
- [ ] **Issue 5.4**: Implement Player Profiles and Match History UI in Unity.
- [ ] **Issue 5.5**: Add in-game Text Chat and Emotes.

---

## 🔴 Phase 6: Monetization & AI (Claude Code)
**Objective:** Shop, passes, and bot logic.
- [x] **Issue 6.1**: Implement Offline AI opponent (Easy/Medium/Hard).

### AI opponent notes
Lives in `client/Assets/Scripts/Gameplay/AI/`, on top of the rules engine and
under the same no-UnityEngine rule, so CI tests it without an Editor.

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
- [ ] **Issue 7.1**: DOTween UI Polish and Kawase Blur implementations.
- [ ] **Issue 7.2**: Implement FMOD/Unity Audio Manager and SFX.
- [ ] **Issue 7.3**: Memory profiling, Object Pooling, and 120 FPS optimization.
- [ ] **Issue 7.4**: Final deployment to production infrastructure.
