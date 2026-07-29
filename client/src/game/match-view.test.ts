import { describe, expect, it } from 'vitest';
import { type MatchView, isMyTurn, pawnSprites, statusLine } from './match-view';

function view(overrides: Partial<MatchView> = {}): MatchView {
  return {
    status: 'PLAYING',
    currentTurnSessionId: 'me',
    diceValue: 0,
    winnerSessionId: '',
    players: [
      {
        sessionId: 'me',
        seat: 0,
        name: 'Red',
        pawns: [-1, 0, 57, 30],
        connected: true,
        afk: false,
      },
      {
        sessionId: 'them',
        seat: 1,
        name: 'Green',
        pawns: [-1, -1, -1, -1],
        connected: true,
        afk: false,
      },
    ],
    ...overrides,
  };
}

describe('match view', () => {
  it('places every pawn of every seat', () => {
    const sprites = pawnSprites(view(), 'me');

    expect(sprites).toHaveLength(8);
    expect(sprites.filter((sprite) => sprite.mine)).toHaveLength(4);
  });

  it('places a pawn on the track where the rules say it is', () => {
    const onStart = pawnSprites(view(), 'me').find(
      (sprite) => sprite.seat === 0 && sprite.pawnIndex === 1,
    );

    // Red's pawn 1 is at relative 0, which is Red's start cell.
    expect(onStart?.cell).toEqual({ x: 1, y: 6 });
  });

  it('knows whose turn it is', () => {
    expect(isMyTurn(view(), 'me')).toBe(true);
    expect(isMyTurn(view(), 'them')).toBe(false);
    expect(isMyTurn(view({ status: 'WAITING' }), 'me')).toBe(false);
  });

  it('describes the wait before a match starts', () => {
    expect(statusLine(view({ status: 'WAITING', players: [] }), 'me')).toContain('0/2');
  });

  it('names the player whose turn it is, and the die once rolled', () => {
    expect(statusLine(view({ currentTurnSessionId: 'them' }), 'me')).toBe("Green's turn");
    expect(statusLine(view({ diceValue: 4 }), 'me')).toBe('Your turn — rolled 4');
  });

  it('says when the bot is covering an absent player', () => {
    const away = view({ currentTurnSessionId: 'them' });
    away.players[1].afk = true;

    expect(statusLine(away, 'me')).toContain('bot playing');
  });

  it('announces the winner', () => {
    expect(statusLine(view({ status: 'FINISHED', winnerSessionId: 'me' }), 'me')).toBe('You win!');
    expect(statusLine(view({ status: 'FINISHED', winnerSessionId: 'them' }), 'me')).toBe(
      'Match over.',
    );
  });
});
