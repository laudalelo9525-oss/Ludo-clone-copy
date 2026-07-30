import type { GameMode, MatchTicket } from './protocol';

/** Talks to the NestJS gateway's matchmaking endpoints. */
export class MatchmakingApi {
  constructor(private readonly baseUrl: string) {}

  /** Requests a seat. The returned ticket carries the seat reservation. */
  async requestMatch(gameMode: GameMode, players: 2 | 4, name?: string): Promise<MatchTicket> {
    const response = await fetch(`${this.baseUrl}/matchmaking/ticket`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ gameMode, players, ...(name ? { name } : {}) }),
    });

    if (!response.ok) {
      throw new Error(`Matchmaking refused the request (${response.status}).`);
    }

    return (await response.json()) as MatchTicket;
  }

  /** Re-reads a ticket; used when a request is interrupted. */
  async getTicket(ticketId: string): Promise<MatchTicket | null> {
    const response = await fetch(`${this.baseUrl}/matchmaking/status/${ticketId}`);

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`Could not read ticket (${response.status}).`);
    }

    return (await response.json()) as MatchTicket;
  }
}
