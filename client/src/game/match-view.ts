import { type Cell, cellFor } from './board-geometry';

/**
 * A plain snapshot of a match, converted out of the Colyseus schema so the
 * rendering code and its tests never touch the network types.
 */
export interface PlayerView {
  sessionId: string;
  seat: number;
  name: string;
  pawns: number[];
  connected: boolean;
  afk: boolean;
}

export interface MatchView {
  status: string;
  currentTurnSessionId: string;
  diceValue: number;
  winnerSessionId: string;
  players: PlayerView[];
}

/** One pawn, placed on the grid and ready to draw. */
export interface PawnSprite {
  seat: number;
  pawnIndex: number;
  cell: Cell;
  /** True when the pawn belongs to the viewer. */
  mine: boolean;
}

/** Every pawn on the board, in seat order. */
export function pawnSprites(view: MatchView, mySessionId: string): PawnSprite[] {
  const sprites: PawnSprite[] = [];

  for (const player of [...view.players].sort((a, b) => a.seat - b.seat)) {
    player.pawns.forEach((position, pawnIndex) => {
      sprites.push({
        seat: player.seat,
        pawnIndex,
        cell: cellFor(player.seat, pawnIndex, position),
        mine: player.sessionId === mySessionId,
      });
    });
  }

  return sprites;
}

export function isMyTurn(view: MatchView, mySessionId: string): boolean {
  return view.status === 'PLAYING' && view.currentTurnSessionId === mySessionId;
}

/** One line of status text for the header. */
export function statusLine(view: MatchView, mySessionId: string): string {
  if (view.status === 'WAITING') {
    return `Waiting for players (${view.players.length}/2)…`;
  }

  if (view.status === 'FINISHED') {
    return view.winnerSessionId === mySessionId ? 'You win!' : 'Match over.';
  }

  const current = view.players.find((player) => player.sessionId === view.currentTurnSessionId);
  if (!current) {
    return 'Waiting…';
  }

  const who = current.sessionId === mySessionId ? 'Your turn' : `${current.name}'s turn`;
  const away = current.afk ? ' (away — bot playing)' : '';
  const die = view.diceValue > 0 ? ` — rolled ${view.diceValue}` : '';

  return `${who}${away}${die}`;
}
