import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as board from './board';

interface BoardContract {
  mainTrackLength: number;
  homeColumnLength: number;
  pawnsPerPlayer: number;
  yardPosition: number;
  homeColumnEntry: number;
  homePosition: number;
  yardExitRoll: number;
  consecutiveSixesLimit: number;
  seatSpacing: number;
  safeCells: number[];
  seatOrder: string[];
}

describe('board contract', () => {
  // The C# offline engine has its own copy of these rules, so both engines are
  // pinned to shared/board-constants.json. If this fails, one side drifted and
  // the client would start predicting moves the server rejects.
  const contract = JSON.parse(
    readFileSync(join(__dirname, '../../../../shared/board-constants.json'), 'utf8'),
  ) as BoardContract;

  it('matches the shared board constants', () => {
    expect(board.MAIN_TRACK_LENGTH).toBe(contract.mainTrackLength);
    expect(board.HOME_COLUMN_LENGTH).toBe(contract.homeColumnLength);
    expect(board.PAWNS_PER_PLAYER).toBe(contract.pawnsPerPlayer);
    expect(board.YARD_POSITION).toBe(contract.yardPosition);
    expect(board.HOME_COLUMN_ENTRY).toBe(contract.homeColumnEntry);
    expect(board.HOME_POSITION).toBe(contract.homePosition);
    expect(board.YARD_EXIT_ROLL).toBe(contract.yardExitRoll);
    expect(board.CONSECUTIVE_SIXES_LIMIT).toBe(contract.consecutiveSixesLimit);
    expect(board.SEAT_SPACING).toBe(contract.seatSpacing);
    expect([...board.SAFE_CELLS]).toEqual(contract.safeCells);
  });

  it('seats colours in the shared order', () => {
    const seatOrder = contract.seatOrder.map(
      (name) => board.PlayerColor[name as keyof typeof board.PlayerColor],
    );

    expect(seatOrder).toEqual([0, 1, 2, 3]);
  });
});

describe('board topology', () => {
  it('spaces start cells evenly around the track', () => {
    expect(board.startCell(board.PlayerColor.Red)).toBe(0);
    expect(board.startCell(board.PlayerColor.Green)).toBe(13);
    expect(board.startCell(board.PlayerColor.Yellow)).toBe(26);
    expect(board.startCell(board.PlayerColor.Blue)).toBe(39);
  });

  it('wraps absolute positions around the track', () => {
    expect(board.toAbsolute(board.PlayerColor.Green, 0)).toBe(13);
    expect(board.toAbsolute(board.PlayerColor.Green, 44)).toBe(5);
  });

  it('protects every start cell', () => {
    for (const color of [0, 1, 2, 3] as board.PlayerColor[]) {
      expect(board.isSafeCell(board.startCell(color))).toBe(true);
    }
  });

  it('classifies positions by region', () => {
    expect(board.isInYard(board.YARD_POSITION)).toBe(true);
    expect(board.isOnMainTrack(51)).toBe(true);
    expect(board.isOnMainTrack(52)).toBe(false);
    expect(board.isInHomeColumn(52)).toBe(true);
    expect(board.isHome(57)).toBe(true);
    expect(board.isHome(56)).toBe(false);
  });

  it('measures clockwise distance', () => {
    expect(board.trackDistance(20, 23)).toBe(3);
    expect(board.trackDistance(50, 2)).toBe(4);
  });
});
