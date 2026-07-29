# shared/

Contracts shared by the Unity client and the NestJS/Colyseus backend, so both
sides of the wire change together:

- Colyseus message names and payload shapes (`ROLL_DICE`, `MOVE_PAWN`,
  `SEND_EMOTE`, `ON_DICE_ROLLED`, …) — see `docs/api-contracts.md`.
- Game mode and rule constants (Classic, Quick, Master, Tournament).
- Board topology constants (track length, safe cells, home entries).

The canonical definitions live here as TypeScript for the server, with the C#
mirrors generated or hand-kept under `client/Assets/Scripts/Shared/`.

Populated during Phase 3 (Issue 3.2), when the `LudoRoom` state schema is
defined. Until then `docs/api-contracts.md` is the source of truth.

## Why this matters for the rules

The offline rules engine is C# (`client/Assets/Scripts/Gameplay/`) and the
authoritative server is TypeScript, so the Ludo rules necessarily exist twice.
The board constants they must agree on — track length, home column length, the
safe cells, the die value that releases a pawn — belong here, and a contract
test in `tests/` should fail when the two drift apart. Anything else risks a
client that predicts a move the server then rejects.
