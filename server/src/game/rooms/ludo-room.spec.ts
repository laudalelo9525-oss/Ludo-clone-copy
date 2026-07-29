import { type Client } from '@colyseus/core';
import { ScriptedDiceRoller } from '../rules/dice';
import { type DiceRoller } from '../rules/types';
import { LudoRoom } from './ludo-room';
import { ClientMessage, ServerMessage } from './messages';
import { RoomStatus } from './ludo-state';

interface Sent {
  type: string;
  payload: unknown;
}

/**
 * Drives the room without a websocket transport: broadcasts and per-client
 * sends are captured, and the message handlers are invoked directly. The rules
 * themselves are covered by the LudoMatch suite; this pins the room's contract
 * — turn ownership, what goes on the wire, and what reaches the state.
 */
class TestableLudoRoom extends LudoRoom {
  readonly broadcasts: Sent[] = [];

  /** The pending turn timer, if any, so tests can fire it on demand. */
  private pending: { callback: () => void; delayMs: number } | null = null;

  constructor(dice: DiceRoller) {
    super();
    this.dice = dice;
  }

  protected override schedule(callback: () => void, delayMs: number): { clear(): void } {
    this.pending = { callback, delayMs };
    return {
      clear: () => {
        this.pending = null;
      },
    };
  }

  get pendingDelayMs(): number | null {
    return this.pending?.delayMs ?? null;
  }

  /** Fires the armed turn timer, as the clock would. */
  fireTurnTimer(): void {
    const pending = this.pending;
    if (!pending) {
      throw new Error('No turn timer is armed.');
    }

    this.pending = null;
    pending.callback();
  }

  override broadcast(type: string | number, message?: unknown): void {
    this.broadcasts.push({ type: String(type), payload: message });
  }

  roll(client: Client): void {
    this.handleRollDice(client);
  }

  move(client: Client, pawnIndex: number): void {
    this.handleMovePawn(client, { pawnIndex });
  }

  emote(client: Client, emoteId: string): void {
    this.handleEmote(client, { emoteId });
  }

  broadcastsOf(type: string): Sent[] {
    return this.broadcasts.filter((sent) => sent.type === type);
  }
}

interface FakeClient extends Client {
  sent: Sent[];
}

function fakeClient(sessionId: string): FakeClient {
  const sent: Sent[] = [];

  return {
    sessionId,
    sent,
    send: (type: string | number, payload?: unknown) => {
      sent.push({ type: String(type), payload });
    },
  } as unknown as FakeClient;
}

function newRoom(...dice: number[]): {
  room: TestableLudoRoom;
  red: FakeClient;
  green: FakeClient;
} {
  const room = new TestableLudoRoom(new ScriptedDiceRoller(...dice));
  room.onCreate({ maxPlayers: 2, turnTimeoutMs: 20_000 });

  const red = fakeClient('red-session');
  const green = fakeClient('green-session');
  room.onJoin(red, { name: 'Red' });
  room.onJoin(green, { name: 'Green' });

  return { room, red, green };
}

describe('LudoRoom', () => {
  it('waits for a second player before starting', () => {
    const room = new TestableLudoRoom(new ScriptedDiceRoller());
    room.onCreate({ maxPlayers: 2 });

    const red = fakeClient('red-session');
    room.onJoin(red, {});

    expect(room.state.gameState).toBe(RoomStatus.Waiting);
    expect(room.state.currentTurnSessionId).toBe('');

    room.onJoin(fakeClient('green-session'), {});

    expect(room.state.gameState).toBe(RoomStatus.Playing);
    expect(room.state.currentTurnSessionId).toBe('red-session');
  });

  it('seats players with four pawns in the yard', () => {
    const { room, red } = newRoom();
    const player = room.state.players.get(red.sessionId);

    expect(player?.seat).toBe(0);
    expect(player?.name).toBe('Red');
    expect(player?.connected).toBe(true);
    expect([...(player?.pawns ?? [])]).toEqual([-1, -1, -1, -1]);
  });

  it('rolls on the server and reports which pawns may move', () => {
    const { room, red } = newRoom(6);

    room.roll(red);

    const rolled = room.broadcastsOf(ServerMessage.DiceRolled);
    expect(rolled).toHaveLength(1);
    expect(rolled[0].payload).toEqual({
      value: 6,
      player: 'red-session',
      movablePawns: [0, 1, 2, 3],
      automated: false,
    });
    expect(room.state.diceValue).toBe(6);
  });

  it('mirrors an applied move into the synchronised state', () => {
    const { room, red } = newRoom(6);

    room.roll(red);
    room.move(red, 2);

    expect([...(room.state.players.get('red-session')?.pawns ?? [])]).toEqual([-1, -1, 0, -1]);

    const moved = room.broadcastsOf(ServerMessage.PawnMoved);
    expect(moved).toHaveLength(1);
    expect(moved[0].payload).toMatchObject({
      player: 'red-session',
      pawnIndex: 2,
      newPosition: 0,
      captures: [],
      automated: false,
    });
  });

  it('passes the turn on and announces it', () => {
    const { room, red } = newRoom(3);

    room.roll(red);

    expect(room.state.currentTurnSessionId).toBe('green-session');
    expect(room.broadcastsOf(ServerMessage.TurnChanged).pop()?.payload).toEqual({
      nextPlayer: 'green-session',
    });
  });

  it('reports a capture with the victim session id', () => {
    const { room, red } = newRoom(2);

    // Red 3 -> 5 lands on the cell where Green 44 stands.
    room.state.players.get('red-session')!.pawns[0] = 3;
    room.state.players.get('green-session')!.pawns[0] = 44;
    room['match']!.state.positions[0][0] = 3;
    room['match']!.state.positions[1][0] = 44;

    room.roll(red);
    room.move(red, 0);

    const moved = room.broadcastsOf(ServerMessage.PawnMoved).pop();
    expect(moved?.payload).toMatchObject({
      captures: [{ player: 'green-session', pawnIndex: 0 }],
    });
    expect([...(room.state.players.get('green-session')?.pawns ?? [])]).toEqual([-1, -1, -1, -1]);
  });

  it('broadcasts emotes and refuses empty ones', () => {
    const { room, green } = newRoom();

    room.emote(green, 'clap');
    expect(room.broadcastsOf(ServerMessage.EmoteReceived).pop()?.payload).toEqual({
      player: 'green-session',
      emoteId: 'clap',
    });

    room.emote(green, '');
    expect(green.sent.pop()?.type).toBe(ServerMessage.Rejected);
  });

  describe('authoritative validation', () => {
    it('refuses a roll from the player whose turn it is not', () => {
      const { room, green } = newRoom(6);

      room.roll(green);

      expect(green.sent).toHaveLength(1);
      expect(green.sent[0].type).toBe(ServerMessage.Rejected);
      expect(green.sent[0].payload).toMatchObject({
        message: ClientMessage.RollDice,
        reason: 'It is not your turn.',
      });
      expect(room.broadcastsOf(ServerMessage.DiceRolled)).toHaveLength(0);
      expect(room.state.diceValue).toBe(0);
    });

    it('refuses a move before a roll', () => {
      const { room, red } = newRoom(6);

      room.move(red, 0);

      expect(red.sent.pop()?.type).toBe(ServerMessage.Rejected);
      expect(room.broadcastsOf(ServerMessage.PawnMoved)).toHaveLength(0);
    });

    it('refuses an illegal pawn and leaves the board untouched', () => {
      const { room, red } = newRoom(3);
      room.state.players.get('red-session')!.pawns[0] = 10;
      room['match']!.state.positions[0][0] = 10;

      room.roll(red);
      room.move(red, 1); // pawn 1 is still in the yard, so a 3 cannot move it

      expect(red.sent.pop()?.type).toBe(ServerMessage.Rejected);
      expect(room['match']!.state.positions[0][1]).toBe(-1);
      expect(room.broadcastsOf(ServerMessage.PawnMoved)).toHaveLength(0);
    });

    it('refuses a second roll before the pending move is played', () => {
      const { room, red } = newRoom(6, 6);

      room.roll(red);
      room.roll(red);

      expect(red.sent.pop()?.type).toBe(ServerMessage.Rejected);
      expect(room.broadcastsOf(ServerMessage.DiceRolled)).toHaveLength(1);
    });
  });

  describe('afk detection and bot takeover (Issue 6.2)', () => {
    it('arms the full turn timeout for a present player', () => {
      const { room } = newRoom(6);

      expect(room.pendingDelayMs).toBe(20_000);
    });

    it('auto-plays a turn the player never takes', () => {
      const { room } = newRoom(6);

      room.fireTurnTimer();

      const rolled = room.broadcastsOf(ServerMessage.DiceRolled).pop();
      const moved = room.broadcastsOf(ServerMessage.PawnMoved).pop();

      expect(rolled?.payload).toMatchObject({ player: 'red-session', automated: true });
      expect(moved?.payload).toMatchObject({ player: 'red-session', automated: true });
      // A six was rolled, so a pawn left the yard.
      expect([...(room.state.players.get('red-session')?.pawns ?? [])]).toContain(0);
    });

    it('flags a player away only after repeated misses', () => {
      // Red misses twice: a 3 passes the turn on, Green rolls a 3 too, then
      // Red misses again.
      const { room, green } = newRoom(3, 3, 3);

      room.fireTurnTimer();
      expect(room.state.players.get('red-session')?.afk).toBe(false);
      expect(room.broadcastsOf(ServerMessage.PlayerAfk)).toHaveLength(0);

      // Green plays properly, handing the turn back to Red.
      room.roll(green);

      room.fireTurnTimer();

      expect(room.state.players.get('red-session')?.afk).toBe(true);
      expect(room.broadcastsOf(ServerMessage.PlayerAfk).pop()?.payload).toEqual({
        player: 'red-session',
        missedTurns: 2,
      });
    });

    it('uses the short bot delay once a player is flagged away', () => {
      const { room, green } = newRoom(3, 3, 3, 3);

      room.fireTurnTimer();
      room.roll(green);
      room.fireTurnTimer();
      expect(room.state.players.get('red-session')?.afk).toBe(true);

      // The auto-played turn passed play to Green; bring it back to Red.
      room.roll(green);

      expect(room.state.currentTurnSessionId).toBe('red-session');
      expect(room.pendingDelayMs).toBeLessThan(20_000);
    });

    it('stands the bot down as soon as the player acts again', () => {
      const { room, red, green } = newRoom(3, 3, 6, 4);

      room.fireTurnTimer();
      room.roll(green);
      room.fireTurnTimer();
      expect(room.state.players.get('red-session')?.afk).toBe(true);

      // Red comes back and takes their own turn.
      room.roll(red);

      expect(room.state.players.get('red-session')?.afk).toBe(false);
      expect(room.broadcastsOf(ServerMessage.PlayerReturned).pop()?.payload).toEqual({
        player: 'red-session',
      });
    });

    it('covers the turns of a player who dropped', () => {
      const { room, green } = newRoom(3);

      jest
        .spyOn(room, 'allowReconnection')
        .mockReturnValue(
          new Promise(() => {}) as unknown as ReturnType<typeof room.allowReconnection>,
        );

      // onDrop waits on the reconnection window, so it stays pending; the
      // takeover state it sets before awaiting is what matters here.
      void room.onDrop(green);

      expect(room.state.players.get('green-session')?.connected).toBe(false);
      expect(room.pendingDelayMs).toBe(20_000);

      // Red's turn passes to the dropped seat, which the bot picks up at once.
      room.fireTurnTimer();

      expect(room.state.currentTurnSessionId).toBe('green-session');
      expect(room.pendingDelayMs).toBeLessThan(20_000);
    });

    it('stops timing turns once the match is won', () => {
      const { room, red } = newRoom(2);
      room['match']!.state.positions[0] = [55, 57, 57, 57];

      room.roll(red);
      room.move(red, 0);

      expect(room.state.gameState).toBe(RoomStatus.Finished);
      expect(room.pendingDelayMs).toBeNull();
    });

    it('picks a capture when it auto-plays', () => {
      const { room } = newRoom(2);
      room['match']!.state.positions[0][0] = 3;
      room['match']!.state.positions[0][1] = 30;
      room['match']!.state.positions[1][0] = 44;

      room.fireTurnTimer();

      const moved = room.broadcastsOf(ServerMessage.PawnMoved).pop();
      expect(moved?.payload).toMatchObject({
        pawnIndex: 0,
        automated: true,
        captures: [{ player: 'green-session', pawnIndex: 0 }],
      });
    });
  });

  describe('disconnection', () => {
    it('holds the seat open when a player drops', async () => {
      const { room, green } = newRoom();

      // Resolve the reconnection immediately rather than waiting a minute.
      const reconnection = Promise.resolve(green);
      jest
        .spyOn(room, 'allowReconnection')
        .mockReturnValue(reconnection as unknown as ReturnType<typeof room.allowReconnection>);

      await room.onDrop(green);

      expect(room.state.players.has('green-session')).toBe(true);
      expect(room.state.players.get('green-session')?.connected).toBe(true);
    });

    it('frees the seat when the reconnection window expires', async () => {
      const { room, green } = newRoom();

      jest
        .spyOn(room, 'allowReconnection')
        .mockReturnValue(
          Promise.reject(new Error('expired')) as unknown as ReturnType<
            typeof room.allowReconnection
          >,
        );

      await room.onDrop(green);

      expect(room.state.players.has('green-session')).toBe(false);
    });

    it('removes a player who leaves on purpose', () => {
      const { room, green } = newRoom();

      room.onLeave(green);

      expect(room.state.players.has('green-session')).toBe(false);
    });
  });
});
