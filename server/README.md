# LudoVerse Server

NestJS REST gateway plus the authoritative Colyseus realtime game server.

## Requirements

- Node.js **>= 22.12** — Colyseus 0.17 pulls in ESM-only dependencies that rely
  on Node's `require(esm)` support.
- Docker (optional) for PostgreSQL and Redis, see `docker/docker-compose.yml`.

## Getting started

```bash
cp .env.example .env
npm ci
npm run start:dev
```

Two listeners come up:

| Port   | Surface                                                     |
| ------ | ----------------------------------------------------------- |
| `3000` | NestJS REST gateway — auth, matchmaking, economy, `/health`  |
| `2567` | Colyseus realtime server — room join and gameplay messages   |

They are separate ports on purpose: the SDD treats the gateway and the game
server as independently addressable and independently scalable components.

```bash
curl http://localhost:3000/health
```

## Layout

```
src/
  config/      Environment-driven configuration (typed, validated defaults)
  game/        Colyseus server lifecycle; room definitions land here (Issue 3.2)
  health/      Liveness endpoint for load balancers and CI
  main.ts      Bootstrap: CORS, shutdown hooks, REST listener
test/          End-to-end (HTTP) suites
```

## Scripts

| Command               | Purpose                                     |
| --------------------- | ------------------------------------------- |
| `npm run start:dev`   | Watch mode                                  |
| `npm run lint`        | ESLint, no auto-fix (used by CI)            |
| `npm run lint:fix`    | ESLint with auto-fix                        |
| `npm run format`      | Prettier write (config at the repo root)    |
| `npm run format:check`| Prettier check (used by CI)                 |
| `npm test`            | Unit tests                                  |
| `npm run test:e2e`    | End-to-end tests                            |
| `npm run build`       | Compile to `dist/`                          |

## Configuration

All runtime settings come from the environment; see `.env.example` for the full
list and `src/config/configuration.ts` for the defaults. Notably `CORS_ORIGINS`
falls back to "allow any origin" in development but to "allow none" in
production, so a deployment must declare its origins explicitly.

## Testing notes

Jest runs on the CommonJS runtime, which cannot `require()` the ESM-only `rou3`
package that Colyseus depends on. Both jest configs therefore transform that one
package with `@swc/jest` (`transformIgnorePatterns` + an `.mjs` transform). Node
itself needs no such help from 22.12 onward.

## Roadmap

Room definitions, Firebase auth, persistence and LiveKit integration are tracked
in `docs/MILESTONES.md` (Phases 3–5). This package currently covers the Phase 1
foundation: configuration, health, Colyseus transport lifecycle, lint/test/build.
