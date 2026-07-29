import { Injectable } from '@nestjs/common';
import { matchMaker } from '@colyseus/core';
import { type RoomMatchmaker, type SeatReservation } from './matchmaking.types';

/**
 * Talks to the Colyseus matchmaker running in this process.
 *
 * Colyseus already handles the hard part — finding a room with a free seat or
 * creating one, across processes when Redis presence is configured — so the
 * gateway's job is to own the ticket lifecycle around it rather than to
 * reimplement matchmaking.
 */
@Injectable()
export class ColyseusMatchmaker implements RoomMatchmaker {
  async joinOrCreate(roomName: string, options: Record<string, unknown>): Promise<SeatReservation> {
    const reservation = await matchMaker.joinOrCreate(roomName, options);

    return {
      roomId: reservation.roomId,
      sessionId: reservation.sessionId,
      reservation,
    };
  }
}
