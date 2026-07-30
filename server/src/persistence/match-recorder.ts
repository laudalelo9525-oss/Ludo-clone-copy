import { type MatchOutcome, type MatchRecord, type MatchRepository } from './match-record';

/**
 * Bridge between Nest's DI and Colyseus rooms.
 *
 * Colyseus constructs rooms itself, so they cannot be injected into. Rather
 * than reaching into the Nest container from a room, the game module hands the
 * repository over once at startup and rooms use this.
 */
class MatchRecorder {
  private repository: MatchRepository | null = null;

  /** Called once by GameService with whatever the container built. */
  use(repository: MatchRepository): void {
    this.repository = repository;
  }

  async started(record: Omit<MatchRecord, 'status' | 'endedAt'>): Promise<string | null> {
    return (await this.repository?.recordStarted(record)) ?? null;
  }

  async finished(matchId: string | null, endedAt: Date, outcome: MatchOutcome): Promise<void> {
    await this.repository?.recordFinished(matchId, endedAt, outcome);
  }
}

/** Shared instance; a room asks it to store, and it may store nothing. */
export const matchRecorder = new MatchRecorder();
