import { HOME_POSITION, PlayerColor, YARD_POSITION } from './board';
import { ScriptedDiceRoller, SecureDiceRoller } from './dice';
import { LudoMatch } from './ludo-match';
import { countThreats, getCapturableOpponents } from './moves';
import { GamePhase } from './types';

const TWO_PLAYERS = [PlayerColor.Red, PlayerColor.Green];

function newMatch(...dice: number[]): LudoMatch {
  return new LudoMatch(TWO_PLAYERS, new ScriptedDiceRoller(...dice));
}

describe('LudoMatch', () => {
  it('starts with every pawn in the yard', () => {
    const match = newMatch();

    expect(match.state.phase).toBe(GamePhase.WaitingForRoll);
    expect(match.state.positions[0]).toEqual([-1, -1, -1, -1]);
  });

  it('rejects a seating that repeats a colour', () => {
    expect(
      () => new LudoMatch([PlayerColor.Red, PlayerColor.Red], new ScriptedDiceRoller()),
    ).toThrow();
  });

  it('passes the turn on when nothing can move', () => {
    const match = newMatch(3);

    match.roll();

    expect(match.state.currentPlayerIndex).toBe(1);
    expect(match.state.phase).toBe(GamePhase.WaitingForRoll);
  });

  it('releases a pawn on a six and grants another roll', () => {
    const match = newMatch(6);

    match.roll();
    expect(match.legalMoves).toHaveLength(4);

    const result = match.movePawn(0);

    expect(match.state.positions[0][0]).toBe(0);
    expect(result.grantsExtraTurn).toBe(true);
    expect(match.state.currentPlayerIndex).toBe(0);
  });

  it('sends a captured pawn home and grants another roll', () => {
    const match = newMatch(2);
    match.state.positions[0][0] = 3;
    match.state.positions[1][0] = 44;

    match.roll();
    const result = match.movePawn(0);

    expect(result.captures).toEqual([{ playerIndex: 1, pawnIndex: 0 }]);
    expect(match.state.positions[1][0]).toBe(YARD_POSITION);
    expect(result.grantsExtraTurn).toBe(true);
  });

  it('does not capture on a safe cell', () => {
    const match = newMatch(2);
    match.state.positions[0][0] = 6;
    match.state.positions[1][0] = 47;

    match.roll();
    const result = match.movePawn(0);

    expect(result.captures).toHaveLength(0);
    expect(match.state.positions[1][0]).toBe(47);
    expect(match.state.currentPlayerIndex).toBe(1);
  });

  it('requires an exact roll to reach home', () => {
    const overshoot = newMatch(3);
    overshoot.state.positions[0][0] = 55;
    overshoot.roll();

    expect(overshoot.state.currentPlayerIndex).toBe(1);

    const exact = newMatch(2);
    exact.state.positions[0][0] = 55;
    exact.roll();

    expect(exact.legalMoves).toHaveLength(1);
    expect(exact.movePawn(0).move.to).toBe(HOME_POSITION);
  });

  it('forfeits the turn after three sixes', () => {
    const match = newMatch(6, 6, 6);

    match.roll();
    match.movePawn(0);
    match.roll();
    match.movePawn(1);
    match.roll();

    expect(match.state.consecutiveSixes).toBe(0);
    expect(match.state.currentPlayerIndex).toBe(1);
  });

  it('ends the match when the last pawn comes home', () => {
    const match = newMatch(2);
    match.state.positions[0] = [55, HOME_POSITION, HOME_POSITION, HOME_POSITION];

    match.roll();
    const result = match.movePawn(0);

    expect(result.wins).toBe(true);
    expect(result.grantsExtraTurn).toBe(false);
    expect(match.isOver).toBe(true);
    expect(match.state.winnerIndex).toBe(0);
  });

  describe('authoritative validation', () => {
    it('rejects a move before a roll', () => {
      expect(() => newMatch(6).movePawn(0)).toThrow(/Expected phase/);
    });

    it('rejects a second roll before moving', () => {
      const match = newMatch(6, 6);
      match.roll();

      expect(() => match.roll()).toThrow(/Expected phase/);
    });

    it('rejects a pawn that has no legal move', () => {
      const match = newMatch(6);
      match.state.positions[0][1] = HOME_POSITION;
      match.roll();

      expect(() => match.movePawn(1)).toThrow(/no legal move/);
    });

    it('rejects a pawn index that does not exist', () => {
      const match = newMatch(6);
      match.roll();

      expect(() => match.movePawn(99)).toThrow(/no legal move/);
    });
  });
});

describe('threats and captures', () => {
  it('counts an opponent within six cells behind', () => {
    const match = newMatch();
    match.state.positions[1][0] = 40;

    expect(countThreats(match.state, 0, 4)).toBe(1);
  });

  it('ignores an opponent that would turn into its home column', () => {
    const match = newMatch();
    match.state.positions[1][0] = 50;

    expect(countThreats(match.state, 0, 14)).toBe(0);
  });

  it('reports capturable opponents without mutating the board', () => {
    const match = newMatch();
    match.state.positions[1][0] = 44;

    expect(getCapturableOpponents(match.state, 0, 5)).toHaveLength(1);
    expect(match.state.positions[1][0]).toBe(44);
  });
});

describe('SecureDiceRoller', () => {
  it('only ever produces values a die can show', () => {
    const dice = new SecureDiceRoller();
    const seen = new Set<number>();

    for (let i = 0; i < 600; i++) {
      const value = dice.roll();
      expect(value).toBeGreaterThanOrEqual(1);
      expect(value).toBeLessThanOrEqual(6);
      seen.add(value);
    }

    expect(seen.size).toBe(6);
  });
});
