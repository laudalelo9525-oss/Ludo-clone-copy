import { PlayerColor } from './board';
import { pickBotMove } from './bot';
import { ScriptedDiceRoller } from './dice';
import { LudoMatch } from './ludo-match';
import { getLegalMoves } from './moves';
import { type MatchState } from './types';

const TWO_PLAYERS = [PlayerColor.Red, PlayerColor.Green];

function newState(): MatchState {
  return new LudoMatch(TWO_PLAYERS, new ScriptedDiceRoller()).state;
}

/** Mirrors the Hard offline opponent's suite, so both stay comparable. */
describe('auto-play bot', () => {
  it('takes a capture over a longer advance', () => {
    const state = newState();
    state.positions[0][0] = 3; // -> 5, taking the Green pawn there
    state.positions[0][1] = 30; // -> 32, further but pointless
    state.positions[1][0] = 44;

    expect(pickBotMove(state, 0, getLegalMoves(state, 0, 2)).pawnIndex).toBe(0);
  });

  it('brings a pawn home when it can', () => {
    const state = newState();
    state.positions[0][0] = 55;
    state.positions[0][1] = 20;

    expect(pickBotMove(state, 0, getLegalMoves(state, 0, 2)).to).toBe(57);
  });

  it('avoids landing in front of an opponent', () => {
    const state = newState();
    state.positions[0][0] = 19; // -> 23, three in front of the Green pawn
    state.positions[0][1] = 9; // -> 13, a starred cell
    state.positions[1][0] = 7;

    expect(pickBotMove(state, 0, getLegalMoves(state, 0, 4)).pawnIndex).toBe(1);
  });

  it('moves a pawn that is already hunted', () => {
    const state = newState();
    state.positions[0][0] = 10; // two in front of the Green pawn
    state.positions[0][1] = 28;
    state.positions[1][0] = 47;

    expect(pickBotMove(state, 0, getLegalMoves(state, 0, 4)).pawnIndex).toBe(0);
  });

  it('only ever returns a move it was offered', () => {
    const state = newState();
    state.positions[0][0] = 12;
    state.positions[0][1] = 30;

    const moves = getLegalMoves(state, 0, 4);

    expect(moves).toContainEqual(pickBotMove(state, 0, moves));
  });

  it('refuses to move when nothing is legal', () => {
    expect(() => pickBotMove(newState(), 0, [])).toThrow(/no legal moves/);
  });

  it('can play a whole match to a winner', () => {
    const match = new LudoMatch(TWO_PLAYERS, {
      // Deterministic without pulling in a seeded RNG: cycles 1..6.
      roll: (() => {
        let n = 0;
        return () => (n++ % 6) + 1;
      })(),
    });

    let turns = 0;
    while (!match.isOver && turns < 20_000) {
      match.roll();
      if (match.legalMoves.length > 0) {
        match.movePawn(
          pickBotMove(match.state, match.state.currentPlayerIndex, match.legalMoves).pawnIndex,
        );
      }
      turns++;
    }

    expect(match.isOver).toBe(true);
    expect(match.hasFinished(match.state.winnerIndex)).toBe(true);
  });
});
