/**
 * Connectivity — flood fill, region labelling, distance fields.
 *
 * A generator that places tiles at random can't promise every floor tile is
 * reachable. These functions measure it: which tiles connect to which, and
 * how far each one is from a starting point. All use 4-way movement, the
 * movement a tile-stepping player has.
 */
import type { PassableFn, Point, TileGrid } from './types.js';
import { isFloor } from './types.js';
import { inBounds } from './grid.js';

const DIRS: readonly Point[] = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }];

/**
 * Returns every passable tile reachable from `start` (including it), or an
 * empty array if `start` itself isn't passable. Breadth-first, so tiles come
 * out in order of distance from the start.
 */
export function floodFill(grid: TileGrid, start: Point, isPassable: PassableFn = isFloor): Point[] {
  if (!inBounds(grid, start.x, start.y) || !isPassable(grid[start.y][start.x])) return [];
  const seen = grid.map((row) => row.map(() => false));
  const out: Point[] = [start];
  seen[start.y][start.x] = true;
  for (let head = 0; head < out.length; head++) {
    const p = out[head];
    for (const d of DIRS) {
      const x = p.x + d.x, y = p.y + d.y;
      if (inBounds(grid, x, y) && !seen[y][x] && isPassable(grid[y][x])) {
        seen[y][x] = true;
        out.push({ x, y });
      }
    }
  }
  return out;
}

export interface RegionMap {
  /** Region id per tile, `-1` for tiles that aren't passable. */
  labels: number[][];
  /** The tiles of each region, indexed by id, largest first. */
  regions: Point[][];
}

/**
 * Splits the passable tiles into connected regions. Region 0 is always the
 * largest, which is usually the one to keep or to connect everything to.
 */
export function labelRegions(grid: TileGrid, isPassable: PassableFn = isFloor): RegionMap {
  const found: Point[][] = [];
  const claimed = grid.map((row) => row.map(() => false));

  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[y].length; x++) {
      if (claimed[y][x] || !isPassable(grid[y][x])) continue;
      const tiles = floodFill(grid, { x, y }, isPassable);
      for (const t of tiles) claimed[t.y][t.x] = true;
      found.push(tiles);
    }
  }

  found.sort((a, b) => b.length - a.length);
  const labels = grid.map((row) => row.map(() => -1));
  found.forEach((tiles, id) => { for (const t of tiles) labels[t.y][t.x] = id; });
  return { labels, regions: found };
}

/**
 * Fills every region smaller than `minSize` tiles with `fill` (wall by
 * default), in place. Returns how many regions were removed. Cleans up the
 * single-tile pockets cellular automata leave behind.
 */
export function removeSmallRegions(
  grid: TileGrid,
  minSize: number,
  isPassable: PassableFn = isFloor,
  fill = 1,
): number {
  const { regions } = labelRegions(grid, isPassable);
  let removed = 0;
  for (const tiles of regions) {
    if (tiles.length >= minSize) continue;
    for (const t of tiles) grid[t.y][t.x] = fill;
    removed++;
  }
  return removed;
}

/**
 * Breadth-first distance, in steps, from the nearest of `sources` to every
 * tile. Unreachable and impassable tiles are `Infinity`.
 *
 * The farthest reachable tile from the player's start is a natural place
 * for the exit; tiles at a middle distance suit keys and treasure.
 */
export function distanceField(
  grid: TileGrid,
  sources: readonly Point[],
  isPassable: PassableFn = isFloor,
): number[][] {
  const dist = grid.map((row) => row.map(() => Infinity));
  const queue: Point[] = [];
  for (const s of sources) {
    if (inBounds(grid, s.x, s.y) && isPassable(grid[s.y][s.x]) && dist[s.y][s.x] !== 0) {
      dist[s.y][s.x] = 0;
      queue.push(s);
    }
  }
  for (let head = 0; head < queue.length; head++) {
    const p = queue[head];
    for (const d of DIRS) {
      const x = p.x + d.x, y = p.y + d.y;
      if (inBounds(grid, x, y) && dist[y][x] === Infinity && isPassable(grid[y][x])) {
        dist[y][x] = dist[p.y][p.x] + 1;
        queue.push({ x, y });
      }
    }
  }
  return dist;
}

/** Returns the reachable tile with the largest finite distance, or null. */
export function farthestTile(dist: number[][]): Point | null {
  let best: Point | null = null;
  let bestDist = -1;
  for (let y = 0; y < dist.length; y++) {
    for (let x = 0; x < dist[y].length; x++) {
      const d = dist[y][x];
      if (d !== Infinity && d > bestDist) { bestDist = d; best = { x, y }; }
    }
  }
  return best;
}
