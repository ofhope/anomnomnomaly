/**
 * Distribution helpers built on any RandomFn.
 *
 * A generator returns a float in [0, 1); games want integers in a range,
 * a coin flip, a random element, or a weighted choice. Each helper takes
 * the RandomFn last, matching the rest of the package:
 *
 * ```ts
 * const rng = xoshiro256({ seed: 42 });
 * const width = randomInt(4, 9, rng);           // 4..9 inclusive
 * const enemy = pick(['rat', 'bat', 'slime'], rng);
 * ```
 */
import type { RandomFn } from './types.js';

/** Returns an integer in [min, max], both inclusive. */
export function randomInt(min: number, max: number, rng: RandomFn): number {
  return min + Math.floor(rng() * (max - min + 1));
}

/** Returns a float in [min, max). */
export function randomFloat(min: number, max: number, rng: RandomFn): number {
  return min + rng() * (max - min);
}

/** Returns true with probability `p` (0 never, 1 always). */
export function chance(p: number, rng: RandomFn): boolean {
  return rng() < p;
}

/**
 * Returns a uniformly chosen element. Throws on an empty array, because
 * there is no element to return and `undefined` would hide the bug.
 */
export function pick<T>(items: readonly T[], rng: RandomFn): T {
  if (items.length === 0) throw new RangeError('pick: items is empty');
  return items[Math.floor(rng() * items.length)];
}

/**
 * Returns a shuffled copy using the Fisher–Yates algorithm, so every
 * ordering is equally likely. The input array is not modified.
 */
export function shuffle<T>(items: readonly T[], rng: RandomFn): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export interface WeightedEntry<T> {
  value: T;
  /** Relative weight. Must be ≥ 0; entries with weight 0 are never chosen. */
  weight: number;
}

/**
 * Chooses a value with probability proportional to its weight.
 *
 * @example
 * ```ts
 * const loot = weightedPick([
 *   { value: 'gold',   weight: 70 },
 *   { value: 'potion', weight: 25 },
 *   { value: 'sword',  weight: 5 },
 * ], rng);
 * ```
 */
export function weightedPick<T>(entries: readonly WeightedEntry<T>[], rng: RandomFn): T {
  let total = 0;
  for (const e of entries) total += e.weight;
  if (!(total > 0)) throw new RangeError('weightedPick: total weight must be > 0');

  let r = rng() * total;
  for (const e of entries) {
    if (e.weight <= 0) continue;
    r -= e.weight;
    if (r < 0) return e.value;
  }
  // Floating-point rounding can leave r a hair above 0; return the last valid entry
  for (let i = entries.length - 1; i >= 0; i--) {
    if (entries[i].weight > 0) return entries[i].value;
  }
  throw new RangeError('weightedPick: no entry with positive weight');
}
