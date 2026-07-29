/**
 * Wire protocol for the Ludo room, matching `docs/api-contracts.md`.
 *
 * These names are part of the client contract; changing one is a breaking
 * change for every shipped build.
 */

/** Messages a client may send. */
export const ClientMessage = {
  RollDice: 'ROLL_DICE',
  MovePawn: 'MOVE_PAWN',
  SendEmote: 'SEND_EMOTE',
} as const;

/** Messages the server broadcasts. */
export const ServerMessage = {
  DiceRolled: 'ON_DICE_ROLLED',
  PawnMoved: 'ON_PAWN_MOVED',
  TurnChanged: 'ON_TURN_CHANGED',
  EmoteReceived: 'ON_EMOTE',
  /** Sent only to the offending client when a message is refused. */
  Rejected: 'ON_REJECTED',
} as const;

export interface MovePawnPayload {
  pawnIndex: number;
}

export interface SendEmotePayload {
  emoteId: string;
}

export interface DiceRolledEvent {
  value: number;
  player: string;
  /** Pawn indices the player may move; empty when the turn passes. */
  movablePawns: number[];
}

export interface PawnMovedEvent {
  player: string;
  pawnIndex: number;
  newPosition: number;
  /** Pawns sent back to their yard by this move. */
  captures: Array<{ player: string; pawnIndex: number }>;
}

export interface TurnChangedEvent {
  nextPlayer: string;
}

export interface EmoteEvent {
  player: string;
  emoteId: string;
}

export interface RejectedEvent {
  message: string;
  reason: string;
}
