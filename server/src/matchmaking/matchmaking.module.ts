import { Module } from '@nestjs/common';
import { ColyseusMatchmaker } from './colyseus-matchmaker';
import { MatchmakingController } from './matchmaking.controller';
import { MatchmakingService } from './matchmaking.service';
import { ROOM_MATCHMAKER } from './matchmaking.types';

@Module({
  controllers: [MatchmakingController],
  providers: [MatchmakingService, { provide: ROOM_MATCHMAKER, useClass: ColyseusMatchmaker }],
  exports: [MatchmakingService],
})
export class MatchmakingModule {}
