/**
 * xoshiro256** — 256-bit state, excellent statistical quality, period 2^256 - 1.
 *
 * The default PRNG recommendation for all @anomnomnomaly packages.
 * Uses BigInt for correct 64-bit arithmetic; each call is ~2–5 µs on V8.
 *
 * Reference: Blackman & Vigna, "Scrambled Linear Pseudorandom Number Generators"
 * https://vigna.di.unimi.it/ftp/papers/ScrambledLinear.pdf
 */
import type { RandomFn } from './types.js';

export interface Xoshiro256Options {
  /** Any integer or bigint used to seed the generator. */
  seed: number | bigint;
}

const MASK64 = 0xffffffffffffffffn;

/** splitmix64 — used to expand a single seed into the full 256-bit state. */
function splitmix64(seed: bigint): () => bigint {
  let s = seed & MASK64;
  return () => {
    s = (s + 0x9e3779b97f4a7c15n) & MASK64;
    let z = s;
    z = ((z ^ (z >> 30n)) * 0xbf58476d1ce4e5b9n) & MASK64;
    z = ((z ^ (z >> 27n)) * 0x94d049bb133111ebn) & MASK64;
    return (z ^ (z >> 31n)) & MASK64;
  };
}

function rotl(x: bigint, k: bigint): bigint {
  return (((x << k) | (x >> (64n - k))) & MASK64);
}

/**
 * Creates a seeded xoshiro256** generator.
 *
 * @example
 * ```ts
 * const rng = xoshiro256({ seed: 12345 });
 * const value = rng(); // [0, 1)
 * ```
 */
export function xoshiro256(options: Xoshiro256Options): RandomFn {
  const mix = splitmix64(BigInt(options.seed));
  const s: bigint[] = [mix(), mix(), mix(), mix()];

  return () => {
    const result = (rotl(s[1] * 5n, 7n) * 9n) & MASK64;

    const t = (s[1] << 17n) & MASK64;
    s[2] ^= s[0];
    s[3] ^= s[1];
    s[1] ^= s[2];
    s[0] ^= s[3];
    s[2] ^= t;
    s[3] = rotl(s[3], 45n);

    // Extract top 53 bits for a double in [0, 1)
    return Number(result >> 11n) / 0x20000000000000;
  };
}
