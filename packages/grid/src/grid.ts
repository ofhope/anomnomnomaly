/**
 * Grid and rectangle basics used by the generators.
 */
import type { Point, Rect, TileGrid } from './types.js';

/**
 * Creates a `width × height` grid filled with `fill`.
 *
 * ```ts
 * const map = createGrid(30, 24, 1); // solid rock, ready to carve
 * ```
 */
export function createGrid(width: number, height: number, fill = 0): TileGrid {
  return Array.from({ length: height }, () => new Array<number>(width).fill(fill));
}

/** True when (x, y) is inside the grid. */
export function inBounds(grid: TileGrid, x: number, y: number): boolean {
  return y >= 0 && y < grid.length && x >= 0 && x < grid[0].length;
}

/** Returns a copy whose rows can be modified without touching the original. */
export function cloneGrid(grid: TileGrid): TileGrid {
  return grid.map((row) => [...row]);
}

/** The centre tile of a rectangle (rounded down). */
export function rectCenter(rect: Rect): Point {
  return {
    x: rect.x + Math.floor(rect.width / 2),
    y: rect.y + Math.floor(rect.height / 2),
  };
}

/**
 * True when two rectangles overlap or come within `padding` tiles of each
 * other. A padding of 1 keeps at least one wall tile between rooms.
 */
export function rectsOverlap(a: Rect, b: Rect, padding = 0): boolean {
  return (
    a.x - padding < b.x + b.width &&
    a.x + a.width + padding > b.x &&
    a.y - padding < b.y + b.height &&
    a.y + a.height + padding > b.y
  );
}

/** Sets every tile inside `rect` to `value`. Tiles outside the grid are skipped. */
export function fillRect(grid: TileGrid, rect: Rect, value = 0): void {
  for (let y = rect.y; y < rect.y + rect.height; y++) {
    for (let x = rect.x; x < rect.x + rect.width; x++) {
      if (inBounds(grid, x, y)) grid[y][x] = value;
    }
  }
}
