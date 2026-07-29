/**
 * Board topology for the authoritative server.
 *
 * Mirrors `LudoBoard` in the C# offline engine; both are tested against
 * `shared/board-constants.json`, which is the source of truth when they differ.
 * Positions are relative to a player's own start cell:
 *
 * - `-1` waiting in the yard
 * - `0..51` on the shared main track
 * - `52..57` in the player's own home column, `57` being home
 */

/** Seats, ordered clockwise; the value decides the start cell. */
export enum PlayerColor {
  Red = 0,
  Green = 1,
  Yellow = 2,
  Blue = 3,
}

export const MAIN_TRACK_LENGTH = 52;
export const HOME_COLUMN_LENGTH = 6;
export const PAWNS_PER_PLAYER = 4;
export const YARD_POSITION = -1;
export const HOME_COLUMN_ENTRY = MAIN_TRACK_LENGTH;
export const HOME_POSITION = MAIN_TRACK_LENGTH + HOME_COLUMN_LENGTH - 1;
export const YARD_EXIT_ROLL = 6;
export const CONSECUTIVE_SIXES_LIMIT = 3;
export const SEAT_SPACING = MAIN_TRACK_LENGTH / 4;

/** Cells on which a pawn cannot be captured. */
export const SAFE_CELLS: readonly number[] = [0, 8, 13, 21, 26, 34, 39, 47];

const SAFE_CELL_LOOKUP = new Set(SAFE_CELLS);

export function startCell(color: PlayerColor): number {
  return color * SEAT_SPACING;
}

export function isOnMainTrack(relativePosition: number): boolean {
  return relativePosition >= 0 && relativePosition < MAIN_TRACK_LENGTH;
}

export function isInHomeColumn(relativePosition: number): boolean {
  return relativePosition >= HOME_COLUMN_ENTRY && relativePosition <= HOME_POSITION;
}

export function isHome(relativePosition: number): boolean {
  return relativePosition === HOME_POSITION;
}

export function isInYard(relativePosition: number): boolean {
  return relativePosition === YARD_POSITION;
}

/** Shared main track index seen by every player. Only valid on the main track. */
export function toAbsolute(color: PlayerColor, relativePosition: number): number {
  return (startCell(color) + relativePosition) % MAIN_TRACK_LENGTH;
}

export function isSafeCell(absolutePosition: number): boolean {
  return SAFE_CELL_LOOKUP.has(absolutePosition);
}

/** Clockwise distance between two main track cells. */
export function trackDistance(from: number, to: number): number {
  return (((to - from) % MAIN_TRACK_LENGTH) + MAIN_TRACK_LENGTH) % MAIN_TRACK_LENGTH;
}
