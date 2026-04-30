# @anomnomnomaly/sample

Spatial distribution and computational geometry for the `@anomnomnomaly` suite — Poisson disk sampling, Delaunay triangulation, Voronoi tessellation, and low-discrepancy sequences. All randomised functions accept a `RandomFn` so the caller controls reproducibility.

## Functions

### `poissonDisk` — minimum-distance point distribution

Bridson's algorithm. Generates points with a guaranteed minimum distance between any two, producing natural-looking scatter without clustering. O(n).

```ts
import { poissonDisk } from '@anomnomnomaly/sample';
import { xoshiro256 } from '@anomnomnomaly/prng';

const rng = xoshiro256({ seed: 42 });
const points = poissonDisk(
  { width: 800, height: 600, minDistance: 40 },
  rng,
);
// [{ x, y }, ...] — every pair is at least 40 units apart
```

| Option | Default | Description |
|---|---|---|
| `width` | — | Sampling region width |
| `height` | — | Sampling region height |
| `minDistance` | — | Minimum distance between any two points |
| `maxAttempts` | `30` | Candidates per active point before giving up — higher = denser |

### `delaunayTriangulate` — Delaunay triangulation

Bowyer-Watson incremental algorithm. Returns index-triples into the input array. Satisfies the empty circumcircle property: no point lies inside the circumcircle of any triangle.

```ts
import { delaunayTriangulate, delaunayEdges } from '@anomnomnomaly/sample';

const pts = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 50, y: 100 }, ...];
const tris = delaunayTriangulate(pts);
// [[0, 1, 2], [1, 3, 2], ...] — indices into pts

// Extract unique edges (optionally filtered by max length)
const edges = delaunayEdges(pts, tris, /* maxLength */ 200);
// [[0, 1], [1, 2], ...] — useful for cosmic web filaments, road networks
```

### `voronoiCells` — Voronoi tessellation

Derived as the dual of the Delaunay triangulation — no additional expensive computation. Returns the circumcentre vertices of surrounding triangles for each site, sorted angularly to form a convex polygon.

```ts
import { delaunayTriangulate, voronoiCells } from '@anomnomnomaly/sample';

const tris  = delaunayTriangulate(sites);
const cells = voronoiCells(sites, tris);

for (const { siteIndex, vertices } of cells) {
  // vertices = polygon corners for this Voronoi cell
  // cells at the convex hull are open — clip to your viewport as needed
}
```

A common pipeline for map region generation:

```ts
const sites  = poissonDisk({ width, height, minDistance: 60 }, rng);
const tris   = delaunayTriangulate(sites);
const cells  = voronoiCells(sites, tris);
const edges  = delaunayEdges(sites, tris, 300); // filament connections
```

### `halton` / `halton2D` / `vanDerCorput` — low-discrepancy sequences

Quasi-random sequences that cover the unit square more evenly than pseudo-random sampling — useful for Monte Carlo integration, stratified sampling, and anti-aliased jitter. No RNG dependency; entirely deterministic.

```ts
import { halton, halton2D, vanDerCorput } from '@anomnomnomaly/sample';

// Individual Halton values (base-2 for x, base-3 for y is the standard pairing)
halton(0, 2); // 0
halton(1, 2); // 0.5
halton(2, 2); // 0.25
halton(3, 2); // 0.75

// 64 well-distributed 2D points in [0, 1)²
const pts = halton2D(64);

// Van der Corput — base-2 Halton via bit-reversal (faster for large n)
vanDerCorput(n);
```

Unlike Poisson disk, there is no minimum-distance guarantee, but the low-discrepancy property ensures no large uncovered gaps — and unlike pure PRNG sampling, it converges faster in Monte Carlo contexts.
