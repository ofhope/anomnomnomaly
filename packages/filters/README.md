# @anomnomnomaly/filters

Value and color post-processing for the `@anomnomnomaly` suite. Takes the raw output of noise functions and point distributions and shapes it into the colors, masks, and gradients you actually want to render.

## Color

Colors are represented as packed 24-bit integers (`0xRRGGBB`) throughout — consistent with pixi.js and the rest of the suite.

### `lerpColor`

Linear interpolation between two packed colors. `t = 0` returns `a`, `t = 1` returns `b`.

```ts
import { lerpColor } from '@anomnomnomaly/filters';

lerpColor(0xff0000, 0x0000ff, 0.5); // 0x7f007f
```

### `colorRamp`

Builds a smooth gradient from an array of color stops. Returns a function mapping any `t ∈ [0, 1]` to a packed color. Stops need not be pre-sorted.

```ts
import { colorRamp } from '@anomnomnomaly/filters';

const deepSpace = colorRamp([
  { stop: 0.0, color: 0x000011 },
  { stop: 0.4, color: 0x112244 },
  { stop: 0.7, color: 0x7799bb },
  { stop: 1.0, color: 0xffffff },
]);

deepSpace(0.5); // interpolated color at t=0.5
```

Pair with `normalize` from this package to map noise output directly to color:

```ts
const height = fbm(simplex2D(rng), { octaves: 6 });
const color  = (x: number, y: number) =>
  deepSpace(normalize(height(x, y)));
```

### `starPalette`

Maps an `age` value (`0` = young O/B stars, `1` = old K/M stars) to a 6-slot HR-diagram color palette: `[core, armInner, armMid, armOuter, hazeInner, hazeOuter]`. Ported from the galaxy simulation.

```ts
import { starPalette } from '@anomnomnomaly/filters';

const pal = starPalette(0.3); // [0xffffff, 0xe8eeff, ...]
```

### Color conversion helpers

```ts
import { packRGB, unpackRGB, toCSSHex, fromCSSHex } from '@anomnomnomaly/filters';

unpackRGB(0x1a2b3c);          // { r: 26, g: 43, b: 60 }
packRGB({ r: 26, g: 43, b: 60 }); // 0x1a2b3c

toCSSHex(0x1a2b3c);           // '#1a2b3c'
fromCSSHex('#1a2b3c');         // 0x1a2b3c
fromCSSHex('#fff');            // 0xffffff
```

## Scalar transforms

These operate on noise values (typically `[-1, 1]` or `[0, 1]`) and shape them into masks, thresholds, and remapped ranges.

### `remap` / `normalize` / `clamp`

```ts
import { remap, normalize, clamp } from '@anomnomnomaly/filters';

remap(0.5, 0, 1, 0, 255);   // 127.5 — maps from one range to another
normalize(noiseValue);        // [-1, 1] → [0, 1], clamped
clamp(value, 0, 1);           // hard clamp
```

### `threshold` / `smoothstep`

```ts
import { threshold, smoothstep } from '@anomnomnomaly/filters';

threshold(value, 0.5);            // 1 if value >= 0.5, else 0 — hard mask
smoothstep(0.3, 0.7, value);      // smooth 0→1 transition between lo and hi
```

### `bias` / `gain`

Ken Perlin's classic curve-shaping functions. Both take an input in `[0, 1]` and return `[0, 1]`.

```ts
import { bias, gain } from '@anomnomnomaly/filters';

bias(value, 0.25);  // skews the curve toward 0
bias(value, 0.75);  // skews the curve toward 1

gain(value, 0.25);  // pushes values toward the extremes (high contrast)
gain(value, 0.75);  // pulls values toward the centre (low contrast)
```

### `dither`

Adds a random offset to the threshold so the boundary has a natural grain rather than a hard edge. Requires a `RandomFn`.

```ts
import { dither } from '@anomnomnomaly/filters';
import { xoshiro256 } from '@anomnomnomaly/prng';

const rng = xoshiro256({ seed: 42 });

// Returns 0 or 1 — threshold of 0.5 with ±0.1 random spread
dither(noiseValue, 0.5, 0.1, rng);
```
