/**
 * Corridors — carving connections between rooms and regions.
 */
import type { PassableFn, Point, TileGrid } from './types.js';
import { isFloor } from './types.js';
import { inBounds } from './grid.js';
import { labelRegions } from './regions.js';

export interface CorridorOptions {
  /** Value written to carved tiles. Default: 0 (floor) */
  value?: number;
  /**
   * Walk along x first, then y. Default: true. Choosing it at random per
   * corridor varies which corner the bend uses.
   */
  horizontalFirst?: boolean;
}

/**
 * Carves an L-shaped corridor from `from` to `to`, in place, and returns the
 * tiles it passes through, in order, including both ends.
 */
export function carveCorridor(
  grid: TileGrid,
  from: Point,
  to: Point,
  options: CorridorOptions = {},
): Point[] {
  const { value = 0, horizontalFirst = true } = options;
  const path: Point[] = [];
  let x = from.x, y = from.y;

  const visit = () => {
    if (inBounds(grid, x, y)) grid[y][x] = value;
    path.push({ x, y });
  };
  const walkX = () => { while (x !== to.x) { x += Math.sign(to.x - x); visit(); } };
  const walkY = () => { while (y !== to.y) { y += Math.sign(to.y - y); visit(); } };

  visit();
  if (horizontalFirst) { walkX(); walkY(); } else { walkY(); walkX(); }
  return path;
}

export interface ConnectRegionsOptions {
  /** Which tiles count as connected floor. Default: value 0 */
  isPassable?: PassableFn;
  /** Value written to carved tiles. Default: 0 */
  value?: number;
}

/**
 * Connects every region to the largest one, in place, and returns the
 * corridors carved.
 *
 * Repeatedly finds the region closest to the main region, takes the closest
 * pair of tiles between them (Manhattan distance, edge tiles only), and
 * carves an L-shaped corridor between that pair. Regions are relabelled
 * after each corridor, so a corridor that happens to cross a third region
 * connects it too. Short corridors keep the original shapes intact.
 */
export function connectRegions(grid: TileGrid, options: ConnectRegionsOptions = {}): Point[][] {
  const { isPassable = isFloor, value = 0 } = options;
  // A corridor that isn't passable would never join anything, and the loop would never end
  if (!isPassable(value)) throw new RangeError('connectRegions: carved value must be passable');
  const corridors: Point[][] = [];

  // Only tiles on a region's edge can be the closest point to another region
  const isEdge = (p: Point) =>
    [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => {
      const x = p.x + dx, y = p.y + dy;
      return !inBounds(grid, x, y) || !isPassable(grid[y][x]);
    });

  // The largest region at the start stays the main one: remember a tile in it
  const first = labelRegions(grid, isPassable);
  if (first.regions.length <= 1) return corridors;
  const anchor = first.regions[0][0];

  for (;;) {
    const { labels, regions } = labelRegions(grid, isPassable);
    if (regions.length <= 1) return corridors;
    const mainId = labels[anchor.y][anchor.x];
    const mainEdge = regions[mainId].filter(isEdge);

    let best = { dist: Infinity, a: anchor, b: anchor };
    regions.forEach((tiles, id) => {
      if (id === mainId) return;
      for (const a of tiles) {
        if (!isEdge(a)) continue;
        for (const b of mainEdge) {
          const dist = Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
          if (dist < best.dist) best = { dist, a, b };
        }
      }
    });
    corridors.push(carveCorridor(grid, best.a, best.b, { value }));
  }
}
