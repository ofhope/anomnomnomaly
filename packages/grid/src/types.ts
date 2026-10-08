/**
 * Shared types for tile grids.
 *
 * A grid is an array of rows, indexed `grid[y][x]`, holding a number per
 * tile. Functions that build caves and dungeons use `1` for wall and `0`
 * for floor; functions that read a grid take an `isPassable` predicate so
 * any tile vocabulary works.
 */

/** A 2D tile grid, indexed `grid[y][x]`. */
export type TileGrid = number[][];

/** A tile coordinate. */
export interface Point {
  x: number;
  y: number;
}

/** An axis-aligned rectangle of tiles: `x, y` is the top-left tile. */
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Decides whether a tile value can be walked on. */
export type PassableFn = (value: number) => boolean;

/** The default: 0 is floor, anything else blocks. */
export const isFloor: PassableFn = (value) => value === 0;
