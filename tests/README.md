# tests/

Test suites that do not belong to a single component.

## `RulesEngine/`

Compiles the Ludo rules engine and its NUnit tests on plain .NET so CI can
verify gameplay logic **without a Unity installation or licence**:

```bash
dotnet test tests/RulesEngine/LudoVerse.Rules.Tests.csproj
```

It does not hold sources of its own. It links the same files Unity compiles:

- `client/Assets/Scripts/Gameplay/**` — the engine (assembly `LudoVerse.Gameplay`)
- `client/Assets/Tests/EditMode/Gameplay/**` — the tests

That works because the gameplay assembly is declared with
`noEngineReferences`, so it cannot reference `UnityEngine` even by accident. The
project pins `LangVersion` to the C# version Unity 6 accepts, so syntax the
Editor would reject fails in CI first.

## Planned

- Integration tests driving the REST gateway and a live Colyseus room together.
- Load and soak tests for matchmaking and room throughput.
- Contract tests asserting the client and server agree on `shared/` schemas.

Component-level tests stay next to their code:

- Backend unit and e2e tests: `server/src/**/*.spec.ts`, `server/test/`.
- Unity Edit/Play Mode tests: `client/Assets/Tests/`.
