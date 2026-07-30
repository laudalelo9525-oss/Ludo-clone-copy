import { Inject, Injectable, Logger, OnApplicationShutdown, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Server } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { ColyseusConfig } from '../config/configuration';
import { MATCH_REPOSITORY, type MatchRepository } from '../persistence/match-record';
import { matchRecorder } from '../persistence/match-recorder';
import { LudoRoom } from './rooms/ludo-room';

/**
 * Owns the authoritative Colyseus game server.
 *
 * It listens on its own port (default 2567) rather than sharing the NestJS
 * HTTP port, matching the SDD where the REST gateway and the realtime game
 * server are separately addressable and independently scalable.
 *
 * Room definitions are registered here; the rules themselves live in
 * `rules/` and the wire contract in `rooms/`.
 */
@Injectable()
export class GameService implements OnModuleInit, OnApplicationShutdown {
  /** Room name clients pass to joinOrCreate; part of the client contract. */
  static readonly LUDO_ROOM = 'ludo';

  private readonly logger = new Logger(GameService.name);
  private gameServer: Server | null = null;

  constructor(
    private readonly configService: ConfigService,
    @Inject(MATCH_REPOSITORY) private readonly matches: MatchRepository,
  ) {}

  async onModuleInit(): Promise<void> {
    const { port } = this.configService.getOrThrow<ColyseusConfig>('colyseus');

    this.gameServer = new Server({
      transport: new WebSocketTransport(),
      greet: false,
    });

    // Rooms are built by Colyseus, so the repository is handed over rather
    // than injected.
    matchRecorder.use(this.matches);

    this.gameServer.define(GameService.LUDO_ROOM, LudoRoom);

    await this.gameServer.listen(port);
    this.logger.log(
      `Colyseus realtime server listening on ws://0.0.0.0:${port} ` +
        `(room "${GameService.LUDO_ROOM}")`,
    );
  }

  async onApplicationShutdown(): Promise<void> {
    if (!this.gameServer) {
      return;
    }

    // `false` keeps the process alive so Nest can finish its own shutdown.
    await this.gameServer.gracefullyShutdown(false);
    this.gameServer = null;
    this.logger.log('Colyseus realtime server shut down');
  }

  /** Exposed for future room registration and for tests. */
  getServer(): Server | null {
    return this.gameServer;
  }
}
