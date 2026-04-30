/**
 * Simplex noise — replaces noisejs / Perlin noise.
 * Fewer directional artifacts, faster in higher dimensions.
 *
 * Adapted from the public-domain implementation by Stefan Gustavson
 * ("Simplex noise demystified", 2005).
 *
 * Call `simplex2D(rng)` to create a seeded NoiseFn2D:
 *
 * ```ts
 * const rng = xoshiro256({ seed: 42 });
 * const noise = simplex2D(rng);
 * const v = noise(0.5, 1.2); // [-1, 1]
 * ```
 */
import type { RandomFn, NoiseFn2D } from '@anomnomnomaly/prng';

// ── gradient table ─────────────────────────────────────────────────────────────

const GRAD2: readonly [number, number][] = [
  [1, 1], [-1, 1], [1, -1], [-1, -1],
  [1, 0], [-1, 0], [1, 0],  [-1, 0],
  [0, 1], [0, -1], [0, 1],  [0, -1],
];

const F2 = 0.5 * (Math.sqrt(3) - 1);
const G2 = (3 - Math.sqrt(3)) / 6;

function dot2(g: readonly [number, number], x: number, y: number): number {
  return g[0] * x + g[1] * y;
}

/**
 * Creates a seeded 2D simplex noise function.
 * The RNG is used once at construction to shuffle the permutation table.
 */
export function simplex2D(rng: RandomFn): NoiseFn2D {
  // Build a shuffled permutation table (256 entries, doubled to avoid index wrapping)
  const perm = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [perm[i], perm[j]] = [perm[j], perm[i]];
  }
  const p = [...perm, ...perm]; // doubled

  return (x: number, y: number): number => {
    // Skew input space
    const s = (x + y) * F2;
    const i = Math.floor(x + s);
    const j = Math.floor(y + s);
    const t = (i + j) * G2;

    // Unskew back to (x, y) space
    const x0 = x - (i - t);
    const y0 = y - (j - t);

    // Determine simplex
    const i1 = x0 > y0 ? 1 : 0;
    const j1 = x0 > y0 ? 0 : 1;

    const x1 = x0 - i1 + G2;
    const y1 = y0 - j1 + G2;
    const x2 = x0 - 1 + 2 * G2;
    const y2 = y0 - 1 + 2 * G2;

    const ii = i & 255;
    const jj = j & 255;
    const gi0 = p[ii + p[jj]] % 12;
    const gi1 = p[ii + i1 + p[jj + j1]] % 12;
    const gi2 = p[ii + 1 + p[jj + 1]] % 12;

    const t0 = 0.5 - x0 * x0 - y0 * y0;
    const n0 = t0 < 0 ? 0 : (t0 * t0) * (t0 * t0) * dot2(GRAD2[gi0], x0, y0);

    const t1 = 0.5 - x1 * x1 - y1 * y1;
    const n1 = t1 < 0 ? 0 : (t1 * t1) * (t1 * t1) * dot2(GRAD2[gi1], x1, y1);

    const t2 = 0.5 - x2 * x2 - y2 * y2;
    const n2 = t2 < 0 ? 0 : (t2 * t2) * (t2 * t2) * dot2(GRAD2[gi2], x2, y2);

    // Scale to approximately [-1, 1]
    return 70 * (n0 + n1 + n2);
  };
}
