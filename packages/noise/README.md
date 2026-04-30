# @anomnomnomaly/noise

Coherent noise functions for the `@anomnomnomaly` suite. All functions satisfy the `NoiseFn2D = (x: number, y: number) => number` interface, making them composable with the `fbm` combinator without any adapter code.

## Functions

### `simplex2D` — primary noise primitive

Seeded 2D simplex noise. Produces values in `[-1, 1]`. Fewer directional artifacts than Perlin noise and faster in higher dimensions. The RNG is consumed once at construction to shuffle the permutation table; subsequent calls are stateless.

```ts
import { simplex2D } from '@anomnomnomaly/noise';
import { xoshiro256 } from '@anomnomnomaly/prng';

const rng = xoshiro256({ seed: 42 });
const noise = simplex2D(rng);

noise(0.5, 1.2); // -0.312...
noise(0.5, 1.2); // same value — deterministic
```

### `worley2D` — cellular / Voronoi noise

Returns the distance to the nearest (`f1`) and second-nearest (`f2`) feature point, each normalised to `[0, 1]`. Natural complement to simplex for terrain, cracked surfaces, and cell structures.

```ts
import { worley2D, worley2DAsNoise } from '@anomnomnomaly/noise';

const w = worley2D(rng);
const { f1, f2 } = w(x, y);

// Common combinations:
f1            // cell interiors — smooth gradient toward each centre
f2 - f1       // cell borders — highlights edges
f1 + f2       // organic blobs

// To use with fbm, wrap with worley2DAsNoise (remaps f1 to [-1, 1]):
const wNoise = worley2DAsNoise(rng);
```

### `fbm` — fractional Brownian motion combinator

Stacks octaves of any `NoiseFn2D` with configurable persistence and lacunarity. Because all noise functions share the same signature, `fbm` wraps any of them uniformly. Output is approximately `[-1, 1]`.

```ts
import { fbm, simplex2D, worley2DAsNoise } from '@anomnomnomaly/noise';

// Stack simplex octaves for terrain
const terrain = fbm(simplex2D(rng), {
  octaves:     6,    // layers of detail
  persistence: 0.5,  // amplitude multiplier per octave (roughness)
  lacunarity:  2.0,  // frequency multiplier per octave (detail density)
});

terrain(x, y); // [-1, 1]

// fbm wraps worley just as easily
const cracks = fbm(worley2DAsNoise(rng), { octaves: 4 });
```

## Composition

Because `fbm` returns a `NoiseFn2D`, its output can be fed into another `fbm` or used as a coordinate warp:

```ts
// Domain warping — warp one noise by another for organic, swirling shapes
const base  = simplex2D(rng);
const warp  = simplex2D(rng);
const scale = 1.5;

const warped = (x: number, y: number) =>
  base(x + scale * warp(x, y), y + scale * warp(y, x));
```

## fBm option reference

| Option | Default | Effect |
|---|---|---|
| `octaves` | `6` | Number of noise layers |
| `persistence` | `0.5` | Amplitude × per octave — lower = smoother |
| `lacunarity` | `2.0` | Frequency × per octave — higher = more detail |
| `initialFrequency` | `1.0` | Starting frequency |
