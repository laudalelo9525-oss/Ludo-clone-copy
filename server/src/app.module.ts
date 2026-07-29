import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { loadConfiguration } from './config/configuration';
import { GameModule } from './game/game.module';
import { HealthModule } from './health/health.module';
import { MatchmakingModule } from './matchmaking/matchmaking.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [loadConfiguration],
    }),
    HealthModule,
    GameModule,
    MatchmakingModule,
  ],
})
export class AppModule {}
