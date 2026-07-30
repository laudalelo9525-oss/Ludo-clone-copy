/** Game modes a ticket may ask for; mirrors the blueprint's Ludo modes. */
export const GAME_MODES = ['CLASSIC', 'QUICK', 'MASTER', 'TOURNAMENT'] as const;
export type GameMode = (typeof GAME_MODES)[number];

/** Seat counts a match supports. */
export const PLAYER_COUNTS = [2, 4] as const;
export type PlayerCount = (typeof PLAYER_COUNTS)[number];

/** Strengths the lobby may ask for. */
export const BOT_DIFFICULTIES = ['EASY', 'MEDIUM', 'HARD'] as const;
export type BotDifficulty = (typeof BOT_DIFFICULTIES)[number];

export enum TicketStatus {
  Searching = 'SEARCHING',
  Found = 'FOUND',
  Failed = 'FAILED',
}

export interface CreateTicketRequest {
  gameMode: GameMode;
  players: PlayerCount;
  /** Display name to seat the player under; optional, the room names them if absent. */
  name?: string;
  /** AI opponents to play against; 0 (default) means a match with people. */
  bots?: number;
  /** How strongly those opponents play. */
  botDifficulty?: BotDifficulty;
}

/**
 * What the client needs to finish joining: Colyseus hands out a seat
 * reservation that `client.consumeSeatReservation()` turns into a connection.
 */
export interface SeatReservation {
  roomId: string;
  sessionId: string;
  /** Opaque reservation passed straight back to the Colyseus client SDK. */
  reservation: unknown;
}

export interface Ticket {
  ticketId: string;
  status: TicketStatus;
  gameMode: GameMode;
  players: PlayerCount;
  createdAt: number;
  roomId?: string;
  sessionId?: string;
  serverUrl?: string;
  reservation?: unknown;
  error?: string;
}

/**
 * Seam over the Colyseus matchmaker, so the queue can be tested without a
 * running realtime server.
 */
export interface RoomMatchmaker {
  joinOrCreate(roomName: string, options: Record<string, unknown>): Promise<SeatReservation>;
  /** Creates a fresh room nobody else can be matched into. */
  create(roomName: string, options: Record<string, unknown>): Promise<SeatReservation>;
}

export const ROOM_MATCHMAKER = Symbol('ROOM_MATCHMAKER');
