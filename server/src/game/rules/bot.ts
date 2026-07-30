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
/** How strong an opponent plays. */
export type BotDifficulty = 'EASY' | 'MEDIUM' | 'HARD';

export const BOT_DIFFICULTIES: readonly BotDifficulty[] = ['EASY', 'MEDIUM', 'HARD'];

type Weights = Record<
  | 'capture'
  | 'capturedProgress'
  | 'reachHome'
  | 'enterHomeColumn'
  | 'leaveYard'
  | 'landOnSafeCell'
  | 'progress'
  | 'riskPerThreat'
  | 'escapeThreat',
  number
>;

const WEIGHTS: Weights = {
  capture: 120,
  capturedProgress: 1,
  reachHome: 150,
  enterHomeColumn: 60,
  leaveYard: 80,
  landOnSafeCell: 30,
  progress: 1,
  riskPerThreat: 45,
  escapeThreat: 55,
};

/**
 * Difficulty is what an opponent fails to consider, not how deep it searches.
 * Medium chases captures and home but is blind to danger, which reads as
 * beatable rather than broken; Easy barely plans at all.
 */
const BLIND_SPOTS: Record<BotDifficulty, Partial<Weights>> = {
  EASY: { capture: 20, reachHome: 30, riskPerThreat: 0, escapeThreat: 0, landOnSafeCell: 0 },
  MEDIUM: { riskPerThreat: 0, escapeThreat: 0, landOnSafeCell: 0 },
  HARD: {},
};

/** Scores one move; higher is better. Exported for tests. */
export function scoreMove(
  state: MatchState,
  playerIndex: number,
  move: Move,
  difficulty: BotDifficulty = 'HARD',
): number {
  const weights = { ...WEIGHTS, ...BLIND_SPOTS[difficulty] };
  let score = move.to * weights.progress;

  if (isHome(move.to)) {
    score += weights.reachHome;
  } else if (isInHomeColumn(move.to)) {
    score += weights.enterHomeColumn;
  }

  if (isInYard(move.from)) {
    score += weights.leaveYard;
  }

  for (const capture of getCapturableOpponents(state, playerIndex, move.to)) {
    const travelled = state.positions[capture.playerIndex][capture.pawnIndex];
    score += weights.capture + travelled * weights.capturedProgress;
  }

  if (isOnMainTrack(move.to) && isSafeCell(toAbsolute(state.seats[playerIndex], move.to))) {
    score += weights.landOnSafeCell;
  }

  score -= countThreats(state, playerIndex, move.to) * weights.riskPerThreat;

  if (countThreats(state, playerIndex, move.from) > 0) {
    score += weights.escapeThreat;
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
  difficulty: BotDifficulty = 'HARD',
): Move {
  if (legalMoves.length === 0) {
    throw new Error('The bot was asked to move with no legal moves.');
  }

  let best = legalMoves[0];
  let bestScore = scoreMove(state, playerIndex, best, difficulty);

  for (let i = 1; i < legalMoves.length; i++) {
    const score = scoreMove(state, playerIndex, legalMoves[i], difficulty);
    if (score > bestScore) {
      best = legalMoves[i];
      bestScore = score;
    }
  }

  return best;
}
