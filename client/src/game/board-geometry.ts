/**
 * Turns a pawn's rule position into a cell on the 15x15 Ludo grid.
 *
 * The rules live on the server (`server/src/game/rules`); this module owns only
 * the mapping from a rule position to somewhere on screen, so rendering never
 * has to know how Ludo works and the rules never have to know about pixels.
 *
 * Positions are relative to a player's own start cell, matching
 * `shared/board-constants.json`:
 * `-1` yard, `0..51` main track, `52..57` home column (`57` is home).
 */

export const GRID_SIZE = 15;

export interface Cell {
  /** Column, 0 at the left. */
  x: number;
  /** Row, 0 at the top. */
  y: number;
}

/**
 * The 52 main track cells in play order, starting at Red's start cell and
 * running clockwise. Index into this with a pawn's absolute track position.
 */
const MAIN_TRACK: readonly Cell[] = [
  // Red start, heading up the left-centre column
  { x: 1, y: 6 },
  { x: 2, y: 6 },
  { x: 3, y: 6 },
  { x: 4, y: 6 },
  { x: 5, y: 6 },
  { x: 6, y: 5 },
  { x: 6, y: 4 },
  { x: 6, y: 3 },
  { x: 6, y: 2 },
  { x: 6, y: 1 },
  { x: 6, y: 0 },
  // Green quadrant
  { x: 7, y: 0 },
  { x: 8, y: 0 },
  { x: 8, y: 1 },
  { x: 8, y: 2 },
  { x: 8, y: 3 },
  { x: 8, y: 4 },
  { x: 8, y: 5 },
  { x: 9, y: 6 },
  { x: 10, y: 6 },
  { x: 11, y: 6 },
  { x: 12, y: 6 },
  { x: 13, y: 6 },
  { x: 14, y: 6 },
  // Yellow quadrant
  { x: 14, y: 7 },
  { x: 14, y: 8 },
  { x: 13, y: 8 },
  { x: 12, y: 8 },
  { x: 11, y: 8 },
  { x: 10, y: 8 },
  { x: 9, y: 8 },
  { x: 8, y: 9 },
  { x: 8, y: 10 },
  { x: 8, y: 11 },
  { x: 8, y: 12 },
  { x: 8, y: 13 },
  { x: 8, y: 14 },
  // Blue quadrant
  { x: 7, y: 14 },
  { x: 6, y: 14 },
  { x: 6, y: 13 },
  { x: 6, y: 12 },
  { x: 6, y: 11 },
  { x: 6, y: 10 },
  { x: 6, y: 9 },
  { x: 5, y: 8 },
  { x: 4, y: 8 },
  { x: 3, y: 8 },
  { x: 2, y: 8 },
  { x: 1, y: 8 },
  { x: 0, y: 8 },
  // Back to Red's approach
  { x: 0, y: 7 },
  { x: 0, y: 6 },
];

/** Home column cells per seat, running inward towards the centre. */
const HOME_COLUMNS: readonly (readonly Cell[])[] = [
  [
    { x: 1, y: 7 },
    { x: 2, y: 7 },
    { x: 3, y: 7 },
    { x: 4, y: 7 },
    { x: 5, y: 7 },
    { x: 6, y: 7 },
  ],
  [
    { x: 7, y: 1 },
    { x: 7, y: 2 },
    { x: 7, y: 3 },
    { x: 7, y: 4 },
    { x: 7, y: 5 },
    { x: 7, y: 6 },
  ],
  [
    { x: 13, y: 7 },
    { x: 12, y: 7 },
    { x: 11, y: 7 },
    { x: 10, y: 7 },
    { x: 9, y: 7 },
    { x: 8, y: 7 },
  ],
  [
    { x: 7, y: 13 },
    { x: 7, y: 12 },
    { x: 7, y: 11 },
    { x: 7, y: 10 },
    { x: 7, y: 9 },
    { x: 7, y: 8 },
  ],
];

/** The four parking spots in each seat's yard. */
const YARDS: readonly (readonly Cell[])[] = [
  [
    { x: 1.5, y: 1.5 },
    { x: 3.5, y: 1.5 },
    { x: 1.5, y: 3.5 },
    { x: 3.5, y: 3.5 },
  ],
  [
    { x: 10.5, y: 1.5 },
    { x: 12.5, y: 1.5 },
    { x: 10.5, y: 3.5 },
    { x: 12.5, y: 3.5 },
  ],
  [
    { x: 10.5, y: 10.5 },
    { x: 12.5, y: 10.5 },
    { x: 10.5, y: 12.5 },
    { x: 12.5, y: 12.5 },
  ],
  [
    { x: 1.5, y: 10.5 },
    { x: 3.5, y: 10.5 },
    { x: 1.5, y: 12.5 },
    { x: 3.5, y: 12.5 },
  ],
];

const MAIN_TRACK_LENGTH = 52;
const HOME_COLUMN_ENTRY = 52;
const SEAT_SPACING = 13;

/** Where a seat's pawn sits, given its rule position. */
export function cellFor(seat: number, pawnIndex: number, position: number): Cell {
  assertSeat(seat);

  if (position === -1) {
    const yard = YARDS[seat];
    return yard[clampPawn(pawnIndex, yard.length)];
  }

  if (position >= HOME_COLUMN_ENTRY) {
    const column = HOME_COLUMNS[seat];
    const step = Math.min(position - HOME_COLUMN_ENTRY, column.length - 1);
    return column[step];
  }

  return MAIN_TRACK[toAbsolute(seat, position)];
}

/** Shared track index a seat's relative position maps to. */
export function toAbsolute(seat: number, position: number): number {
  assertSeat(seat);
  return (seat * SEAT_SPACING + position) % MAIN_TRACK_LENGTH;
}

/** Cell of a seat's start square, for highlighting the board. */
export function startCellFor(seat: number): Cell {
  return MAIN_TRACK[toAbsolute(seat, 0)];
}

/** Every main track cell, for drawing the path. */
export function mainTrack(): readonly Cell[] {
  return MAIN_TRACK;
}

/** The six home column cells of a seat, running inward. */
export function homeColumn(seat: number): readonly Cell[] {
  assertSeat(seat);
  return HOME_COLUMNS[seat];
}

/** Top-left corner of a seat's 6x6 yard block. */
export function yardCorner(seat: number): Cell {
  assertSeat(seat);
  return [
    { x: 0, y: 0 },
    { x: 9, y: 0 },
    { x: 9, y: 9 },
    { x: 0, y: 9 },
  ][seat];
}

/** Absolute track indices that cannot be captured on. */
export const SAFE_CELLS: readonly number[] = [0, 8, 13, 21, 26, 34, 39, 47];

function assertSeat(seat: number): void {
  if (!Number.isInteger(seat) || seat < 0 || seat > 3) {
    throw new RangeError(`Seat must be 0..3, got ${seat}.`);
  }
}

function clampPawn(pawnIndex: number, length: number): number {
  return Math.min(Math.max(pawnIndex, 0), length - 1);
}
