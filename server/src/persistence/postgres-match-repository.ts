import { Injectable, Logger, type OnApplicationShutdown } from '@nestjs/common';
import { Pool } from 'pg';
import { type MatchOutcome, type MatchRecord, type MatchRepository } from './match-record';

/**
 * Stores matches in PostgreSQL.
 *
 * Plain SQL against `database/schema.sql` rather than an ORM: the schema is
 * already written and versioned there, and mapping it into entity classes
 * would give the same tables two definitions that can disagree — the exact
 * duplication this project has spent effort removing elsewhere.
 *
 * Storing is best-effort. A database hiccup must never interrupt a match in
 * progress, so failures are logged and swallowed.
 */
@Injectable()
export class PostgresMatchRepository implements MatchRepository, OnApplicationShutdown {
  private readonly logger = new Logger(PostgresMatchRepository.name);
  private readonly pool: Pool;

  constructor(connectionString: string) {
    this.pool = new Pool({ connectionString, max: 4 });
  }

  async recordStarted(record: Omit<MatchRecord, 'status' | 'endedAt'>): Promise<string | null> {
    try {
      const result = await this.pool.query<{ id: string }>(
        `INSERT INTO matches (room_id, game_mode, status, started_at)
         VALUES ($1, $2, 'ONGOING', $3)
         RETURNING id`,
        [record.roomId, record.gameMode, record.startedAt],
      );

      return result.rows[0]?.id ?? null;
    } catch (error) {
      this.logger.warn(`Could not record match start: ${(error as Error).message}`);
      return null;
    }
  }

  async recordFinished(
    matchId: string | null,
    endedAt: Date,
    outcome: MatchOutcome,
  ): Promise<void> {
    if (!matchId) {
      return;
    }

    try {
      await this.pool.query(`UPDATE matches SET status = $3, ended_at = $2 WHERE id = $1`, [
        matchId,
        endedAt,
        outcome,
      ]);
    } catch (error) {
      this.logger.warn(`Could not record match end: ${(error as Error).message}`);
    }
  }

  async onApplicationShutdown(): Promise<void> {
    await this.pool.end();
  }
}

/**
 * Used when no DATABASE_URL is configured, so the game runs identically
 * without a database — which is how CI and a phone-only dev setup run it.
 */
@Injectable()
export class NoopMatchRepository implements MatchRepository {
  recordStarted(): Promise<string | null> {
    return Promise.resolve(null);
  }

  recordFinished(): Promise<void> {
    return Promise.resolve();
  }
}
