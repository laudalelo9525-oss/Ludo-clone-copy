import { type Client, Room } from '@colyseus/core';
import { type PlayerColor } from '../rules/board';
import { SecureDiceRoller } from '../rules/dice';
import { LudoMatch } from '../rules/ludo-match';
import { type DiceRoller, GamePhase, type MoveResult } from '../rules/types';
import {
  ClientMessage,
  type MovePawnPayload,
  type SendEmotePayload,
  ServerMessage,
} from './messages';
import {
  LudoState,
  type LudoStateType,
  type PlayerState,
  RoomStatus,
  createPlayer,
} from './ludo-state';

export interface LudoRoomOptions {
  /** Seats the match is played with; defaults to four. */
  maxPlayers?: number;
}

const DEFAULT_MAX_PLAYERS = 4;
const MIN_PLAYERS = 2;

/** How long a seat is held open for a disconnected player, in seconds. */
const RECONNECTION_WINDOW_SECONDS = 60;

/**
 * The authoritative Ludo room (Issue 3.2).
 *
 * Every rule decision happens here: the server rolls the dice, decides which
 * moves are legal, and applies them. A client message is a *request* — it
 * carries no state, and anything that does not match the server's view is
 * refused rather than trusted (Issue 3.4).
 */
export class LudoRoom extends Room<{ state: LudoStateType }> {
  /** Overridable so tests can drive a deterministic match. */
  protected dice: DiceRoller = new SecureDiceRoller();

  private match: LudoMatch | null = null;
  private maxPlayers = DEFAULT_MAX_PLAYERS;

  override onCreate(options: LudoRoomOptions = {}): void {
    this.maxPlayers = options.maxPlayers ?? DEFAULT_MAX_PLAYERS;
    this.maxClients = this.maxPlayers;

    this.state = new LudoState();
    this.state.gameState = RoomStatus.Waiting;
    this.state.currentTurnSessionId = '';
    this.state.winnerSessionId = '';
    this.state.diceValue = 0;

    this.onMessage(ClientMessage.RollDice, (client) => this.handleRollDice(client));
    this.onMessage(ClientMessage.MovePawn, (client, payload: MovePawnPayload) =>
      this.handleMovePawn(client, payload),
    );
    this.onMessage(ClientMessage.SendEmote, (client, payload: SendEmotePayload) =>
      this.handleEmote(client, payload),
    );
  }

  override onJoin(client: Client, options: { name?: string } = {}): void {
    const seat = this.state.players.size;
    const player = createPlayer(client.sessionId, seat, options.name ?? `Player ${seat + 1}`);
    this.state.players.set(client.sessionId, player);

    if (this.state.players.size >= MIN_PLAYERS && this.state.gameState === RoomStatus.Waiting) {
      this.startMatch();
    }
  }

  /** A client that left on purpose, or one whose reconnection window expired. */
  override onLeave(client: Client): void {
    this.state.players.delete(client.sessionId);
  }

  /**
   * An unexpected disconnect. The seat is held open so an interrupted player
   * can pick the match back up (Issue 3.6); the AFK takeover in Issue 6.2
   * hooks in at the same point.
   */
  override async onDrop(client: Client): Promise<void> {
    const player = this.state.players.get(client.sessionId);
    if (!player) {
      return;
    }

    if (this.state.gameState === RoomStatus.Finished) {
      this.state.players.delete(client.sessionId);
      return;
    }

    player.connected = false;

    try {
      await this.allowReconnection(client, RECONNECTION_WINDOW_SECONDS);
      player.connected = true;
    } catch {
      this.state.players.delete(client.sessionId);
    }
  }

  /** Seats in join order, which is also the turn order. */
  private get seatedPlayers(): PlayerState[] {
    return [...this.state.players.values()].sort((a, b) => a.seat - b.seat);
  }

  private startMatch(): void {
    const players = this.seatedPlayers;
    const seats = players.map((player) => player.seat as PlayerColor);

    this.match = new LudoMatch(seats, this.dice);
    this.state.gameState = RoomStatus.Playing;
    this.state.diceValue = 0;
    this.syncTurn();
  }

  protected handleRollDice(client: Client): void {
    const match = this.requireTurn(client, ClientMessage.RollDice);
    if (!match) {
      return;
    }

    const value = match.roll();
    this.state.diceValue = value;

    this.broadcast(ServerMessage.DiceRolled, {
      value,
      player: client.sessionId,
      movablePawns: match.legalMoves.map((move) => move.pawnIndex),
    });

    // No legal move means the roll already passed the turn on.
    if (match.state.phase === GamePhase.WaitingForRoll) {
      this.syncTurn();
    }
  }

  protected handleMovePawn(client: Client, payload: MovePawnPayload): void {
    const match = this.requireTurn(client, ClientMessage.MovePawn);
    if (!match) {
      return;
    }

    let result: MoveResult;
    try {
      result = match.movePawn(payload?.pawnIndex);
    } catch (error) {
      // An illegal move is a client bug or a cheat attempt; the server state
      // is untouched either way.
      this.reject(client, ClientMessage.MovePawn, (error as Error).message);
      return;
    }

    this.syncPawns();
    this.state.diceValue = match.state.pendingDie;

    this.broadcast(ServerMessage.PawnMoved, {
      player: client.sessionId,
      pawnIndex: result.move.pawnIndex,
      newPosition: result.move.to,
      captures: result.captures.map((capture) => ({
        player: this.sessionIdForSeat(capture.playerIndex),
        pawnIndex: capture.pawnIndex,
      })),
    });

    if (result.wins) {
      this.state.gameState = RoomStatus.Finished;
      this.state.winnerSessionId = client.sessionId;
      this.state.currentTurnSessionId = '';
      return;
    }

    this.syncTurn();
  }

  protected handleEmote(client: Client, payload: SendEmotePayload): void {
    if (!payload?.emoteId) {
      this.reject(client, ClientMessage.SendEmote, 'An emote id is required.');
      return;
    }

    this.broadcast(ServerMessage.EmoteReceived, {
      player: client.sessionId,
      emoteId: payload.emoteId,
    });
  }

  /** Returns the match only when it really is this client's turn. */
  private requireTurn(client: Client, message: string): LudoMatch | null {
    if (!this.match || this.state.gameState !== RoomStatus.Playing) {
      this.reject(client, message, 'The match is not running.');
      return null;
    }

    if (this.state.currentTurnSessionId !== client.sessionId) {
      this.reject(client, message, 'It is not your turn.');
      return null;
    }

    const expected =
      message === ClientMessage.RollDice ? GamePhase.WaitingForRoll : GamePhase.WaitingForMove;

    if (this.match.state.phase !== expected) {
      this.reject(client, message, `The match is in ${this.match.state.phase}.`);
      return null;
    }

    return this.match;
  }

  private reject(client: Client, message: string, reason: string): void {
    client.send(ServerMessage.Rejected, { message, reason });
  }

  /** Copies engine pawn positions into the synchronised state. */
  private syncPawns(): void {
    if (!this.match) {
      return;
    }

    for (const player of this.seatedPlayers) {
      const positions = this.match.state.positions[player.seat];

      for (let pawn = 0; pawn < positions.length; pawn++) {
        player.pawns[pawn] = positions[pawn];
      }
    }
  }

  private syncTurn(): void {
    if (!this.match) {
      return;
    }

    const nextSessionId = this.sessionIdForSeat(this.match.state.currentPlayerIndex);
    if (nextSessionId === this.state.currentTurnSessionId) {
      return;
    }

    this.state.currentTurnSessionId = nextSessionId;
    this.state.diceValue = 0;
    this.broadcast(ServerMessage.TurnChanged, { nextPlayer: nextSessionId });
  }

  private sessionIdForSeat(seatIndex: number): string {
    const player = this.seatedPlayers[seatIndex];
    return player ? player.sessionId : '';
  }
}
