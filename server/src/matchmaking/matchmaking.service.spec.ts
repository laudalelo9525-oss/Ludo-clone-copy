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
  readonly calls: Array<{ roomName: string; options: Record<string, unknown> }> = [];
  failure: Error | null = null;

  joinOrCreate(roomName: string, options: Record<string, unknown>): Promise<SeatReservation> {
    this.calls.push({ roomName, options });

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
      options: { gameMode: 'CLASSIC', maxPlayers: 4 },
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
