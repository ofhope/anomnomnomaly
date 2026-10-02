# @anomnomnomaly

A TypeScript monorepo for **procedural generation primitives** — initially powering a space game but designed as a general-purpose engine for generative art, tile maps, and visual tooling.

## Packages

| Package | Description |
|---|---|
| [`@anomnomnomaly/prng`](./packages/prng) | Seeded PRNG engines: xoshiro256\*\*, mulberry32, squirrel3 |
| [`@anomnomnomaly/noise`](./packages/noise) | Coherent noise: simplex2D, worley2D, fBm combinator |
| [`@anomnomnomaly/sample`](./packages/sample) | Spatial distributions: Poisson disk, Delaunay, Voronoi, Halton |
| [`@anomnomnomaly/filters`](./packages/filters) | Post-processing: color interpolation, remap, smoothstep, dithering |
| [`@anomnomnomaly/picocad`](./packages/picocad) | picoCAD models: geometry, PICO-8 textures, GLB export, and a `picocad` command line |
| [`@anomnomnomaly/pixi-3d`](./packages/pixi-3d) | pixi-3d helpers: picoCAD models loaded straight into a scene |

## Design principles

**Injectable RNG.** Every function that needs randomness accepts a `() => number` rather than maintaining internal state or calling `Math.random` directly. Seed once, pass everywhere — reproducibility is free.

```ts
const rng = xoshiro256({ seed: 12345 });
const points = poissonDisk({ width: 800, height: 600, minDistance: 30 }, rng);
```

**Functional, data-last.** Configuration objects come first, the RNG or data comes last, keeping partial application and composition clean.

**Shared type vocabulary.** The core types live in `@anomnomnomaly/prng` and flow through the whole graph:

```ts
type RandomFn  = () => number;
type HashFn    = (position: number, seed?: number) => number;
type NoiseFn2D = (x: number, y: number) => number;
```

Because `simplex2D`, `worley2DAsNoise`, and `fbm` all satisfy `NoiseFn2D`, they compose freely without any adapter code:

```ts
const terrain  = fbm(simplex2D(rng), { octaves: 6, persistence: 0.5 });
const cellular = fbm(worley2DAsNoise(rng), { octaves: 4 });

const v = terrain(x, y); // both call sites identical
```

## Dependency graph

```
@anomnomnomaly/prng
        ↓
@anomnomnomaly/noise
@anomnomnomaly/sample
@anomnomnomaly/filters
```

`noise`, `sample`, and `filters` depend on `prng` for the `RandomFn` interface type. They don't depend on each other, keeping the graph flat and letting consumers install only what they need.

```
@anomnomnomaly/picocad
        ↓
@anomnomnomaly/pixi-3d  (peer: @pixi/3d, pixi.js)
```

`picocad` stands alone, with no dependencies, so it serves any engine. `pixi-3d` builds pixi-3d scenes from it. While `@pixi/3d` is in beta and unpublished, `pixi-3d` develops against a local checkout at `../pixi-3d-beta` (see its `devDependencies`); that checkout needs its type declarations built into `dist/`.

## Development

```sh
npm install
npm run build      # builds prng first, then noise/sample/filters/picocad, then pixi-3d
npm run typecheck  # tsc --noEmit across all packages
npm test           # vitest run across all packages
npm run clean      # removes all dist/ output
```
