import { type PlayerColor } from './board';

/** Where a match sits in the turn loop. */
export enum GamePhase {
  WaitingForRoll = 'WAITING_FOR_ROLL',
  WaitingForMove = 'WAITING_FOR_MOVE',
  Finished = 'FINISHED',
}

/** A legal relocation of one pawn for a given die value. */
export interface Move {
  readonly pawnIndex: number;
  /** Relative position before the move. */
  readonly from: number;
  /** Relative position after the move. */
  readonly to: number;
}

/** An opponent pawn sent back to its yard. */
export interface CapturedPawn {
  readonly playerIndex: number;
  readonly pawnIndex: number;
}

/** What applying a move actually did. */
export interface MoveResult {
  readonly move: Move;
  readonly captures: readonly CapturedPawn[];
  readonly grantsExtraTurn: boolean;
  readonly wins: boolean;
}

/** Serialisable match state; the room mirrors this into its Colyseus schema. */
export interface MatchState {
  readonly seats: readonly PlayerColor[];
  /** Relative pawn positions as `[playerIndex][pawnIndex]`. */
  readonly positions: number[][];
  currentPlayerIndex: number;
  phase: GamePhase;
  /** Die awaiting a move, or 0 when none is pending. */
  pendingDie: number;
  consecutiveSixes: number;
  /** Seat that won, or -1. */
  winnerIndex: number;
}

export const NO_WINNER = -1;

/** Source of die values. Injected so tests are deterministic. */
export interface DiceRoller {
  roll(): number;
}
