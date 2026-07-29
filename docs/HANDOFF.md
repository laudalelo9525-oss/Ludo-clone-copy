# Handoff — where LudoVerse stands

Living status note for picking work back up. `docs/MILESTONES.md` is the
checklist; this is the context around it.

**Branch:** `claude/code-quality-readme-alignment-v5ffqu` (not merged into
`Code` yet). Every commit is green in CI.

---

## OPEN DECISION — the client platform

**The blueprint assumes Unity, but the only available development machine is an
Android phone, and the Unity Editor does not run on Android** (Windows, macOS
and Linux x86_64 only; no ARM build, no cloud editor). So the Unity client has
never been opened, and cannot be from the current setup.

Three viable paths, awaiting a decision:

| Path | Authoring on Android | CI verification |
| ---- | -------------------- | --------------- |
| **TypeScript web client** (recommended) | Yes — code in Termux, preview in a browser | Full |
| **Godot** | Yes — Godot ships an Android editor (ARM64) | Partial (headless export) |
| **Unity, code-first in CI** | No visual editing at all | Licence + slow builds |

The web client is recommended because the server is already TypeScript and
Colyseus' first-party SDK (`colyseus.js`) is too, so the client can share
`shared/` types with the server rather than adding a third rules
implementation. It also targets Web, Android (via Capacitor) and desktop from
one codebase, which is what the blueprint's platform list asks for.

**Nothing has been deleted yet.** If Unity is dropped, the affected code is:

- `client/` — Unity skeleton (ProjectSettings, Packages, asmdefs, Editor
  scripts, `GameBootstrap`, `ServerEndpoints`).
- `client/Assets/Scripts/Gameplay/` — the C# rules engine and AI opponent
  (~1,500 lines, 51 tests). These are engine-agnostic but would have no
  consumer without a C#/Unity client; the server's TypeScript engine is the
  authoritative one and is complete.
- `tests/RulesEngine/` and the `rules-engine` CI job, which exist to test that
  C# code.
- The C# half of the `shared/board-constants.json` contract.

All of it stays recoverable in git history. The server is unaffected either
way — it has its own complete rules implementation.

---

## What is done and verified

| Area | State |
| ---- | ----- |
| Backend foundation | NestJS gateway (`:3000`) + Colyseus (`:2567`), config, `/health`, Docker image, CI |
| Offline rules engine (C#) | Board, moves, turn machine, captures, undo — 51 tests. *Fate depends on the client decision above.* |
| Offline AI | Easy/Medium/Hard, measured ladder — see `MILESTONES.md`. *Same.* |
| Authoritative server | `ludo` room, server-side dice and validation, AFK bot takeover, matchmaking tickets — 76 tests |
| Rule-drift protection | `shared/board-constants.json`, asserted by both suites |

CI runs four jobs on every push: backend (lint/format/test/e2e/build), rules
engine (`dotnet test`), Docker image build, and compose validation. The Unity
build job stays commented out until the project is opened and licence secrets
exist.

## How to verify locally

```bash
cd server && npm ci && npm test && npm run test:e2e   # 76 + 1
dotnet test tests/RulesEngine/LudoVerse.Rules.Tests.csproj   # 51
scripts/dev-stack.sh          # Postgres + Redis + backend in watch mode
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
5. **Client work** (2.1, 2.3 visuals, 3.3) — gated on the platform decision above.

## Known gaps worth remembering

- **No persistence anywhere.** Matches, users and inventory exist only in
  memory.
- **No auth.** Any client can claim any session id.
- **Blocking rule not implemented** (two pawns barring a cell) — deliberate,
  documented as a Custom Rules option in both engines.
- **The Ludo rules exist twice**, C# and TypeScript, because the client is
  Unity and the server is Node. `shared/board-constants.json` plus the two
  contract tests are what keep them honest — verified by breaking a constant
  and watching both suites fail. Any rule change must land on both sides.
- **`server/` is the only backend folder.** The blueprint lists both `server/`
  and `backend/`; see `docs/STRUCTURE.md` for why they were merged.
- Dev-only npm audit warnings remain in build tooling (jest/eslint chains);
  the production dependency surface is clean.
