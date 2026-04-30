/**
 * Mulberry32 — lightweight 32-bit PRNG by Tommy Ettinger.
 *
 * Prefer this when you need a fast, simple generator and period length
 * (2^32) is acceptable. No BigInt; purely integer arithmetic.
 */
import type { RandomFn } from './types.js';

export interface Mulberry32Options {
  /** 32-bit unsigned integer seed. Values outside [0, 2^32) are truncated. */
  seed: number;
}

/**
 * Creates a seeded Mulberry32 generator.
 *
 * @example
 * ```ts
 * const rng = mulberry32({ seed: 0xdeadbeef });
 * const value = rng(); // [0, 1)
 * ```
 */
export function mulberry32(options: Mulberry32Options): RandomFn {
  let s = options.seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let z = Math.imul(s ^ (s >>> 15), 1 | s);
    z ^= z + Math.imul(z ^ (z >>> 7), 61 | z);
    return ((z ^ (z >>> 14)) >>> 0) / 0x100000000;
  };
}
