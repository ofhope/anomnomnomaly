# @anomnomnomaly/prng

Seeded pseudo-random number generators for the `@anomnomnomaly` suite. Everything else in the monorepo depends on this package.

All generators return a `() => number` producing values in `[0, 1)`, making them interchangeable at the call site.

## Generators

### `xoshiro256` — recommended default

256-bit state, excellent statistical quality, period 2²⁵⁶ − 1. Uses BigInt for correct 64-bit arithmetic. Passes PractRand and other quality test suites.

```ts
import { xoshiro256 } from '@anomnomnomaly/prng';

const rng = xoshiro256({ seed: 12345 });
rng(); // 0.7318...
rng(); // 0.1204...

// BigInt seeds also accepted
const rng2 = xoshiro256({ seed: 0xdeadbeefn });
```

### `mulberry32` — lightweight alternative

32-bit state, no BigInt. Choose this when you need a fast, simple generator and a period of ~4 billion is acceptable — embedded use, hot inner loops, or environments where BigInt is slow.

```ts
import { mulberry32 } from '@anomnomnomaly/prng';

const rng = mulberry32({ seed: 0xdeadbeef });
rng(); // 0.4521...
```

### `squirrel3` — stateless positional hash

Maps `(position, seed) → [0, 1)` without any state. The same inputs always return the same value, making it ideal for tile maps and grid noise where you want `valueAt(x, y)` without threading an RNG through your code.

```ts
import { squirrel3, squirrel3_2d, squirrel3Seeded } from '@anomnomnomaly/prng';

squirrel3(42, seed);          // deterministic hash of position 42
squirrel3_2d(x, y, seed);     // 2D convenience — mixes y in via a large prime
squirrel3Seeded(seed)(pos);   // bound HashFn — useful as a callback
```

## Seeds

Players share seeds as words, not integers. `seedFromString` hashes any string (cyrb53) to an integer seed every generator accepts. `deriveSeed` gives each system, level or chunk its own seed, so changing how one system draws numbers never shifts another.

```ts
import { xoshiro256, seedFromString, deriveSeed } from '@anomnomnomaly/prng';

const seed = seedFromString('ember-falls');
const terrain = xoshiro256({ seed: deriveSeed(seed, 'terrain') });
const loot    = xoshiro256({ seed: deriveSeed(seed, 'loot') });
const level3  = xoshiro256({ seed: deriveSeed(seed, 3) });
```

## Distribution helpers

Each takes the `RandomFn` last.

```ts
import { randomInt, randomFloat, chance, pick, shuffle, weightedPick } from '@anomnomnomaly/prng';

randomInt(4, 9, rng);              // integer, 4..9 inclusive
randomFloat(-1, 1, rng);           // float in [-1, 1)
chance(0.25, rng);                 // true 25% of the time
pick(['rat', 'bat'], rng);         // one element
shuffle(rooms, rng);               // Fisher–Yates; returns a new array
weightedPick([
  { value: 'gold',  weight: 70 },
  { value: 'sword', weight: 5 },
], rng);
```

## Types

These types are defined here and re-exported by all other `@anomnomnomaly` packages.

```ts
/** All generators return this. Interchangeable at the call site. */
type RandomFn = () => number;

/** Stateless positional hash — squirrel3's signature. */
type HashFn = (position: number, seed?: number) => number;

/** All 2D noise functions satisfy this — enables fBm composition. */
type NoiseFn2D = (x: number, y: number) => number;
```

## Choosing a generator

| | xoshiro256 | mulberry32 | squirrel3 |
|---|---|---|---|
| State | 256-bit | 32-bit | none |
| Period | 2²⁵⁶ − 1 | ~4 billion | n/a |
| BigInt | yes | no | no |
| Stateless | no | no | yes |
| Best for | general use | hot loops, simple needs | tile maps, positional noise |
