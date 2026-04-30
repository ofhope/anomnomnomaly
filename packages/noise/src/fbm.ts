/**
 * Fractional Brownian Motion (fBm) — a first-class noise combinator.
 *
 * Stacks octaves of *any* NoiseFn2D with configurable persistence and
 * lacunarity. Because all noise functions share the `(x, y) => number`
 * signature, fBm can wrap any of them uniformly:
 *
 * ```ts
 * const fbmNoise = fbm(simplex2D(rng), { octaves: 6, persistence: 0.5 });
 * const v = fbmNoise(x, y); // [-1, 1] approximately
 * ```
 */
import type { NoiseFn2D } from '@anomnomnomaly/prng';

export interface FbmOptions {
  /** Number of octaves to stack. Default: 6 */
  octaves?: number;
  /**
   * Amplitude multiplier per octave (0 < persistence < 1).
   * Lower values → smoother, higher values → rougher. Default: 0.5
   */
  persistence?: number;
  /**
   * Frequency multiplier per octave.
   * Higher values → more detail per octave. Default: 2.0
   */
  lacunarity?: number;
  /** Initial frequency. Default: 1.0 */
  initialFrequency?: number;
}

/**
 * Wraps any NoiseFn2D and stacks `octaves` layers of it.
 * Returns a new NoiseFn2D whose output is approximately in [-1, 1].
 */
export function fbm(noise: NoiseFn2D, options: FbmOptions = {}): NoiseFn2D {
  const {
    octaves = 6,
    persistence = 0.5,
    lacunarity = 2.0,
    initialFrequency = 1.0,
  } = options;

  // Precompute max amplitude for normalization
  let maxAmp = 0;
  let amp = 1.0;
  for (let i = 0; i < octaves; i++) {
    maxAmp += amp;
    amp *= persistence;
  }

  return (x: number, y: number): number => {
    let value = 0;
    let amplitude = 1.0;
    let frequency = initialFrequency;

    for (let i = 0; i < octaves; i++) {
      value += noise(x * frequency, y * frequency) * amplitude;
      frequency *= lacunarity;
      amplitude *= persistence;
    }

    return value / maxAmp;
  };
}
