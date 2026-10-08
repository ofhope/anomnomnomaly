/**
 * Seed helpers — turn text into seeds, and derive independent seeds from one.
 *
 * Players share seeds as words ("ember-falls"), not 53-bit integers, and a
 * generator built from several systems wants one seed per system so that
 * changing one system never shifts the random sequence of another:
 *
 * ```ts
 * const seed = seedFromString('ember-falls');
 * const terrainRng = xoshiro256({ seed: deriveSeed(seed, 'terrain') });
 * const lootRng    = xoshiro256({ seed: deriveSeed(seed, 'loot') });
 * ```
 */

/**
 * Hashes a string to a non-negative integer seed below 2^53.
 *
 * Uses cyrb53 (bryc, public domain): two 32-bit lanes mixed with Math.imul,
 * combined into 53 bits so the result is an exact JavaScript integer. Works
 * as a seed for every generator in this package; mulberry32 keeps the low
 * 32 bits.
 *
 * @example
 * ```ts
 * seedFromString('ember-falls'); // always the same integer
 * ```
 */
export function seedFromString(text: string): number {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < text.length; i++) {
    const ch = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

/**
 * Derives a new seed from a parent seed and a key.
 *
 * The same (seed, key) pair always gives the same result, and different keys
 * give unrelated seeds. Use it to give each system, level or chunk its own
 * generator.
 *
 * @example
 * ```ts
 * const levelSeed = deriveSeed(runSeed, depth);      // one seed per dungeon level
 * const caveSeed  = deriveSeed(levelSeed, 'caves');  // one seed per system
 * ```
 */
export function deriveSeed(seed: number, key: string | number): number {
  return seedFromString(`${seed}:${key}`);
}
