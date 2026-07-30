import { type Client, Room } from '@colyseus/core';
import { type PlayerColor } from '../rules/board';
import { type BotDifficulty, pickBotMove } from '../rules/bot';
import { SecureDiceRoller } from '../rules/dice';
import { LudoMatch } from '../rules/ludo-match';
import { type DiceRoller, GamePhase, type MoveResult } from '../rules/types';
import { matchRecorder } from '../../persistence/match-recorder';
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
  createBot,
  createPlayer,
} from './ludo-state';

export interface LudoRoomOptions {
  /** Seats the match is played with; defaults to four. */
  maxPlayers?: number;
  /** How long a player has to act before the turn is auto-played, in ms. */
  turnTimeoutMs?: number;
  /** AI opponents to seat alongside the human, for solo play (Issue 6.1). */
  bots?: number;
  /** How strongly those opponents play. */
  botDifficulty?: BotDifficulty;
  /** Mode the match is played under; recorded with the match history. */
  gameMode?: string;
}

/** Something scheduled that can be cancelled; satisfied by Colyseus' Delayed. */
export interface ScheduledTask {
  clear(): void;
}

const DEFAULT_MAX_PLAYERS = 4;
const MIN_PLAYERS = 2;

/** How long a seat is held open for a disconnected player, in seconds. */
const RECONNECTION_WINDOW_SECONDS = 60;

/** Default time a player has to roll or move before the bot steps in. */
const DEFAULT_TURN_TIMEOUT_MS = 20_000;

/** Consecutive auto-played turns before a player is flagged as away. */
const AFK_STRIKE_LIMIT = 2;

/**
 * Pause before the bot acts, so an auto-played turn still reads as a turn on
 * the other players' screens instead of resolving instantly.
 */
const BOT_ACTION_DELAY_MS = 700;

/**
 * The authoritative Ludo room (Issue 3.2).
 *
 * Every rule decision happens here: the server rolls the dice, decides which
 * moves are legal, and applies them. A client message is a *request* — it
 * carries no state, and anything that does not match the server's view is
 * refused rather than trusted (Issue 3.4).
 *
 * A turn that is not played in time is played by a bot, which keeps a match
 * moving when someone rages out, loses signal, or puts their phone down
 * (Issue 6.2).
 */
export class LudoRoom extends Room<LudoStateType> {
  /** Overridable so tests can drive a deterministic match. */
  protected dice: DiceRoller = new SecureDiceRoller();

  private match: LudoMatch | null = null;
  private maxPlayers = DEFAULT_MAX_PLAYERS;
  private turnTimeoutMs = DEFAULT_TURN_TIMEOUT_MS;
  private turnTimer: ScheduledTask | null = null;
  private botDifficulty: BotDifficulty = 'HARD';
  private gameMode = 'CLASSIC';
  /** Row id for this match, or null when nothing is being stored. */
  private matchId: string | null = null;

  /** Consecutive auto-played turns, by session id. */
  private readonly missedTurns = new Map<string, number>();

  override onCreate(options: LudoRoomOptions = {}): void {
    this.maxPlayers = options.maxPlayers ?? DEFAULT_MAX_PLAYERS;
    this.turnTimeoutMs = options.turnTimeoutMs ?? DEFAULT_TURN_TIMEOUT_MS;
    this.maxClients = this.maxPlayers;

    this.setState(new LudoState());
    this.state.gameState = RoomStatus.Waiting;
    this.state.currentTurnSessionId = '';
    this.state.winnerSessionId = '';
    this.state.diceValue = 0;

    // Solo play seats AI opponents up front, so the match starts as soon as
    // the human arrives instead of waiting for people who are not coming.
    this.gameMode = options.gameMode ?? 'CLASSIC';
    const bots = Math.min(Math.max(options.bots ?? 0, 0), this.maxPlayers - 1);
    this.botDifficulty = options.botDifficulty ?? 'HARD';

    for (let seat = 1; seat <= bots; seat++) {
      this.state.players.set(`bot-${seat}`, createBot(seat, `AI ${seat}`));
    }

    this.onMessage(ClientMessage.RollDice, (client) => this.handleRollDice(client));
    this.onMessage(ClientMessage.MovePawn, (client, payload: MovePawnPayload) =>
      this.handleMovePawn(client, payload),
    );
    this.onMessage(ClientMessage.SendEmote, (client, payload: SendEmotePayload) =>
      this.handleEmote(client, payload),
    );
  }

  override onJoin(client: Client, options: { name?: string } = {}): void {
    // Bots hold the seats after the first, so a human always takes seat 0.
    const seat = this.hasBots ? 0 : this.state.players.size;
    const player = createPlayer(client.sessionId, seat, options.name ?? `Player ${seat + 1}`);
    this.state.players.set(client.sessionId, player);

    if (this.state.players.size >= MIN_PLAYERS && this.state.gameState === RoomStatus.Waiting) {
      this.startMatch();
    }
  }

  /**
   * A client left. A consented leave frees the seat immediately; an unexpected
   * disconnect holds it open so an interrupted player can pick the match back
   * up (Issue 3.6), with the bot covering their turns in the meantime rather
   * than stalling everyone else.
   */
  override async onLeave(client: Client, consented?: boolean): Promise<void> {
    const player = this.state.players.get(client.sessionId);
    if (!player) {
      return;
    }

    if (consented || this.state.gameState === RoomStatus.Finished) {
      this.state.players.delete(client.sessionId);
      this.missedTurns.delete(client.sessionId);
      this.armTurnTimer();
      return;
    }

    player.connected = false;
    this.armTurnTimer();

    try {
      await this.allowReconnection(client, RECONNECTION_WINDOW_SECONDS);
      player.connected = true;
      this.clearAfk(client.sessionId);
      this.armTurnTimer();
    } catch {
      this.state.players.delete(client.sessionId);
      this.missedTurns.delete(client.sessionId);
      this.armTurnTimer();
    }
  }

  override onDispose(): void {
    this.turnTimer?.clear();
    this.turnTimer = null;

    // A room that dies mid-match — everyone left, the process is shutting
    // down — would otherwise leave the row ONGOING forever.
    if (this.matchId) {
      void matchRecorder.finished(this.matchId, new Date(), 'ABORTED');
      this.matchId = null;
    }
  }

  /** True when this room was created for solo play. */
  private get hasBots(): boolean {
    return [...this.state.players.values()].some((player) => player.isBot);
  }

  /** Seats in join order, which is also the turn order. */
  private get seatedPlayers(): PlayerState[] {
    return [...this.state.players.values()].sort((a, b) => a.seat - b.seat);
  }

  /** Scheduling seam: uses the room clock in production, overridden in tests. */
  protected schedule(callback: () => void, delayMs: number): ScheduledTask {
    return this.clock.setTimeout(callback, delayMs);
  }

  private startMatch(): void {
    const seats = this.seatedPlayers.map((player) => player.seat as PlayerColor);

    this.match = new LudoMatch(seats, this.dice);
    this.state.gameState = RoomStatus.Playing;
    this.state.diceValue = 0;
    this.syncTurn();
    this.armTurnTimer();

    // Storing must never hold up a match, so it is not awaited.
    void matchRecorder
      .started({ roomId: this.roomId, gameMode: this.gameMode, startedAt: new Date() })
      .then((id) => {
        this.matchId = id;
      });
  }

  protected handleRollDice(client: Client): void {
    if (!this.requireTurn(client, ClientMessage.RollDice)) {
      return;
    }

    this.onPlayerActed(client.sessionId);
    this.applyRoll(client.sessionId, false);
    this.armTurnTimer();
  }

  protected handleMovePawn(client: Client, payload: MovePawnPayload): void {
    if (!this.requireTurn(client, ClientMessage.MovePawn)) {
      return;
    }

    try {
      this.applyMove(client.sessionId, payload?.pawnIndex, false);
    } catch (error) {
      // An illegal move is a client bug or a cheat attempt; the server state
      // is untouched either way.
      this.reject(client, ClientMessage.MovePawn, (error as Error).message);
      return;
    }

    this.onPlayerActed(client.sessionId);
    this.armTurnTimer();
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

  /** Rolls for the seat whose turn it is and announces the result. */
  private applyRoll(sessionId: string, automated: boolean): void {
    const match = this.match;
    if (!match) {
      return;
    }

    const value = match.roll();
    this.state.diceValue = value;

    this.broadcast(ServerMessage.DiceRolled, {
      value,
      player: sessionId,
      movablePawns: match.legalMoves.map((move) => move.pawnIndex),
      automated,
    });

    // No legal move means the roll already passed the turn on.
    if (match.state.phase === GamePhase.WaitingForRoll) {
      this.syncTurn();
    }
  }

  /** Applies a move; throws when the pawn has no legal move. */
  private applyMove(sessionId: string, pawnIndex: number, automated: boolean): MoveResult {
    const match = this.match;
    if (!match) {
      throw new Error('The match is not running.');
    }

    const result = match.movePawn(pawnIndex);

    this.syncPawns();
    this.state.diceValue = match.state.pendingDie;

    this.broadcast(ServerMessage.PawnMoved, {
      player: sessionId,
      pawnIndex: result.move.pawnIndex,
      newPosition: result.move.to,
      captures: result.captures.map((capture) => ({
        player: this.sessionIdForSeat(capture.playerIndex),
        pawnIndex: capture.pawnIndex,
      })),
      automated,
    });

    if (result.wins) {
      void matchRecorder.finished(this.matchId, new Date(), 'COMPLETED');
      this.matchId = null;
      this.state.gameState = RoomStatus.Finished;
      this.state.winnerSessionId = sessionId;
      this.state.currentTurnSessionId = '';
      this.turnTimer?.clear();
      this.turnTimer = null;
      return result;
    }

    this.syncTurn();
    return result;
  }

  /**
   * Arms the timer for whoever has to act next: a short bot delay when that
   * seat is disconnected or already flagged away, the full turn timeout
   * otherwise.
   */
  private armTurnTimer(): void {
    this.turnTimer?.clear();
    this.turnTimer = null;

    if (!this.match || this.state.gameState !== RoomStatus.Playing) {
      return;
    }

    const sessionId = this.state.currentTurnSessionId;
    const player = this.state.players.get(sessionId);
    if (!player) {
      return;
    }

    const takenOver = player.isBot || !player.connected || player.afk;
    const delay = takenOver ? BOT_ACTION_DELAY_MS : this.turnTimeoutMs;

    this.turnTimer = this.schedule(() => {
      if (!takenOver) {
        this.flagMissedTurn(sessionId);
      }

      this.playAutomaticTurn(sessionId);
    }, delay);
  }

  /** Counts a missed turn and flags the player away once they add up. */
  private flagMissedTurn(sessionId: string): void {
    const player = this.state.players.get(sessionId);
    if (!player) {
      return;
    }

    const missed = (this.missedTurns.get(sessionId) ?? 0) + 1;
    this.missedTurns.set(sessionId, missed);

    if (missed >= AFK_STRIKE_LIMIT && !player.afk) {
      player.afk = true;
      this.broadcast(ServerMessage.PlayerAfk, { player: sessionId, missedTurns: missed });
    }
  }

  /** Plays a whole turn for an absent player, including any extra rolls. */
  private playAutomaticTurn(sessionId: string): void {
    const match = this.match;
    if (!match || this.state.currentTurnSessionId !== sessionId) {
      return;
    }

    if (match.state.phase === GamePhase.WaitingForRoll) {
      this.applyRoll(sessionId, true);
    }

    if (
      match.state.phase === GamePhase.WaitingForMove &&
      this.state.currentTurnSessionId === sessionId
    ) {
      const move = pickBotMove(
        match.state,
        match.state.currentPlayerIndex,
        match.legalMoves,
        this.botDifficulty,
      );
      this.applyMove(sessionId, move.pawnIndex, true);
    }

    // An extra roll, or the next seat's turn, is armed the same way.
    this.armTurnTimer();
  }

  /** A player acting clears their strikes and any away flag. */
  private onPlayerActed(sessionId: string): void {
    this.missedTurns.set(sessionId, 0);
    this.clearAfk(sessionId);
  }

  private clearAfk(sessionId: string): void {
    const player = this.state.players.get(sessionId);
    if (!player?.afk) {
      return;
    }

    player.afk = false;
    this.missedTurns.set(sessionId, 0);
    this.broadcast(ServerMessage.PlayerReturned, { player: sessionId });
  }

  /** True only when it really is this client's turn and the phase fits. */
  private requireTurn(client: Client, message: string): boolean {
    if (!this.match || this.state.gameState !== RoomStatus.Playing) {
      this.reject(client, message, 'The match is not running.');
      return false;
    }

    if (this.state.currentTurnSessionId !== client.sessionId) {
      this.reject(client, message, 'It is not your turn.');
      return false;
    }

    const expected =
      message === ClientMessage.RollDice ? GamePhase.WaitingForRoll : GamePhase.WaitingForMove;

    if (this.match.state.phase !== expected) {
      this.reject(client, message, `The match is in ${this.match.state.phase}.`);
      return false;
    }

    return true;
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
