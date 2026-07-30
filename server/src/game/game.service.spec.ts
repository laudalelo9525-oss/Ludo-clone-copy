import { ConfigService } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import { GameService } from './game.service';
import { MATCH_REPOSITORY } from '../persistence/match-record';

describe('GameService', () => {
  let service: GameService;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        GameService,
        {
          provide: MATCH_REPOSITORY,
          useValue: {
            recordStarted: () => Promise.resolve(null),
            recordFinished: () => Promise.resolve(),
          },
        },
        {
          provide: ConfigService,
          // Port 0 asks the OS for a free port, keeping the suite isolated
          // from a running dev server.
          useValue: { getOrThrow: () => ({ port: 0 }) },
        },
      ],
    }).compile();

    service = moduleRef.get(GameService);
  });

  it('has no realtime server before initialisation', () => {
    expect(service.getServer()).toBeNull();
  });

  it('starts and stops the Colyseus server with the module lifecycle', async () => {
    await service.onModuleInit();
    expect(service.getServer()).not.toBeNull();

    await service.onApplicationShutdown();
    expect(service.getServer()).toBeNull();
  });
});
