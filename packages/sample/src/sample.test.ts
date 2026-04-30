import { describe, it, expect } from 'vitest';
import { xoshiro256 } from '@anomnomnomaly/prng';
import {
  poissonDisk,
  delaunayTriangulate,
  delaunayEdges,
  voronoiCells,
  halton,
  halton2D,
  vanDerCorput,
} from './index.js';

function rng(seed = 42) { return xoshiro256({ seed }); }

// ── Poisson disk ───────────────────────────────────────────────────────────────

describe('poissonDisk', () => {
  it('returns at least one point', () => {
    const pts = poissonDisk({ width: 200, height: 200, minDistance: 20 }, rng());
    expect(pts.length).toBeGreaterThan(0);
  });

  it('all points are within bounds', () => {
    const pts = poissonDisk({ width: 300, height: 200, minDistance: 25 }, rng());
    for (const p of pts) {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThan(300);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeLessThan(200);
    }
  });

  it('satisfies minimum distance invariant', () => {
    const minDist = 30;
    const pts = poissonDisk({ width: 400, height: 300, minDistance: minDist }, rng());
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const dx = pts[i].x - pts[j].x;
        const dy = pts[i].y - pts[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        expect(dist).toBeGreaterThanOrEqual(minDist - 1e-6);
      }
    }
  });

  it('is deterministic for the same seed', () => {
    const a = poissonDisk({ width: 200, height: 200, minDistance: 20 }, rng(1));
    const b = poissonDisk({ width: 200, height: 200, minDistance: 20 }, rng(1));
    expect(a).toEqual(b);
  });
});

// ── Delaunay ───────────────────────────────────────────────────────────────────

describe('delaunayTriangulate', () => {
  it('returns empty array for < 3 points', () => {
    expect(delaunayTriangulate([])).toEqual([]);
    expect(delaunayTriangulate([{ x: 0, y: 0 }])).toEqual([]);
    expect(delaunayTriangulate([{ x: 0, y: 0 }, { x: 1, y: 0 }])).toEqual([]);
  });

  it('triangulates a simple triangle', () => {
    const pts = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }];
    const tris = delaunayTriangulate(pts);
    expect(tris).toHaveLength(1);
    const tri = tris[0];
    expect(new Set(tri).size).toBe(3); // all distinct indices
    expect(Math.max(...tri)).toBeLessThan(3);
  });

  it('satisfies the empty circumcircle property', () => {
    const pts = poissonDisk({ width: 200, height: 200, minDistance: 20 }, rng());
    const tris = delaunayTriangulate(pts);

    // For each triangle, no other point should lie inside its circumcircle
    for (const [a, b, c] of tris) {
      const pa = pts[a], pb = pts[b], pc = pts[c];
      const ax = pa.x - pc.x, ay = pa.y - pc.y;
      const bx = pb.x - pc.x, by = pb.y - pc.y;
      const D = 2 * (ax * by - ay * bx);
      if (Math.abs(D) < 1e-8) continue;
      const ux = (by * (ax * ax + ay * ay) - ay * (bx * bx + by * by)) / D;
      const uy = (ax * (bx * bx + by * by) - bx * (ax * ax + ay * ay)) / D;
      const cx2 = pc.x + ux, cy2 = pc.y + uy;
      const r2 = ux * ux + uy * uy;

      for (let i = 0; i < pts.length; i++) {
        if (i === a || i === b || i === c) continue;
        const dx = pts[i].x - cx2, dy = pts[i].y - cy2;
        expect(dx * dx + dy * dy).toBeGreaterThanOrEqual(r2 - 1e-4);
      }
    }
  });

  it('all triangle indices are valid', () => {
    const pts = [
      { x: 0, y: 0 }, { x: 10, y: 0 }, { x: 5, y: 10 }, { x: 5, y: 4 },
    ];
    const tris = delaunayTriangulate(pts);
    for (const [a, b, c] of tris) {
      expect(a).toBeGreaterThanOrEqual(0); expect(a).toBeLessThan(pts.length);
      expect(b).toBeGreaterThanOrEqual(0); expect(b).toBeLessThan(pts.length);
      expect(c).toBeGreaterThanOrEqual(0); expect(c).toBeLessThan(pts.length);
    }
  });
});

describe('delaunayEdges', () => {
  it('returns unique edges', () => {
    const pts = poissonDisk({ width: 200, height: 200, minDistance: 25 }, rng());
    const tris = delaunayTriangulate(pts);
    const edges = delaunayEdges(pts, tris);
    const seen = new Set<string>();
    for (const [u, v] of edges) {
      const key = `${Math.min(u, v)}-${Math.max(u, v)}`;
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
  });
});

// ── Voronoi ────────────────────────────────────────────────────────────────────

describe('voronoiCells', () => {
  it('returns one cell per site', () => {
    const pts = [
      { x: 0, y: 0 }, { x: 10, y: 0 }, { x: 5, y: 10 }, { x: 5, y: 4 },
    ];
    const tris = delaunayTriangulate(pts);
    const cells = voronoiCells(pts, tris);
    expect(cells).toHaveLength(pts.length);
    cells.forEach((cell, i) => expect(cell.siteIndex).toBe(i));
  });
});

// ── Halton ─────────────────────────────────────────────────────────────────────

describe('halton', () => {
  it('halton(0, 2) = 0', () => expect(halton(0, 2)).toBe(0));
  it('halton(1, 2) = 0.5', () => expect(halton(1, 2)).toBeCloseTo(0.5));
  it('halton(2, 2) = 0.25', () => expect(halton(2, 2)).toBeCloseTo(0.25));
  it('halton(3, 2) = 0.75', () => expect(halton(3, 2)).toBeCloseTo(0.75));

  it('halton(1, 3) ≈ 1/3', () => expect(halton(1, 3)).toBeCloseTo(1 / 3));
  it('halton(2, 3) ≈ 2/3', () => expect(halton(2, 3)).toBeCloseTo(2 / 3));

  it('all values in [0, 1)', () => {
    for (let i = 0; i < 100; i++) {
      expect(halton(i, 2)).toBeGreaterThanOrEqual(0);
      expect(halton(i, 2)).toBeLessThan(1);
    }
  });
});

describe('halton2D', () => {
  it('generates the requested number of points', () => {
    expect(halton2D(64)).toHaveLength(64);
  });

  it('all points are in [0, 1)²', () => {
    for (const { x, y } of halton2D(256)) {
      expect(x).toBeGreaterThanOrEqual(0); expect(x).toBeLessThan(1);
      expect(y).toBeGreaterThanOrEqual(0); expect(y).toBeLessThan(1);
    }
  });

  it('is deterministic (no RNG dependency)', () => {
    expect(halton2D(16)).toEqual(halton2D(16));
  });
});

describe('vanDerCorput', () => {
  it('matches halton base 2', () => {
    for (let i = 1; i < 32; i++) {
      expect(vanDerCorput(i)).toBeCloseTo(halton(i, 2), 10);
    }
  });
});
