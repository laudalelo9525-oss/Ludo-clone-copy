import { isHome, isInHomeColumn, isInYard, isOnMainTrack, isSafeCell, toAbsolute } from './board';
import { countThreats, getCapturableOpponents } from './moves';
import { type MatchState, type Move } from './types';

/**
 * Score bonuses for the auto-play bot. Deliberately the same considerations as
 * the Hard offline opponent in the Unity client: captures, home, getting out of
 * the yard, safety, and the danger a destination sits in.
 *
 * The two do not have to agree the way the *rules* do — the bot only ever plays
 * for an absent human, so there is no prediction to keep in sync. It just has
 * to play competently enough that being taken over is not a punishment.
 */
const WEIGHTS = {
  capture: 120,
  capturedProgress: 1,
  reachHome: 150,
  enterHomeColumn: 60,
  leaveYard: 80,
  landOnSafeCell: 30,
  progress: 1,
  riskPerThreat: 45,
  escapeThreat: 55,
} as const;

/** Scores one move; higher is better. Exported for tests. */
export function scoreMove(state: MatchState, playerIndex: number, move: Move): number {
  let score = move.to * WEIGHTS.progress;

  if (isHome(move.to)) {
    score += WEIGHTS.reachHome;
  } else if (isInHomeColumn(move.to)) {
    score += WEIGHTS.enterHomeColumn;
  }

  if (isInYard(move.from)) {
    score += WEIGHTS.leaveYard;
  }

  for (const capture of getCapturableOpponents(state, playerIndex, move.to)) {
    const travelled = state.positions[capture.playerIndex][capture.pawnIndex];
    score += WEIGHTS.capture + travelled * WEIGHTS.capturedProgress;
  }

  if (isOnMainTrack(move.to) && isSafeCell(toAbsolute(state.seats[playerIndex], move.to))) {
    score += WEIGHTS.landOnSafeCell;
  }

  score -= countThreats(state, playerIndex, move.to) * WEIGHTS.riskPerThreat;

  if (countThreats(state, playerIndex, move.from) > 0) {
    score += WEIGHTS.escapeThreat;
  }

  return score;
}

/**
 * Picks the move the bot plays. Ties go to the lowest pawn index so a given
 * position always resolves the same way, which keeps match replays stable.
 */
export function pickBotMove(
  state: MatchState,
  playerIndex: number,
  legalMoves: readonly Move[],
): Move {
  if (legalMoves.length === 0) {
    throw new Error('The bot was asked to move with no legal moves.');
  }

  let best = legalMoves[0];
  let bestScore = scoreMove(state, playerIndex, best);

  for (let i = 1; i < legalMoves.length; i++) {
    const score = scoreMove(state, playerIndex, legalMoves[i]);
    if (score > bestScore) {
      best = legalMoves[i];
      bestScore = score;
    }
  }

  return best;
}
