# API Contracts - LudoVerse

## 1. REST API (NestJS Gateway)

### Authentication
- `POST /auth/login`
  - **Body**: `{ "firebaseToken": "string" }`
  - **Response**: `{ "accessToken": "string", "user": { ... } }`

### Matchmaking
- `POST /matchmaking/ticket`
  - **Body**: `{ "gameMode": "CLASSIC", "players": 4 }`
  - **Response**: `{ "ticketId": "string", "status": "SEARCHING" }`
- `GET /matchmaking/status/:ticketId`
  - **Response**: `{ "status": "FOUND", "roomId": "string", "serverUrl": "string" }`

### Economy & Store
- `GET /user/:id/inventory`
- `POST /store/buy`
  - **Body**: `{ "itemId": "string" }`

---

## 2. Real-Time Multiplayer (Colyseus WebSockets)

Room name: **`ludo`** — `client.joinOrCreate("ludo", { name })` on the Colyseus
port (2567 by default). Implemented in `server/src/game/rooms/`.

### Room State (Schema)
```typescript
Player = schema({
  sessionId: "string",
  seat: "uint8",        // also fixes colour and start cell
  name: "string",
  pawns: ["int8"],      // relative positions: -1 yard, 0..51 track, 52..57 home column
  connected: "boolean", // false while held open for reconnection
  afk: "boolean",       // true while the bot is covering this player's turns
});

LudoState = schema({
  players: { map: Player },
  currentTurnSessionId: "string",
  diceValue: "uint8",        // 0 when no roll is pending
  gameState: "string",       // WAITING, PLAYING, FINISHED
  winnerSessionId: "string",
});
```

### Client Messages (Actions)
- `ROLL_DICE`: Sent by the active player to roll. Carries no payload — the
  server generates the value.
- `MOVE_PAWN`: `{ "pawnIndex": number }` — Request to move a pawn.
- `SEND_EMOTE`: `{ "emoteId": "string" }` — Broadcasts an emote.

### Server Messages (Events)
- `ON_DICE_ROLLED`: `{ "value": number, "player": "string", "movablePawns": number[], "automated": boolean }`
- `ON_PAWN_MOVED`: `{ "player": "string", "pawnIndex": number, "newPosition": number, "captures": [{ "player": "string", "pawnIndex": number }], "automated": boolean }`
- `ON_TURN_CHANGED`: `{ "nextPlayer": "string" }`
- `ON_EMOTE`: `{ "player": "string", "emoteId": "string" }`
- `ON_REJECTED`: `{ "message": "string", "reason": "string" }` — sent only to
  the client whose request was refused.
- `ON_PLAYER_AFK`: `{ "player": "string", "missedTurns": number }`
- `ON_PLAYER_RETURNED`: `{ "player": "string" }`

`automated: true` means the bot played that roll or move because the player was
away; clients should present it as such rather than as the player acting.

### Turn timing
A player has 20 seconds (configurable per room) to roll or move. Miss it and
the turn is auto-played; miss two in a row and the seat is flagged away, after
which the bot plays immediately until the player acts again. A dropped player's
turns are covered from the moment they disconnect.

### Authority
The server decides dice values and legal moves. A request that is out of turn,
out of phase, or names a pawn that cannot legally move is answered with
`ON_REJECTED` and changes nothing, so a modified client gains no advantage.

Board constants shared with the Unity client live in
`shared/board-constants.json`; both rule implementations are tested against it.
