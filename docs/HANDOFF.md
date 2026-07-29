# Handoff — where LudoVerse stands

Living status note for picking work back up. `docs/MILESTONES.md` is the
checklist; this is the context around it.

**Branch:** `claude/code-quality-readme-alignment-v5ffqu` (not merged into
`Code` yet). Every commit is green in CI.

---

## Client platform — decided

**Unity is out.** Its Editor only runs on x86_64 desktop, and the only
available development machine is an Android phone. The client is now a
**TypeScript web app** (Vite): written and previewed on the phone, verified in
CI, and wrappable to an Android APK with Capacitor.

Removed with it: the C# rules engine, the C# AI opponent, `tests/RulesEngine`
and the `rules-engine` CI job. All recoverable from git history (the engine and
AI are at commit `f83d491`). The upside is that the rules now exist **once**,
on the server, so there is no client/server drift to police.

What the client has today: board geometry mapped to a 15x15 grid, the wire
protocol mirrored from the server, a matchmaking REST client, and a rendered
board. What it does not have: joining a live match (Issue 3.3), the turn UI,
dice and pawn animation, and the lobby.

---

## Colyseus version pairing — do not "upgrade" this

The server is pinned to **Colyseus 0.16** deliberately. The published browser
SDK (`colyseus.js`, latest 0.16.x) depends on `@colyseus/schema ^3`, and **no
0.17 client exists**. Running the 0.17 server made the client fail at join:
0.17 returns a flat seat reservation where the 0.16 client expects a nested
`room` object, and schema 4 state would not decode either.

Verified working end to end after the downgrade: two `colyseus.js` clients
joined the same room, the match started, the state decoded (seats, names,
pawns, `connected`, `afk`), and a `ROLL_DICE` round-trip returned the expected
payload.

Bumping `@colyseus/core` to 0.17 again breaks every client until a 0.17
`colyseus.js` ships.

## What is done and verified

| Area | State |
| ---- | ----- |
| Backend foundation | NestJS gateway (`:3000`) + Colyseus (`:2567`), config, `/health`, Docker image, CI |
| Client | Vite + TypeScript, board geometry and protocol contract — 22 tests |
| Authoritative server | `ludo` room, server-side dice and validation, AFK bot takeover, matchmaking tickets — 76 tests |
| Rule-drift protection | `shared/board-constants.json`, asserted by both suites |

CI runs three jobs on every push: backend (lint/format/test/e2e/build), client
(format/test/build), and Docker (compose validation + image build).

## How to verify locally

```bash
cd server && npm ci && npm test && npm run test:e2e   # 76 + 1
cd client && npm ci && npm test && npm run build      # 22
scripts/dev-stack.sh          # Postgres + Redis + backend in watch mode
cd client && npm run dev      # then open the printed URL on the phone
```

---

## Next up, in the order I would take them

1. **Issue 3.1 — Firebase Auth.** *Blocked on you.* Session ids are currently
   trusted as identity, which is fine locally and unacceptable in public. Needs
   a Firebase project, and a decision: anonymous auth for guests, or real
   accounts only?
2. **Issue 5.1 — persistence.** Nothing is stored; a finished match evaporates.
   `database/schema.sql` already has the tables. Pure server work, testable in
   CI. This is the largest gap after auth.
3. **Private rooms and invite codes.** The remainder of Issue 3.5 — quick match
   works, invite flows do not.
4. **Issue 4.1 — LiveKit token generation.** Server-side and self-contained;
   needs LiveKit credentials eventually, but the token endpoint can be built
   and tested against fixtures first.
5. **Issue 3.3 — join a live match from the client.** *Now unblocked.* The
   protocol types, the matchmaking client and a proven-compatible SDK are all
   in place; what is missing is a `LudoClient` that consumes the seat
   reservation, subscribes to state, and drives the board render, plus a roll
   button and pawn placement from live state. Start here — the interop probe
   in the commit message for the 0.16 downgrade shows the exact calls that
   work.

## Known gaps worth remembering

- **No persistence anywhere.** Matches, users and inventory exist only in
  memory.
- **No auth.** Any client can claim any session id.
- **Blocking rule not implemented** (two pawns barring a cell) — deliberate,
  documented as a Custom Rules option in both engines.
- **The rules exist once**, on the server. The client asks and renders; it
  never decides. `shared/board-constants.json` still pins board geometry for
  both, and `client/src/net/protocol.test.ts` reads the server's message names
  so a rename on either side fails the build.
- **No offline play in the client** — Issue 6.1 needs redoing in TypeScript.
- **`server/` is the only backend folder.** The blueprint lists both `server/`
  and `backend/`; see `docs/STRUCTURE.md` for why they were merged.
- Dev-only npm audit warnings remain in build tooling (jest/eslint chains);
  the production dependency surface is clean.
