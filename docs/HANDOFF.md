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

## Verified in a browser

**Solo vs AI**: one browser picked "vs AI", Medium, four players — seated as
Ada with AI 1/2/3, match started immediately, and after 10 human moves the AI
had 11 pawns out of their yards on their own. No console errors.

**Auto-reconnect**: severing the game socket with an abnormal close (4999) in
one browser produced a **second socket** and the player stayed seated with
controls intact and the match continuing. Socket count is the reliable signal —
`setOffline(true)` does **not** sever an already-open WebSocket, so an earlier
attempt with it proved nothing.

The reconnecting notice is now confirmed too: severing the socket showed
"Connection lost — reconnecting (1/6)…", which cleared on recovery with the
seat kept. The earlier gap was a wiring bug, not a timing artifact — see the
lesson below.

**Lesson worth keeping:** the handlers had never been added to `main.ts`. An
earlier scripted edit anchored on `      onDisconnected:` (6 spaces) after a
refactor had re-indented it to 4, so the replacement silently did nothing —
and because `LudoClient` calls `events.onReconnecting?.()`, the missing handler
failed silently too. When a scripted edit is used, assert the anchor matched
(`assert s.count(old) == 1`) rather than trusting a no-op replace.

## Tap-to-move — verified in a browser

Confirmed on a clean run at phone size: two players seated, eight pawns drawn,
**11 turns offered a movable pawn and all 11 taps moved a piece**, no console
errors. Tapping a pawn on the board is the move input; there are no move
buttons.

Two traps when re-checking this:

1. Playwright's click waits for an element to stop moving, and a movable pawn
   pulses forever — use `click({ force: true })`.
2. Kill old `node dist/main` processes and use fresh ports first. A stale
   server holds a disconnected seat for 60 seconds, which once showed three
   player rows for two clients and looked like a panel bug.

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
5. **Polish the match loop.** Pieces, dice tumble, motion, tap-to-move,
   capture/home/win feedback and sound are all done and verified in a browser.
   Done. The match loop is complete: lobby, matchmaking, solo vs AI, live
   play, feedback, sound, and recovery from a dropped connection.

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
- **Solo play needs a connection.** "vs AI" is a server-side private room, not
  true offline play. Offline would mean shipping the rules to the client again
  and re-opening the drift risk that removing Unity closed.
- **`server/` is the only backend folder.** The blueprint lists both `server/`
  and `backend/`; see `docs/STRUCTURE.md` for why they were merged.
- Dev-only npm audit warnings remain in build tooling (jest/eslint chains);
  the production dependency surface is clean.
