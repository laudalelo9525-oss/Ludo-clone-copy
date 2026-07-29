# tests/

Test suites that do not belong to a single component.

## Planned

- Integration tests driving the REST gateway and a live Colyseus room together.
- Load and soak tests for matchmaking and room throughput.
- Contract tests asserting the client and server agree on `shared/` schemas.

Component-level tests stay next to their code:

- Backend unit and e2e tests: `server/src/**/*.spec.ts`, `server/test/`.
- Client tests: `client/src/**/*.test.ts` (`npm test` in `client/`).
