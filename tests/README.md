# tests/

Cross-cutting test suites that span more than one component and therefore do
not belong to a single project:

- Integration tests driving the REST gateway and a live Colyseus room together.
- Load and soak tests for matchmaking and room throughput.
- Contract tests asserting the client and server agree on `shared/` schemas.

Component-level tests stay next to their code:

- Backend unit and e2e tests: `server/src/**/*.spec.ts`, `server/test/`.
- Unity Edit/Play Mode tests: `client/Assets/Tests/`.
