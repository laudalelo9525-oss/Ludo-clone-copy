import { Injectable, Logger, OnApplicationShutdown, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Server } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { ColyseusConfig } from '../config/configuration';

/**
 * Owns the authoritative Colyseus game server.
 *
 * It listens on its own port (default 2567) rather than sharing the NestJS
 * HTTP port, matching the SDD where the REST gateway and the realtime game
 * server are separately addressable and independently scalable.
 *
 * Room definitions (`LudoRoom` and its state schema) are added in Phase 3,
 * Issue 3.2 — this class only owns the transport lifecycle.
 */
@Injectable()
export class GameService implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(GameService.name);
  private gameServer: Server | null = null;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const { port } = this.configService.getOrThrow<ColyseusConfig>('colyseus');

    this.gameServer = new Server({
      transport: new WebSocketTransport(),
      greet: false,
    });

    await this.gameServer.listen(port);
    this.logger.log(`Colyseus realtime server listening on ws://0.0.0.0:${port}`);
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
