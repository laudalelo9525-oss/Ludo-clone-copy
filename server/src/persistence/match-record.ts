/** How a match stopped: played to a win, or ended without one. */
export type MatchOutcome = 'COMPLETED' | 'ABORTED';

/** A match as it is stored, mirroring `database/schema.sql`. */
export interface MatchRecord {
  roomId: string;
  gameMode: string;
  status: 'ONGOING' | MatchOutcome;
  startedAt: Date;
  endedAt?: Date;
}

/**
 * Where finished matches go.
 *
 * An interface rather than a concrete class so the room does not care whether
 * a database is configured: development and CI run against the no-op
 * implementation and behave identically, minus the storing.
 */
export interface MatchRepository {
  /** Records a match beginning; returns the stored id. */
  recordStarted(record: Omit<MatchRecord, 'status' | 'endedAt'>): Promise<string | null>;
  /** Marks a match finished. A missing id is ignored, not an error. */
  recordFinished(matchId: string | null, endedAt: Date, outcome: MatchOutcome): Promise<void>;
}

export const MATCH_REPOSITORY = Symbol('MATCH_REPOSITORY');
