/**
 * A seeded pseudo-random number generator.
 * Returns values uniformly distributed in [0, 1).
 *
 * All generators in this package return this type so they are
 * interchangeable at the call site:
 *
 * ```ts
 * const rng = xoshiro256({ seed: 42 });
 * poissonDiskSample(options, rng);
 * ```
 */
export type RandomFn = () => number;

/**
 * A stateless positional hash mapping (position, seed) → [0, 1).
 * Useful for tile maps and noise where you want `valueAt(x, y)`
 * without carrying state.
 */
export type HashFn = (position: number, seed?: number) => number;

/**
 * A two-dimensional noise function mapping (x, y) → [-1, 1].
 * All noise functions in @anomnomnomaly/noise satisfy this type,
 * making them composable with the fBm combinator.
 */
export type NoiseFn2D = (x: number, y: number) => number;
