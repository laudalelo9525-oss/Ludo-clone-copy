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

What the client has today: board geometry, the wire protocol, a matchmaking
REST client, and a **working live match** — it joins a room, renders every
pawn from synced state, shows whose turn it is, and sends roll/move requests
(Issue 3.3). What it does not have: dice and pawn animation, automatic
reconnection, a lobby, and offline play.

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
| Client | Vite + TypeScript; joins a live match, renders pawns from synced state, sends roll/move — 29 tests |
| Authoritative server | `ludo` room, server-side dice and validation, AFK bot takeover, matchmaking tickets — 76 tests |
| Rule-drift protection | `shared/board-constants.json`, asserted by both suites |

CI runs three jobs on every push: backend (lint/format/test/e2e/build), client
(format/test/build), and Docker (compose validation + image build).

## Seen working in a real browser

Rendered at phone size (390x844) in Chromium with two players in one match:
both seated, all eight pawns drawn in their yards, "Your turn" with Roll
enabled, and rolling passed the turn to the other player. No console errors.

Playwright is **not** a dependency — it was installed for that check and
removed again, to keep `npm ci` light on a phone. To repeat it: install
`playwright`, launch with
`executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'`, and
point two pages at the preview server.

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
5. **Polish the match loop.** Issue 3.3 is done — a match is playable end to
   end from the browser. The next increments, in order of payoff: pawn move
   animation and a dice roll animation (Issues 2.1/2.3), tapping a pawn on the
   board instead of the numbered buttons, automatic reconnection using the
   room's reconnection token (the client currently asks the player to reload),
   and a lobby with mode selection wired to the matchmaking ticket endpoint.

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
