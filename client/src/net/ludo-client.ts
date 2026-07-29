import { Client, type Room } from 'colyseus.js';
import { type MatchView, type PlayerView } from '../game/match-view';
import { ClientMessage, LUDO_ROOM, ServerMessage, type RejectedEvent } from './protocol';

export interface LudoClientEvents {
  /** Fires on every state change, with a plain snapshot. */
  onState(view: MatchView): void;
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

  constructor(private readonly colyseusUrl: string) {}

  get sessionId(): string {
    return this.room?.sessionId ?? '';
  }

  /** Joins a match, creating one if no room has a free seat. */
  async join(name: string, events: LudoClientEvents): Promise<void> {
    const client = new Client(this.colyseusUrl);
    const room = await client.joinOrCreate(LUDO_ROOM, { name });
    this.room = room;

    room.onStateChange((state) => events.onState(toMatchView(state)));

    room.onMessage(ServerMessage.Rejected, (event: RejectedEvent) => {
      events.onRejected?.(event);
    });

    // Every other server message is already reflected in the synced state;
    // they are registered so the SDK does not warn about unhandled types, and
    // so animation can hook them without changing this class.
    for (const type of [
      ServerMessage.DiceRolled,
      ServerMessage.PawnMoved,
      ServerMessage.TurnChanged,
      ServerMessage.EmoteReceived,
      ServerMessage.PlayerAfk,
      ServerMessage.PlayerReturned,
    ]) {
      room.onMessage(type, () => undefined);
    }

    room.onLeave((code) => {
      this.room = null;
      events.onDisconnected?.(code);
    });
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
