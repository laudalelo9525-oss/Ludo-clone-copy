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

### Room State (Schema)
```typescript
class LudoState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();
  @type("string") currentTurnSessionId: string;
  @type("uint8") diceValue: number;
  @type("string") gameState: string; // WAITING, PLAYING, FINISHED
}
```

### Client Messages (Actions)
- `ROLL_DICE`: Sent by active player to roll.
- `MOVE_PAWN`: `{ "pawnIndex": number }` - Request to move a pawn.
- `SEND_EMOTE`: `{ "emoteId": "string" }` - Broadcasts an emote.

### Server Messages (Events)
- `ON_DICE_ROLLED`: `{ "value": number, "player": "string" }`
- `ON_PAWN_MOVED`: `{ "player": "string", "pawnIndex": number, "newPosition": number }`
- `ON_TURN_CHANGED`: `{ "nextPlayer": "string" }`
