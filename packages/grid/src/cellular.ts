/**
 * Cellular automata caves.
 *
 * Fill the grid with random walls, then repeatedly apply a neighbour-count
 * rule to every tile at once. Isolated walls erode, isolated floor fills in,
 * and after a few steps the noise settles into smooth, organic caverns.
 *
 * ```ts
 * let cave = randomFill({ width: 30, height: 24, density: 0.45 }, rng);
 * for (let i = 0; i < 4; i++) cave = cellularStep(cave);
 * ```
 */
import type { RandomFn } from '@anomnomnomaly/prng';
import type { TileGrid } from './types.js';

export interface RandomFillOptions {
  width: number;
  height: number;
  /** Probability that a tile starts as wall (1). Around 0.45 suits caves. */
  density: number;
  /** Make the outermost ring solid wall. Default: true */
  border?: boolean;
}

/** Returns a grid where each tile is wall (1) with probability `density`, else floor (0). */
export function randomFill(options: RandomFillOptions, rng: RandomFn): TileGrid {
  const { width, height, density, border = true } = options;
  return Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x) => {
      if (border && (x === 0 || y === 0 || x === width - 1 || y === height - 1)) return 1;
      return rng() < density ? 1 : 0;
    }),
  );
}

/**
 * A life-like rule in B/S notation: a floor tile becomes wall when its count
 * of wall neighbours is in `birth`; a wall tile stays wall when its count is
 * in `survive`. Neighbours are the 8 surrounding tiles.
 */
export interface CellularRule {
  birth: readonly number[];
  survive: readonly number[];
}

/**
 * B5678/S45678: a tile is wall when at least 5 of the 9 tiles in its 3×3
 * block (itself included) are wall. The standard cave-smoothing rule.
 */
export const CAVE_RULE: CellularRule = { birth: [5, 6, 7, 8], survive: [4, 5, 6, 7, 8] };

export interface CellularStepOptions {
  /** What tiles outside the grid count as. Default: 1, so edges grow walls. */
  edge?: 0 | 1;
}

/** Counts the wall tiles (value 1) among the 8 neighbours of (x, y). */
export function countWallNeighbours(grid: TileGrid, x: number, y: number, edge: 0 | 1 = 1): number {
  let count = 0;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const row = grid[y + dy];
      const v = row === undefined ? undefined : row[x + dx];
      count += v === undefined ? edge : v === 1 ? 1 : 0;
    }
  }
  return count;
}

/**
 * Applies `rule` to every tile and returns a new grid. Every tile reads the
 * old grid, so the result doesn't depend on the order tiles are visited.
 */
export function cellularStep(
  grid: TileGrid,
  rule: CellularRule = CAVE_RULE,
  options: CellularStepOptions = {},
): TileGrid {
  const { edge = 1 } = options;
  return grid.map((row, y) =>
    row.map((tile, x) => {
      const n = countWallNeighbours(grid, x, y, edge);
      return (tile === 1 ? rule.survive : rule.birth).includes(n) ? 1 : 0;
    }),
  );
}
