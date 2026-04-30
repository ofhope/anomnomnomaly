/**
 * Squirrel3 — stateless positional hash by Squirrel Eiserloh (GDC 2017).
 *
 * Unlike the other generators, squirrel3 carries no state.
 * The same (position, seed) pair always produces the same value,
 * making it ideal for tile maps and noise where you want
 * `valueAt(x, y)` without threading state through your code.
 *
 * Reference: https://www.youtube.com/watch?v=LWFzPP8ZbdU
 */
import type { HashFn } from './types.js';

const NOISE1 = 0xb5297a4d;
const NOISE2 = 0x68e31da4;
const NOISE3 = 0x1b56c4e9;

/**
 * Returns a value in [0, 1) for the given position and optional seed.
 *
 * @example
 * ```ts
 * const v = squirrel3(42, 0);     // [0, 1) — always the same
 * const grid = squirrel3_2d(x, y, seed);
 * ```
 */
export function squirrel3(position: number, seed = 0): number {
  let m = position >>> 0;
  m = (Math.imul(m, NOISE1) + (seed >>> 0)) >>> 0;
  m = (m ^ (m >>> 8)) >>> 0;
  m = (m + NOISE2) >>> 0;
  m = (m ^ (m << 8)) >>> 0;
  m = (Math.imul(m, NOISE3)) >>> 0;
  m = (m ^ (m >>> 8)) >>> 0;
  return m / 0x100000000;
}

/**
 * 2D positional hash — maps (x, y, seed) to [0, 1).
 * Uses large prime to mix the y coordinate into a single 1D position.
 */
export function squirrel3_2d(x: number, y: number, seed = 0): number {
  return squirrel3((x + 198491317 * y) | 0, seed);
}

/**
 * Returns a HashFn with a fixed seed — convenient when passing as a callback.
 *
 * @example
 * ```ts
 * const hash = squirrel3Seeded(42);
 * const tile = hash(x + y * width);
 * ```
 */
export function squirrel3Seeded(seed: number): HashFn {
  return (position) => squirrel3(position, seed);
}
