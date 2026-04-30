/**
 * Bridson's Poisson disk sampling — O(n), typed, replaces poisson-disk-sampling.
 *
 * Generates points with a guaranteed minimum distance between any two points.
 * This makes it ideal for placing objects (galaxies, trees, enemies) without
 * clustering. Each new sample is drawn from the provided RandomFn.
 *
 * Reference: Robert Bridson, "Fast Poisson Disk Sampling in Arbitrary Dimensions"
 * SIGGRAPH 2007.
 *
 * ```ts
 * const rng = xoshiro256({ seed: 42 });
 * const points = poissonDisk({ width: 800, height: 600, minDistance: 30 }, rng);
 * // points: Array<{ x: number; y: number }>
 * ```
 */
import type { RandomFn } from '@anomnomnomaly/prng';

export interface PoissonDiskOptions {
  width: number;
  height: number;
  /** Minimum distance between any two samples. */
  minDistance: number;
  /**
   * Candidate samples to generate per active point before giving up.
   * Higher values give denser packing at the cost of more iterations.
   * Default: 30
   */
  maxAttempts?: number;
}

export interface Point2D {
  x: number;
  y: number;
}

/**
 * Runs Bridson's algorithm and returns all accepted sample points.
 * Tested against the minimum-distance invariant.
 */
export function poissonDisk(options: PoissonDiskOptions, rng: RandomFn): Point2D[] {
  const { width, height, minDistance, maxAttempts = 30 } = options;
  const cellSize = minDistance / Math.SQRT2;
  const cols = Math.ceil(width / cellSize);
  const rows = Math.ceil(height / cellSize);

  const grid = new Array<Point2D | null>(cols * rows).fill(null);
  const active: Point2D[] = [];
  const result: Point2D[] = [];

  function gridIndex(p: Point2D): number {
    return Math.floor(p.x / cellSize) + Math.floor(p.y / cellSize) * cols;
  }

  function inBounds(p: Point2D): boolean {
    return p.x >= 0 && p.x < width && p.y >= 0 && p.y < height;
  }

  function isFarEnough(p: Point2D): boolean {
    const gx = Math.floor(p.x / cellSize);
    const gy = Math.floor(p.y / cellSize);
    const x0 = Math.max(0, gx - 2);
    const x1 = Math.min(cols - 1, gx + 2);
    const y0 = Math.max(0, gy - 2);
    const y1 = Math.min(rows - 1, gy + 2);
    for (let cy = y0; cy <= y1; cy++) {
      for (let cx = x0; cx <= x1; cx++) {
        const nb = grid[cx + cy * cols];
        if (nb !== null) {
          const dx = p.x - nb.x;
          const dy = p.y - nb.y;
          if (dx * dx + dy * dy < minDistance * minDistance) return false;
        }
      }
    }
    return true;
  }

  // Seed the first point near the centre
  const first: Point2D = {
    x: width * 0.4 + rng() * width * 0.2,
    y: height * 0.4 + rng() * height * 0.2,
  };
  grid[gridIndex(first)] = first;
  active.push(first);
  result.push(first);

  while (active.length > 0) {
    const idx = Math.floor(rng() * active.length);
    const base = active[idx];
    let found = false;

    for (let k = 0; k < maxAttempts; k++) {
      const angle = rng() * Math.PI * 2;
      const radius = minDistance + rng() * minDistance;
      const candidate: Point2D = {
        x: base.x + Math.cos(angle) * radius,
        y: base.y + Math.sin(angle) * radius,
      };
      if (inBounds(candidate) && isFarEnough(candidate)) {
        grid[gridIndex(candidate)] = candidate;
        active.push(candidate);
        result.push(candidate);
        found = true;
        break;
      }
    }

    if (!found) active.splice(idx, 1);
  }

  return result;
}
