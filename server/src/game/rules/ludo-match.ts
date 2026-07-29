import {
  CONSECUTIVE_SIXES_LIMIT,
  PAWNS_PER_PLAYER,
  type PlayerColor,
  YARD_EXIT_ROLL,
  YARD_POSITION,
  isHome,
} from './board';
import { getCapturableOpponents, getLegalMoves } from './moves';
import {
  type CapturedPawn,
  type DiceRoller,
  GamePhase,
  type MatchState,
  type Move,
  type MoveResult,
  NO_WINNER,
} from './types';

const MIN_PLAYERS = 2;
const MAX_PLAYERS = 4;

/**
 * The authoritative rules engine.
 *
 * This is the only thing allowed to decide a die value or accept a move: the
 * client's copy of the rules (the C# engine) is for prediction and offline
 * play, and anything it sends is re-validated here. Issue 3.4.
 *
 * Rules mirror the offline engine exactly — a six leaves the yard, home needs
 * an exact roll, landing on an unprotected opponent captures it, a six or a
 * capture or reaching home grants another roll, and three sixes forfeit the
 * turn. Blocks are a Custom Rules option and are not implemented.
 */
export class LudoMatch {
  private readonly dice: DiceRoller;
  private legalMovesForTurn: Move[] = [];

  readonly state: MatchState;

  constructor(seats: readonly PlayerColor[], dice: DiceRoller) {
    if (seats.length < MIN_PLAYERS || seats.length > MAX_PLAYERS) {
      throw new RangeError(
        `A match needs between ${MIN_PLAYERS} and ${MAX_PLAYERS} players, got ${seats.length}.`,
      );
    }

    if (new Set(seats).size !== seats.length) {
      throw new Error('Each colour may be seated only once.');
    }

    this.dice = dice;
    this.state = {
      seats: [...seats],
      positions: seats.map(() => new Array<number>(PAWNS_PER_PLAYER).fill(YARD_POSITION)),
      currentPlayerIndex: 0,
      phase: GamePhase.WaitingForRoll,
      pendingDie: 0,
      consecutiveSixes: 0,
      winnerIndex: NO_WINNER,
    };
  }

  get legalMoves(): readonly Move[] {
    return this.legalMovesForTurn;
  }

  get isOver(): boolean {
    return this.state.phase === GamePhase.Finished;
  }

  /** Rolls for the current seat and advances the turn loop. */
  roll(): number {
    this.requirePhase(GamePhase.WaitingForRoll);

    const die = this.dice.roll();
    if (!Number.isInteger(die) || die < 1 || die > 6) {
      throw new Error(`Dice roller returned ${die}; a die shows 1..6.`);
    }

    this.state.pendingDie = die;
    this.state.consecutiveSixes = die === YARD_EXIT_ROLL ? this.state.consecutiveSixes + 1 : 0;

    if (this.state.consecutiveSixes >= CONSECUTIVE_SIXES_LIMIT) {
      this.endTurn();
      return die;
    }

    const moves = getLegalMoves(this.state, this.state.currentPlayerIndex, die);
    if (moves.length === 0) {
      this.endTurn();
      return die;
    }

    this.legalMovesForTurn = moves;
    this.state.phase = GamePhase.WaitingForMove;
    return die;
  }

  /**
   * Applies the pending die to one of the current seat's pawns.
   *
   * @throws when the phase is wrong or the pawn has no legal move — which is
   * exactly what an out-of-turn or fabricated client message looks like.
   */
  movePawn(pawnIndex: number): MoveResult {
    this.requirePhase(GamePhase.WaitingForMove);

    const move = this.legalMovesForTurn.find((candidate) => candidate.pawnIndex === pawnIndex);
    if (!move) {
      throw new Error(`Pawn ${pawnIndex} has no legal move for a ${this.state.pendingDie}.`);
    }

    const player = this.state.currentPlayerIndex;
    this.state.positions[player][move.pawnIndex] = move.to;

    const captures = this.resolveCaptures(player, move.to);
    const wins = this.hasFinished(player);
    const rolledSix = this.state.pendingDie === YARD_EXIT_ROLL;
    const extraTurn = rolledSix || captures.length > 0 || isHome(move.to);

    const result: MoveResult = {
      move,
      captures,
      grantsExtraTurn: extraTurn && !wins,
      wins,
    };

    this.legalMovesForTurn = [];

    if (wins) {
      this.state.winnerIndex = player;
      this.state.phase = GamePhase.Finished;
      this.state.pendingDie = 0;
      return result;
    }

    if (extraTurn) {
      // The six counter carries over, so three sixes still forfeit.
      this.state.pendingDie = 0;
      this.state.phase = GamePhase.WaitingForRoll;
      return result;
    }

    this.endTurn();
    return result;
  }

  /** True when every pawn of the seat is home. */
  hasFinished(playerIndex: number): boolean {
    return this.state.positions[playerIndex].every((position) => isHome(position));
  }

  private resolveCaptures(movingPlayer: number, landedOn: number): CapturedPawn[] {
    const captured = getCapturableOpponents(this.state, movingPlayer, landedOn);

    for (const pawn of captured) {
      this.state.positions[pawn.playerIndex][pawn.pawnIndex] = YARD_POSITION;
    }

    return captured;
  }

  private endTurn(): void {
    this.state.pendingDie = 0;
    this.state.consecutiveSixes = 0;
    this.state.currentPlayerIndex = (this.state.currentPlayerIndex + 1) % this.state.seats.length;
    this.state.phase = GamePhase.WaitingForRoll;
    this.legalMovesForTurn = [];
  }

  private requirePhase(expected: GamePhase): void {
    if (this.state.phase !== expected) {
      throw new Error(`Expected phase ${expected} but the match is in ${this.state.phase}.`);
    }
  }
}
