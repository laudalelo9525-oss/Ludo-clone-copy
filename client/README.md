# LudoVerse Client

TypeScript web client. Runs in a browser, and wraps to an Android APK with
Capacitor when you want a store build.

**Why not Unity:** the Unity Editor only runs on x86_64 desktop (Windows,
macOS, Linux) — there is no Android build of it. This project is developed from
an Android device, so the client is a web app: it is written, run and previewed
entirely on the phone, and CI verifies every change. See `docs/HANDOFF.md`.

## Getting started

```bash
npm ci
npm run dev      # --host, so you can open it from the phone's browser
```

Then open the printed URL. With the backend running (`scripts/dev-stack.sh`),
the defaults already point at it.

| Command | Purpose |
| ------- | ------- |
| `npm run dev` | Vite dev server with hot reload |
| `npm test` | Vitest |
| `npm run build` | Type-check and bundle to `dist/` |
| `npm run preview` | Serve the production bundle |
| `npm run format` | Prettier (config at the repo root) |

## Layout

```
src/
  config.ts              Endpoints, overridable via VITE_ env vars
  game/board-geometry.ts Rule position -> cell on the 15x15 grid
  net/protocol.ts        Wire contract, mirroring the server's messages
  net/matchmaking.ts     REST client for the matchmaking endpoints
  main.ts                App shell; renders the board
```

**The rules are not here.** The server owns them
(`server/src/game/rules/`) and validates every move — the client asks, it never
decides. This avoids the duplicate rules implementation the Unity client would
have needed, and it means a modified client gains nothing.

Two tests keep the client honest against the server:
`board-geometry.test.ts` asserts the grid matches
`shared/board-constants.json`, and `protocol.test.ts` reads the server's
message names so a rename on either side fails the build.

## Android

The bundle is built with a relative `base`, so it works from a Capacitor
`file://` bundle as well as from a web host. Adding Capacitor later:

```bash
npm i -D @capacitor/cli && npx cap init && npx cap add android
npm run build && npx cap sync
```

Building the APK needs a JDK and the Android SDK, both available in Termux.

## Not done yet

Joining a room and syncing a live match (Issue 3.3), the turn UI, dice and pawn
animation (Issues 2.1 and 2.3), and the lobby. What exists is the geometry, the
protocol contract, and a board that renders.
