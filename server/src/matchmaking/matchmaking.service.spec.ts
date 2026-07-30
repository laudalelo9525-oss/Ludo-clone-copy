import { ConfigService } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import { MatchmakingService } from './matchmaking.service';
import {
  ROOM_MATCHMAKER,
  type RoomMatchmaker,
  type SeatReservation,
  TicketStatus,
} from './matchmaking.types';

class StubMatchmaker implements RoomMatchmaker {
  readonly calls: Array<{ roomName: string; options: Record<string, unknown>; method: string }> =
    [];
  failure: Error | null = null;

  create(roomName: string, options: Record<string, unknown>): Promise<SeatReservation> {
    return this.seat(roomName, options, 'create');
  }

  joinOrCreate(roomName: string, options: Record<string, unknown>): Promise<SeatReservation> {
    return this.seat(roomName, options, 'joinOrCreate');
  }

  private seat(
    roomName: string,
    options: Record<string, unknown>,
    method: string,
  ): Promise<SeatReservation> {
    this.calls.push({ roomName, options, method });

    if (this.failure) {
      return Promise.reject(this.failure);
    }

    return Promise.resolve({
      roomId: 'room-1',
      sessionId: 'session-1',
      reservation: { name: 'ludo', roomId: 'room-1', sessionId: 'session-1' },
    });
  }
}

describe('MatchmakingService', () => {
  let service: MatchmakingService;
  let matchmaker: StubMatchmaker;

  beforeEach(async () => {
    matchmaker = new StubMatchmaker();

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        MatchmakingService,
        { provide: ROOM_MATCHMAKER, useValue: matchmaker },
        { provide: ConfigService, useValue: { getOrThrow: () => ({ port: 2567 }) } },
      ],
    }).compile();

    service = moduleRef.get(MatchmakingService);
  });

  it('reserves a seat and returns everything needed to connect', async () => {
    const ticket = await service.createTicket({ gameMode: 'CLASSIC', players: 4 });

    expect(ticket.status).toBe(TicketStatus.Found);
    expect(ticket.roomId).toBe('room-1');
    expect(ticket.sessionId).toBe('session-1');
    expect(ticket.serverUrl).toBe('ws://localhost:2567');
    expect(ticket.reservation).toBeDefined();
    expect(matchmaker.calls[0]).toEqual({
      roomName: 'ludo',
      method: 'joinOrCreate',
      options: { gameMode: 'CLASSIC', maxPlayers: 4 },
    });
  });

  it('passes a display name through to the room', async () => {
    await service.createTicket({ gameMode: 'CLASSIC', players: 2, name: '  Ada  Lovelace  ' });

    expect(matchmaker.calls[0].options).toMatchObject({ name: 'Ada Lovelace' });
  });

  it('omits the name when none is usable, letting the room name the player', async () => {
    await service.createTicket({ gameMode: 'CLASSIC', players: 2, name: '   ' });

    expect(matchmaker.calls[0].options).not.toHaveProperty('name');
  });

  describe('solo play', () => {
    it('creates a private room so no stranger is dropped into a bot match', async () => {
      await service.createTicket({ gameMode: 'CLASSIC', players: 4, bots: 3 });

      expect(matchmaker.calls[0].method).toBe('create');
      expect(matchmaker.calls[0].options).toMatchObject({ bots: 3, botDifficulty: 'HARD' });
    });

    it('defaults to a human match when no bots are asked for', async () => {
      await service.createTicket({ gameMode: 'CLASSIC', players: 2 });

      expect(matchmaker.calls[0].method).toBe('joinOrCreate');
      expect(matchmaker.calls[0].options).not.toHaveProperty('bots');
    });

    it('passes the chosen difficulty through', async () => {
      await service.createTicket({ gameMode: 'QUICK', players: 2, bots: 1, botDifficulty: 'EASY' });

      expect(matchmaker.calls[0].options).toMatchObject({ botDifficulty: 'EASY' });
    });

    it('refuses more bots than there are free seats', async () => {
      await expect(
        service.createTicket({ gameMode: 'CLASSIC', players: 2, bots: 2 }),
      ).rejects.toBeInstanceOf(RangeError);
    });

    it('refuses an unknown difficulty', async () => {
      await expect(
        service.createTicket({
          gameMode: 'CLASSIC',
          players: 2,
          bots: 1,
          botDifficulty: 'GOD' as never,
        }),
      ).rejects.toBeInstanceOf(RangeError);
    });
  });

  it('looks a ticket up again by id', async () => {
    const created = await service.createTicket({ gameMode: 'QUICK', players: 2 });

    expect(service.getTicket(created.ticketId)?.ticketId).toBe(created.ticketId);
  });

  it('returns null for an unknown ticket', () => {
    expect(service.getTicket('nope')).toBeNull();
  });

  it('issues a distinct id per ticket', async () => {
    const first = await service.createTicket({ gameMode: 'CLASSIC', players: 2 });
    const second = await service.createTicket({ gameMode: 'CLASSIC', players: 2 });

    expect(first.ticketId).not.toBe(second.ticketId);
  });

  it('reports failure rather than a room that does not exist', async () => {
    matchmaker.failure = new Error('no rooms available');

    const ticket = await service.createTicket({ gameMode: 'CLASSIC', players: 2 });

    expect(ticket.status).toBe(TicketStatus.Failed);
    expect(ticket.roomId).toBeUndefined();
    expect(ticket.error).toBe('no rooms available');
  });

  describe('validation', () => {
    it.each([undefined, null, 'DEATHMATCH', 42])('rejects gameMode %p', async (gameMode) => {
      await expect(service.createTicket({ gameMode, players: 2 } as never)).rejects.toBeInstanceOf(
        RangeError,
      );
    });

    it.each([undefined, 0, 3, 5, '4'])('rejects players %p', async (players) => {
      await expect(
        service.createTicket({ gameMode: 'CLASSIC', players } as never),
      ).rejects.toBeInstanceOf(RangeError);
    });

    it('never reaches the matchmaker with an invalid request', async () => {
      await expect(service.createTicket({} as never)).rejects.toBeInstanceOf(RangeError);
      expect(matchmaker.calls).toHaveLength(0);
    });
  });
});
