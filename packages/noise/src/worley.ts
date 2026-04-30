/**
 * Worley / Cellular noise — produces cracked surfaces, cell structures,
 * and organic patterns. A natural complement to simplex for tile maps
 * and terrain generation.
 *
 * Returns the distance to the nearest (F1) and second-nearest (F2)
 * feature point, normalised to approximately [0, 1]. Common combinations:
 *   - F1          → cell centres (Voronoi-like)
 *   - F2 - F1     → cell borders
 *   - F1 + F2     → smooth organic blobs
 *
 * ```ts
 * const rng = xoshiro256({ seed: 42 });
 * const worley = worley2D(rng);
 * const { f1, f2 } = worley(x, y);
 * const border = f2 - f1; // [0, 1] — highlights cell edges
 * ```
 */
import type { RandomFn, NoiseFn2D } from '@anomnomnomaly/prng';

export interface WorleyResult {
  /** Distance to the nearest feature point, normalised to [0, 1]. */
  f1: number;
  /** Distance to the second-nearest feature point, normalised to [0, 1]. */
  f2: number;
}

export type WorleyFn = (x: number, y: number) => WorleyResult;

// Maximum distance within a 3×3 cell search (diagonal ≈ √2 ≈ 1.414)
const NORM = Math.SQRT2;

/**
 * Creates a seeded 2D Worley noise function.
 *
 * Feature points are scattered deterministically using squirrel3-style
 * hashing so the function is stateless after construction.
 */
export function worley2D(rng: RandomFn): WorleyFn {
  // Build a jitter table: 256 random offsets in [0, 1)
  const jitterX = Float32Array.from({ length: 512 }, () => rng());
  const jitterY = Float32Array.from({ length: 512 }, () => rng());

  return (x: number, y: number): WorleyResult => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);

    let f1 = Infinity;
    let f2 = Infinity;

    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const cx = xi + dx;
        const cy = yi + dy;

        // Hash cell coords to a deterministic index into jitter table
        const h = (((cx * 1619 + cy * 31337) >>> 0) & 511);
        const fpx = cx + jitterX[h];
        const fpy = cy + jitterY[h];

        const dist = Math.hypot(x - fpx, y - fpy);
        if (dist < f1) { f2 = f1; f1 = dist; }
        else if (dist < f2) { f2 = dist; }
      }
    }

    return {
      f1: Math.min(f1 / NORM, 1),
      f2: Math.min(f2 / NORM, 1),
    };
  };
}

/**
 * Convenience wrapper — returns a NoiseFn2D using the F1 distance,
 * remapped to [-1, 1] so it's compatible with the fBm combinator.
 */
export function worley2DAsNoise(rng: RandomFn): NoiseFn2D {
  const w = worley2D(rng);
  return (x: number, y: number) => w(x, y).f1 * 2 - 1;
}
