/** Game modes a ticket may ask for; mirrors the blueprint's Ludo modes. */
export const GAME_MODES = ['CLASSIC', 'QUICK', 'MASTER', 'TOURNAMENT'] as const;
export type GameMode = (typeof GAME_MODES)[number];

/** Seat counts a match supports. */
export const PLAYER_COUNTS = [2, 4] as const;
export type PlayerCount = (typeof PLAYER_COUNTS)[number];

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
}

export const ROOM_MATCHMAKER = Symbol('ROOM_MATCHMAKER');
