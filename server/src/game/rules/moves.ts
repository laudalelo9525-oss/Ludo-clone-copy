import {
  HOME_POSITION,
  MAIN_TRACK_LENGTH,
  PAWNS_PER_PLAYER,
  YARD_EXIT_ROLL,
  isHome,
  isInYard,
  isOnMainTrack,
  isSafeCell,
  toAbsolute,
  trackDistance,
} from './board';
import { type CapturedPawn, type MatchState, type Move } from './types';

/** Furthest a pawn can be pushed by a single die. */
const MAX_DIE = 6;

/**
 * Where a pawn at `from` lands with the given die, or `null` when it cannot
 * legally move: still in the yard without a six, already home, or the roll
 * would overshoot home.
 */
export function getTarget(from: number, die: number): number | null {
  if (isInYard(from)) {
    return die === YARD_EXIT_ROLL ? 0 : null;
  }

  if (isHome(from)) {
    return null;
  }

  const target = from + die;

  return target > HOME_POSITION ? null : target;
}

/** Legal moves for a seat and die. An empty list means the turn passes. */
export function getLegalMoves(state: MatchState, playerIndex: number, die: number): Move[] {
  if (die < 1 || die > MAX_DIE) {
    throw new RangeError(`A die shows 1..6, got ${die}.`);
  }

  const moves: Move[] = [];

  for (let pawnIndex = 0; pawnIndex < PAWNS_PER_PLAYER; pawnIndex++) {
    const from = state.positions[playerIndex][pawnIndex];
    const to = getTarget(from, die);

    if (to !== null) {
      moves.push({ pawnIndex, from, to });
    }
  }

  return moves;
}

/**
 * Opponent pawns that would be sent home by landing on `destination`. Nothing
 * is mutated, so this also answers "would this capture?" for move hints.
 */
export function getCapturableOpponents(
  state: MatchState,
  movingPlayer: number,
  destination: number,
): CapturedPawn[] {
  // Home columns are private and safe cells are protected.
  if (!isOnMainTrack(destination)) {
    return [];
  }

  const absolute = toAbsolute(state.seats[movingPlayer], destination);
  if (isSafeCell(absolute)) {
    return [];
  }

  const captured: CapturedPawn[] = [];

  for (let playerIndex = 0; playerIndex < state.seats.length; playerIndex++) {
    if (playerIndex === movingPlayer) {
      continue;
    }

    for (let pawnIndex = 0; pawnIndex < PAWNS_PER_PLAYER; pawnIndex++) {
      const position = state.positions[playerIndex][pawnIndex];

      if (isOnMainTrack(position) && toAbsolute(state.seats[playerIndex], position) === absolute) {
        captured.push({ playerIndex, pawnIndex });
      }
    }
  }

  return captured;
}

/**
 * How many opponents could capture `position` on their next roll. An opponent
 * that would turn into its own home column before reaching the cell cannot.
 */
export function countThreats(state: MatchState, playerIndex: number, position: number): number {
  if (!isOnMainTrack(position)) {
    return 0;
  }

  const absolute = toAbsolute(state.seats[playerIndex], position);
  if (isSafeCell(absolute)) {
    return 0;
  }

  let threats = 0;

  for (let opponent = 0; opponent < state.seats.length; opponent++) {
    if (opponent === playerIndex) {
      continue;
    }

    for (let pawnIndex = 0; pawnIndex < PAWNS_PER_PLAYER; pawnIndex++) {
      const opponentPosition = state.positions[opponent][pawnIndex];
      if (!isOnMainTrack(opponentPosition)) {
        continue;
      }

      const distance = trackDistance(toAbsolute(state.seats[opponent], opponentPosition), absolute);

      if (distance < 1 || distance > MAX_DIE) {
        continue;
      }

      if (opponentPosition + distance > MAIN_TRACK_LENGTH - 1) {
        continue;
      }

      threats++;
    }
  }

  return threats;
}
