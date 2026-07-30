/**
 * Wire protocol, mirroring `server/src/game/rooms/messages.ts` and
 * `docs/api-contracts.md`. These names are the contract with the server;
 * changing one here without changing it there breaks every match.
 */

export const ClientMessage = {
  RollDice: 'ROLL_DICE',
  MovePawn: 'MOVE_PAWN',
  SendEmote: 'SEND_EMOTE',
} as const;

export const ServerMessage = {
  DiceRolled: 'ON_DICE_ROLLED',
  PawnMoved: 'ON_PAWN_MOVED',
  TurnChanged: 'ON_TURN_CHANGED',
  EmoteReceived: 'ON_EMOTE',
  Rejected: 'ON_REJECTED',
  PlayerAfk: 'ON_PLAYER_AFK',
  PlayerReturned: 'ON_PLAYER_RETURNED',
} as const;

export const RoomStatus = {
  Waiting: 'WAITING',
  Playing: 'PLAYING',
  Finished: 'FINISHED',
} as const;

/** Room name registered by the server. */
export const LUDO_ROOM = 'ludo';

export interface DiceRolledEvent {
  value: number;
  player: string;
  movablePawns: number[];
  automated: boolean;
}

export interface PawnMovedEvent {
  player: string;
  pawnIndex: number;
  newPosition: number;
  captures: Array<{ player: string; pawnIndex: number }>;
  automated: boolean;
}

export interface TurnChangedEvent {
  nextPlayer: string;
}

export interface RejectedEvent {
  message: string;
  reason: string;
}

/** Ticket returned by `POST /matchmaking/ticket`. */
export interface MatchTicket {
  ticketId: string;
  status: 'SEARCHING' | 'FOUND' | 'FAILED';
  roomId?: string;
  sessionId?: string;
  serverUrl?: string;
  reservation?: unknown;
  error?: string;
}

/** Modes the gateway accepts; mirrors server/src/matchmaking/matchmaking.types.ts. */
export const GAME_MODES = ['CLASSIC', 'QUICK', 'MASTER', 'TOURNAMENT'] as const;

export type GameMode = (typeof GAME_MODES)[number];

/** AI strengths the gateway accepts. */
export const BOT_DIFFICULTIES = ['EASY', 'MEDIUM', 'HARD'] as const;

export type BotDifficulty = (typeof BOT_DIFFICULTIES)[number];
