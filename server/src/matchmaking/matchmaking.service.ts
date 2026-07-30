import { randomUUID } from 'node:crypto';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { type ColyseusConfig } from '../config/configuration';
import { GameService } from '../game/game.service';
import {
  BOT_DIFFICULTIES,
  type BotDifficulty,
  GAME_MODES,
  type CreateTicketRequest,
  type GameMode,
  PLAYER_COUNTS,
  type PlayerCount,
  ROOM_MATCHMAKER,
  type RoomMatchmaker,
  type Ticket,
  TicketStatus,
} from './matchmaking.types';

/** Longest display name a player may be seated under. */
const NAME_MAX = 16;

/** Tickets older than this are forgotten; clients re-queue. */
const TICKET_TTL_MS = 5 * 60 * 1000;

/**
 * Owns the matchmaking ticket lifecycle described in `docs/api-contracts.md`.
 *
 * A ticket is resolved against the Colyseus matchmaker straight away, so
 * "SEARCHING" is only ever observed if seat reservation fails. Keeping the
 * ticket indirection means the queue can grow real waiting behaviour — skill
 * buckets, party grouping, backfill — without changing the client contract.
 */
@Injectable()
export class MatchmakingService {
  private readonly logger = new Logger(MatchmakingService.name);
  private readonly tickets = new Map<string, Ticket>();

  constructor(
    @Inject(ROOM_MATCHMAKER) private readonly matchmaker: RoomMatchmaker,
    private readonly configService: ConfigService,
  ) {}

  /** Validates a request, then reserves a seat in a suitable room. */
  async createTicket(request: CreateTicketRequest): Promise<Ticket> {
    const gameMode = this.validateGameMode(request?.gameMode);
    const players = this.validatePlayerCount(request?.players);
    const bots = this.validateBots(request?.bots, players);
    const botDifficulty = this.validateDifficulty(request?.botDifficulty);

    this.pruneExpired();

    const ticket: Ticket = {
      ticketId: randomUUID(),
      status: TicketStatus.Searching,
      gameMode,
      players,
      createdAt: Date.now(),
    };

    try {
      // The name rides along with the reservation, otherwise the room seats
      // the player under a generated fallback and the lobby entry is lost.
      const name = this.sanitiseName(request?.name);

      const options = {
        gameMode,
        maxPlayers: players,
        ...(name ? { name } : {}),
        ...(bots > 0 ? { bots, botDifficulty } : {}),
      };

      // A solo match gets its own room: joining a public one would drop a
      // stranger into a game against bots the player asked for.
      const seat =
        bots > 0
          ? await this.matchmaker.create(GameService.LUDO_ROOM, options)
          : await this.matchmaker.joinOrCreate(GameService.LUDO_ROOM, options);

      ticket.status = TicketStatus.Found;
      ticket.roomId = seat.roomId;
      ticket.sessionId = seat.sessionId;
      ticket.reservation = seat.reservation;
      ticket.serverUrl = this.serverUrl();
    } catch (error) {
      // The realtime server may be restarting or full; the client can retry
      // with a new ticket rather than being told a lie about a room.
      ticket.status = TicketStatus.Failed;
      ticket.error = (error as Error).message;
      this.logger.warn(`Matchmaking failed for ${gameMode}/${players}: ${ticket.error}`);
    }

    this.tickets.set(ticket.ticketId, ticket);
    return ticket;
  }

  /** Returns a ticket, or null when it never existed or has expired. */
  getTicket(ticketId: string): Ticket | null {
    this.pruneExpired();
    return this.tickets.get(ticketId) ?? null;
  }

  /** Trims a display name; anything unusable is dropped rather than rejected. */
  private sanitiseName(value: unknown): string | undefined {
    if (typeof value !== 'string') {
      return undefined;
    }

    const cleaned = value.trim().replace(/\s+/g, ' ').slice(0, NAME_MAX);
    return cleaned.length > 0 ? cleaned : undefined;
  }

  /** Bots fill seats the player did not want humans in. */
  private validateBots(value: unknown, players: PlayerCount): number {
    if (value === undefined || value === null) {
      return 0;
    }

    if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
      throw new RangeError('bots must be a non-negative whole number.');
    }

    if (value > players - 1) {
      throw new RangeError(`bots cannot exceed ${players - 1} for a ${players} player match.`);
    }

    return value;
  }

  private validateDifficulty(value: unknown): BotDifficulty {
    if (value === undefined || value === null) {
      return 'HARD';
    }

    if (typeof value === 'string' && (BOT_DIFFICULTIES as readonly string[]).includes(value)) {
      return value as BotDifficulty;
    }

    throw new RangeError(`botDifficulty must be one of ${BOT_DIFFICULTIES.join(', ')}.`);
  }

  private validateGameMode(value: unknown): GameMode {
    if (typeof value === 'string' && (GAME_MODES as readonly string[]).includes(value)) {
      return value as GameMode;
    }

    throw new RangeError(`gameMode must be one of ${GAME_MODES.join(', ')}.`);
  }

  private validatePlayerCount(value: unknown): PlayerCount {
    if (typeof value === 'number' && (PLAYER_COUNTS as readonly number[]).includes(value)) {
      return value as PlayerCount;
    }

    throw new RangeError(`players must be one of ${PLAYER_COUNTS.join(', ')}.`);
  }

  private serverUrl(): string {
    const { port } = this.configService.getOrThrow<ColyseusConfig>('colyseus');
    return process.env.COLYSEUS_PUBLIC_URL ?? `ws://localhost:${port}`;
  }

  private pruneExpired(): void {
    const cutoff = Date.now() - TICKET_TTL_MS;

    for (const [id, ticket] of this.tickets) {
      if (ticket.createdAt < cutoff) {
        this.tickets.delete(id);
      }
    }
  }
}
