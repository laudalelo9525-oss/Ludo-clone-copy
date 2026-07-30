import { Client, type Room } from 'colyseus.js';
import { type MatchView, type PlayerView } from '../game/match-view';
import { MAX_RECONNECT_ATTEMPTS, reconnectDelayMs, shouldReconnect } from './reconnect';
import {
  ClientMessage,
  type DiceRolledEvent,
  LUDO_ROOM,
  type PawnMovedEvent,
  type RejectedEvent,
  ServerMessage,
} from './protocol';

export interface LudoClientEvents {
  /** A drop is being retried; `attempt` is 1-based. */
  onReconnecting?(attempt: number, maxAttempts: number): void;
  /** The seat was recovered and play continues. */
  onReconnected?(): void;
  /** Fires on every state change, with a plain snapshot. */
  onState(view: MatchView): void;
  /** A die was rolled — carries which pawns the server will accept a move for. */
  onDiceRolled?(event: DiceRolledEvent): void;
  /** A pawn moved — carries any pawns it knocked back to their yard. */
  onPawnMoved?(event: PawnMovedEvent): void;
  /** The server refused something this client asked for. */
  onRejected?(event: RejectedEvent): void;
  /** The connection dropped; the seat is held briefly for a reconnect. */
  onDisconnected?(code: number): void;
}

/**
 * The client half of the realtime protocol (Issue 3.3).
 *
 * It sends intent and renders what comes back — it never decides a dice value
 * or whether a move is legal. The server owns that, and refuses anything else
 * with `ON_REJECTED`.
 */
export class LudoClient {
  private room: Room | null = null;
  private sdk: Client | null = null;
  /** Handed out by the server so a dropped player can reclaim their seat. */
  private reconnectionToken: string | null = null;
  private events: LudoClientEvents | null = null;
  private reconnecting = false;

  constructor(private readonly colyseusUrl: string) {}

  get sessionId(): string {
    return this.room?.sessionId ?? '';
  }

  /** Joins a match, creating one if no room has a free seat. */
  async join(name: string, events: LudoClientEvents): Promise<void> {
    const client = new Client(this.colyseusUrl);
    this.sdk = client;
    this.attach(await client.joinOrCreate(LUDO_ROOM, { name }), events);
  }

  /**
   * Joins the seat the gateway already reserved for a matchmaking ticket.
   *
   * Consuming the reservation rather than calling joinOrCreate again is what
   * makes the ticket meaningful: the player lands in the room the matchmaker
   * picked, not whichever room happens to have space a moment later.
   */
  async joinWithReservation(reservation: unknown, events: LudoClientEvents): Promise<void> {
    const client = new Client(this.colyseusUrl);
    this.sdk = client;
    this.attach(await client.consumeSeatReservation(reservation as never), events);
  }

  private attach(room: Room, events: LudoClientEvents): void {
    this.room = room;
    this.events = events;
    this.reconnectionToken = room.reconnectionToken ?? null;

    room.onStateChange((state) => events.onState(toMatchView(state)));

    room.onMessage(ServerMessage.Rejected, (event: RejectedEvent) => {
      events.onRejected?.(event);
    });

    room.onMessage(ServerMessage.DiceRolled, (event: DiceRolledEvent) => {
      events.onDiceRolled?.(event);
    });

    room.onMessage(ServerMessage.PawnMoved, (event: PawnMovedEvent) => {
      events.onPawnMoved?.(event);
    });

    // Every other server message is already reflected in the synced state;
    // they are registered so the SDK does not warn about unhandled types, and
    // so animation can hook them without changing this class.
    for (const type of [
      ServerMessage.TurnChanged,
      ServerMessage.EmoteReceived,
      ServerMessage.PlayerAfk,
      ServerMessage.PlayerReturned,
    ]) {
      room.onMessage(type, () => undefined);
    }

    room.onLeave((code) => {
      this.room = null;

      if (shouldReconnect(code)) {
        void this.recoverSeat();
        return;
      }

      events.onDisconnected?.(code);
    });
  }

  /**
   * Walks the backoff, trying to reclaim the seat the server is holding.
   * Falls back to reporting the disconnect once the window is spent.
   */
  private async recoverSeat(): Promise<void> {
    const events = this.events;
    const token = this.reconnectionToken;

    if (this.reconnecting || !this.sdk || !token || !events) {
      events?.onDisconnected?.(1006);
      return;
    }

    this.reconnecting = true;

    for (let attempt = 1; attempt <= MAX_RECONNECT_ATTEMPTS; attempt++) {
      events.onReconnecting?.(attempt, MAX_RECONNECT_ATTEMPTS);
      await new Promise((resolve) => setTimeout(resolve, reconnectDelayMs(attempt)));

      try {
        const room = await this.sdk.reconnect(token);
        this.reconnecting = false;
        this.attach(room, events);
        events.onReconnected?.();
        return;
      } catch {
        // Seat may still be held; keep trying until the window closes.
      }
    }

    this.reconnecting = false;
    events.onDisconnected?.(1006);
  }

  roll(): void {
    this.room?.send(ClientMessage.RollDice);
  }

  movePawn(pawnIndex: number): void {
    this.room?.send(ClientMessage.MovePawn, { pawnIndex });
  }

  emote(emoteId: string): void {
    this.room?.send(ClientMessage.SendEmote, { emoteId });
  }

  async leave(): Promise<void> {
    await this.room?.leave();
    this.room = null;
  }
}

/** Copies the synced schema into plain data for rendering. */
function toMatchView(state: Record<string, unknown>): MatchView {
  const players: PlayerView[] = [];

  const map = state.players as { forEach(cb: (value: Record<string, unknown>) => void): void };
  map?.forEach((player) => {
    players.push({
      sessionId: String(player.sessionId ?? ''),
      seat: Number(player.seat ?? 0),
      name: String(player.name ?? ''),
      pawns: [...((player.pawns ?? []) as Iterable<number>)].map(Number),
      connected: Boolean(player.connected),
      afk: Boolean(player.afk),
    });
  });

  return {
    status: String(state.gameState ?? 'WAITING'),
    currentTurnSessionId: String(state.currentTurnSessionId ?? ''),
    diceValue: Number(state.diceValue ?? 0),
    winnerSessionId: String(state.winnerSessionId ?? ''),
    players,
  };
}
