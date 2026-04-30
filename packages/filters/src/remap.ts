/**
 * Scalar field transforms — remap, threshold, clamp, and bias/gain.
 *
 * These operate on noise map values (typically [-1, 1] or [0, 1]) and
 * convert them into the shapes you actually want for terrain, biomes,
 * or visual effects.
 *
 * All functions are pure and data-last so they chain cleanly:
 *
 * ```ts
 * const height = remap(noise(x, y), -1, 1, 0, 255);
 * const biome  = threshold(normalize(noise(x, y)), 0.5);
 * ```
 */
import type { RandomFn } from '@anomnomnomaly/prng';

/**
 * Linearly remaps `value` from [inMin, inMax] to [outMin, outMax].
 * Does not clamp — values outside the input range extrapolate linearly.
 */
export function remap(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number,
): number {
  if (inMax === inMin) return outMin;
  return outMin + ((value - inMin) / (inMax - inMin)) * (outMax - outMin);
}

/** Clamps value to [min, max]. */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Remaps and clamps — convenient for converting noise in [-1, 1] to [0, 1].
 *
 * ```ts
 * normalize(noise(x, y)) // [-1, 1] → [0, 1]
 * ```
 */
export function normalize(value: number, inMin = -1, inMax = 1): number {
  return clamp(remap(value, inMin, inMax, 0, 1), 0, 1);
}

/**
 * Hard threshold — returns 1 if value ≥ t, 0 otherwise.
 * Use for binary biome/terrain masks.
 */
export function threshold(value: number, t: number): 0 | 1 {
  return value >= t ? 1 : 0;
}

/**
 * Smooth threshold using the cubic Hermite (smoothstep) function.
 * The transition is smooth over [lo, hi]. Outside this range the
 * value is clamped to 0 or 1.
 */
export function smoothstep(lo: number, hi: number, value: number): number {
  const t = clamp((value - lo) / (hi - lo), 0, 1);
  return t * t * (3 - 2 * t);
}

/**
 * Ken Perlin's bias — skews the distribution toward 0 (bias < 0.5)
 * or toward 1 (bias > 0.5). Input and output in [0, 1].
 */
export function bias(value: number, b: number): number {
  return value / ((1 / b - 2) * (1 - value) + 1);
}

/**
 * Ken Perlin's gain — applies a bias toward the centre or the extremes.
 * Input and output in [0, 1].
 */
export function gain(value: number, g: number): number {
  if (value < 0.5) return bias(value * 2, g) / 2;
  return 1 - bias(2 - value * 2, g) / 2;
}

/**
 * Dithered threshold — adds ordered noise to the threshold so the
 * boundary has a natural, pixelated grain rather than a hard edge.
 * Requires a RandomFn to generate the noise.
 *
 * ```ts
 * const rng = xoshiro256({ seed: 42 });
 * const dithered = dither(value, 0.5, 0.1, rng);
 * ```
 */
export function dither(
  value: number,
  t: number,
  spread: number,
  rng: RandomFn,
): 0 | 1 {
  return threshold(value + (rng() - 0.5) * spread * 2, t);
}
