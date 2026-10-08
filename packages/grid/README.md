# @anomnomnomaly/grid

Tile-grid generation for the `@anomnomnomaly` suite: room placement, BSP partitioning, cellular automata caves, region labelling, distance fields and corridors.

A grid is an array of rows indexed `grid[y][x]`. Generators use `1` for wall and `0` for floor; functions that read a grid take an `isPassable` predicate, so any tile vocabulary works. Every function that needs randomness takes a `RandomFn` from `@anomnomnomaly/prng` as its last argument, so the same seed always builds the same map.

```sh
npm install @anomnomnomaly/grid @anomnomnomaly/prng
```

## Rooms

### `placeRooms` — rejection sampling

Propose random rooms; keep each one that doesn't overlap a room already kept.

```ts
import { xoshiro256 } from '@anomnomnomaly/prng';
import { createGrid, placeRooms, fillRect } from '@anomnomnomaly/grid';

const rng = xoshiro256({ seed: 42 });
const rooms = placeRooms({ width: 30, height: 24, attempts: 60, minSize: 3, maxSize: 7 }, rng);

const map = createGrid(30, 24, 1);
for (const room of rooms) fillRect(map, room, 0);
```

| Option | Default | Description |
|---|---|---|
| `attempts` | required | Rooms to propose |
| `minSize`, `maxSize` | required | Room side range, in tiles |
| `maxRooms` | `Infinity` | Stop once this many are kept |
| `padding` | `1` | Minimum wall between rooms |
| `margin` | `1` | Tiles kept clear at the map edge |
| `onCandidate` | | `(room, accepted) => void`, called for every proposal |

### `roomInside` — a random room within an area

Returns a room inside a rectangle (with a margin), or `null` if it can't fit `minSize`. Pairs with BSP leaves.

## BSP

### `bspPartition`, `bspLeaves`, `bspNodes`

Recursively cuts a rectangle in two across its longer side. The leaves tile the area with no overlaps.

```ts
import { bspPartition, bspLeaves, roomInside } from '@anomnomnomaly/grid';

const tree = bspPartition({ width: 30, height: 24, minSize: 6 }, rng);
const rooms = bspLeaves(tree)
  .map((leaf) => roomInside(leaf, { minSize: 3 }, rng))
  .filter((room) => room !== null);
```

| Option | Default | Description |
|---|---|---|
| `minSize` | required | Smallest leaf side |
| `maxDepth` | `Infinity` | Stop splitting at this depth |
| `splitRange` | `[0.35, 0.65]` | Where along a side a cut may fall |
| `aspectLimit` | `1.25` | Nodes longer than this ratio always cut across the long side |

Internal nodes have `left`, `right` and `split`; siblings are natural corridor pairs.

## Cellular automata

### `randomFill`, `cellularStep`, `CAVE_RULE`

```ts
import { randomFill, cellularStep } from '@anomnomnomaly/grid';

let cave = randomFill({ width: 60, height: 40, density: 0.45 }, rng);
for (let i = 0; i < 4; i++) cave = cellularStep(cave); // B5678/S45678
```

`cellularStep(grid, rule, { edge })` returns a new grid. Rules use B/S notation: `{ birth: [5,6,7,8], survive: [4,5,6,7,8] }`. Tiles outside the grid count as wall unless `edge: 0`.

## Regions and distance

```ts
import { floodFill, labelRegions, removeSmallRegions, distanceField, farthestTile } from '@anomnomnomaly/grid';

const { labels, regions } = labelRegions(cave);   // regions[0] is the largest
removeSmallRegions(cave, 12);                      // fill pockets under 12 tiles
const dist = distanceField(cave, [start]);         // BFS steps, Infinity if unreachable
const exit = farthestTile(dist);
```

All use 4-way connectivity. Each takes an optional `isPassable` (default: value `0`).

## Corridors

```ts
import { carveCorridor, connectRegions } from '@anomnomnomaly/grid';

carveCorridor(map, from, to, { horizontalFirst: rng() < 0.5 }); // L-shaped, returns its tiles
connectRegions(cave);  // joins every region to the largest with the shortest corridors
```

## Licence

MIT, © 2026 Alexis Hope.
