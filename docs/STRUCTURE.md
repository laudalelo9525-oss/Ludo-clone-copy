# Repository Structure

How the folder layout in the project blueprint (`README.md`) maps onto this
repository.

| Blueprint folder | Repository path | Status | Notes |
| ---------------- | --------------- | ------ | ----- |
| `client/`     | `client/`     | Skeleton    | Unity 6 LTS project; needs one Editor open to finish generating |
| `server/`     | `server/`     | Active      | NestJS gateway + Colyseus realtime server |
| `backend/`    | `server/`     | Merged      | Deliberately not a second folder — see below |
| `shared/`     | `shared/`     | Placeholder | Client/server contracts — filled in Issue 3.2 |
| `docs/`       | `docs/`       | Active      | SRS, SDD, API contracts, milestones, this file |
| `design/`     | `design/`     | Placeholder | Design sources and tokens |
| `database/`   | `database/`   | Active      | PostgreSQL schema, seeded by docker-compose |
| `docker/`     | `docker/`     | Active      | Compose stack and backend image |
| `.github/`    | `.github/`    | Active      | CI workflows |
| `scripts/`    | `scripts/`    | Active      | Developer helper scripts |
| `assets/`     | `assets/`     | Placeholder | `ui/`, `audio/`, `video/`, `animations/` |
| `tests/`      | `tests/`      | Placeholder | Cross-component integration and load tests |

## Why there is no separate `backend/`

The blueprint lists both `server/` and `backend/`. Splitting the Node.js
codebase across two top-level folders would give it two homes with no boundary
between them, so all backend code lives in `server/`, which is also where the
scaffolding and CI already point. If backend services are later split into
deployable units (gateway, matchmaking, economy…), they become workspaces
*inside* `server/` rather than a parallel tree.

## Ports

| Port   | Component                          | Configured by    |
| ------ | ---------------------------------- | ---------------- |
| `3000` | NestJS REST gateway                | `PORT`           |
| `2567` | Colyseus realtime server           | `COLYSEUS_PORT`  |
| `5432` | PostgreSQL (docker-compose)        | `POSTGRES_PORT`  |
| `6379` | Redis (docker-compose)             | `REDIS_PORT`     |
