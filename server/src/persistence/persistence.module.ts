import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MATCH_REPOSITORY } from './match-record';
import { NoopMatchRepository, PostgresMatchRepository } from './postgres-match-repository';

/**
 * Wires a real repository when DATABASE_URL is set, and a no-op otherwise.
 *
 * Making persistence optional keeps the game playable with nothing but Node —
 * no Docker, no database — which is what development on a phone looks like.
 */
@Global()
@Module({
  providers: [
    {
      provide: MATCH_REPOSITORY,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const url = config.get<string>('database.url');
        return url ? new PostgresMatchRepository(url) : new NoopMatchRepository();
      },
    },
  ],
  exports: [MATCH_REPOSITORY],
})
export class PersistenceModule {}
