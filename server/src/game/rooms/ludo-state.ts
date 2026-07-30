import { MapSchema, Schema, schema } from '@colyseus/schema';
import { PAWNS_PER_PLAYER } from '../rules/board';

/**
 * Synchronised room state, following `docs/api-contracts.md`.
 *
 * Defined with the `schema()` factory rather than `@type` decorators so the
 * definitions do not depend on which decorator proposal the toolchain compiles.
 */
export const Player = schema({
  sessionId: 'string',
  /** Seat index, which also fixes the player's colour and start cell. */
  seat: 'uint8',
  name: 'string',
  /**
   * Relative pawn positions: -1 in the yard, 0..51 main track, 52..57 home
   * column. `int8` covers that range including the -1 sentinel.
   */
  pawns: ['int8'],
  /** False while the player is away; the seat is held for reconnection. */
  connected: 'boolean',
  /** True while the bot is covering this player's turns (Issue 6.2). */
  afk: 'boolean',
  /** True when the seat is an AI opponent rather than a person (Issue 6.1). */
  isBot: 'boolean',
});

export type PlayerState = InstanceType<typeof Player>;

export const LudoState = schema({
  players: { map: Player },
  /** Session whose turn it is, empty before the match starts. */
  currentTurnSessionId: 'string',
  /** Last rolled value, 0 when no roll is pending. */
  diceValue: 'uint8',
  /** WAITING, PLAYING or FINISHED. */
  gameState: 'string',
  /** Session that won, empty until then. */
  winnerSessionId: 'string',
});

export type LudoStateType = InstanceType<typeof LudoState>;

/** Values `gameState` can take, mirrored by the client. */
export const RoomStatus = {
  Waiting: 'WAITING',
  Playing: 'PLAYING',
  Finished: 'FINISHED',
} as const;

/** Seats an AI opponent, which never has a client behind it. */
export function createBot(seat: number, name: string): PlayerState {
  const bot = createPlayer(`bot-${seat}`, seat, name);
  bot.isBot = true;
  return bot;
}

export function createPlayer(sessionId: string, seat: number, name: string): PlayerState {
  const player = new Player();
  player.sessionId = sessionId;
  player.seat = seat;
  player.name = name;
  player.connected = true;
  player.afk = false;
  player.isBot = false;

  for (let pawn = 0; pawn < PAWNS_PER_PLAYER; pawn++) {
    player.pawns.push(-1);
  }

  return player;
}

export { MapSchema, Schema };
