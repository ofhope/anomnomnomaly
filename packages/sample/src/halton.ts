/**
 * Low-discrepancy sequences: Halton and Sobol (base-2 x Halton-3 y).
 *
 * These produce quasi-random point sets that cover the unit square more
 * evenly than pseudo-random sampling — useful for:
 *   - Monte Carlo integration (better convergence than pure PRNG)
 *   - Stratified sampling in @statili workloads
 *   - Anti-aliased jitter that still looks random
 *
 * Unlike Poisson disk, there is no minimum-distance guarantee, but the
 * low-discrepancy property ensures no large uncovered gaps.
 *
 * ```ts
 * const seq = haltonSequence({ base: 2 });
 * const x = seq(0); // first sample
 * const y = seq(1); // second sample
 *
 * const points = halton2D(64);
 * // [{ x, y }, ...] — 64 well-distributed points in [0, 1)²
 * ```
 */

/**
 * Returns the n-th term of the Halton sequence for a given base.
 * Both n and base are 0-indexed (n=0 → 0).
 */
export function halton(n: number, base: number): number {
  let result = 0;
  let f = 1;
  let i = n;
  while (i > 0) {
    f /= base;
    result += f * (i % base);
    i = Math.floor(i / base);
  }
  return result;
}

export interface HaltonSequenceOptions {
  /** The prime base for this sequence. base=2 and base=3 are most common. */
  base: number;
}

/**
 * Returns a function that generates the n-th term of the Halton sequence
 * for the configured base. Stateless — call with any index at any time.
 */
export function haltonSequence(options: HaltonSequenceOptions): (n: number) => number {
  const { base } = options;
  return (n) => halton(n, base);
}

export interface HaltonPoint2D {
  x: number;
  y: number;
}

/**
 * Generates `count` 2D Halton points in [0, 1)²
 * using base-2 for x and base-3 for y.
 * This pairing is the standard choice for 2D quasi-random sampling.
 */
export function halton2D(count: number, offset = 0): HaltonPoint2D[] {
  return Array.from({ length: count }, (_, i) => ({
    x: halton(i + offset, 2),
    y: halton(i + offset, 3),
  }));
}

// ── Sobol (base-2 van der Corput + base-2 Halton = same as halton base 2)
// A full Sobol implementation requires direction numbers tables.
// This is a simplified version using the scrambled van der Corput sequence.

/**
 * Van der Corput sequence in base 2 — the 1D foundation of Sobol.
 * Identical to Halton base 2 but computed via bit-reversal for speed.
 */
export function vanDerCorput(n: number): number {
  let bits = n >>> 0;
  bits = ((bits & 0x55555555) << 1) | ((bits & 0xaaaaaaaa) >>> 1);
  bits = ((bits & 0x33333333) << 2) | ((bits & 0xcccccccc) >>> 2);
  bits = ((bits & 0x0f0f0f0f) << 4) | ((bits & 0xf0f0f0f0) >>> 4);
  bits = ((bits & 0x00ff00ff) << 8) | ((bits & 0xff00ff00) >>> 8);
  bits = ((bits << 16) | (bits >>> 16)) >>> 0;
  return bits / 0x100000000;
}
