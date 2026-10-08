import { describe, it, expect } from 'vitest';
import { xoshiro256 } from '@anomnomnomaly/prng';
import { poissonDisk, delaunayTriangulate, delaunayEdges, minimumSpanningTree } from './index.js';

function components(n: number, edges: readonly [number, number][]): number {
  const parent = Array.from({ length: n }, (_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  for (const [a, b] of edges) parent[find(a)] = find(b);
  return new Set(Array.from({ length: n }, (_, i) => find(i))).size;
}

describe('minimumSpanningTree', () => {
  it('connects every point with n - 1 edges', () => {
    const pts = poissonDisk({ width: 400, height: 300, minDistance: 40 }, xoshiro256({ seed: 3 }));
    const tree = minimumSpanningTree(pts, delaunayEdges(pts, delaunayTriangulate(pts)));
    expect(tree.length).toBe(pts.length - 1);
    expect(components(pts.length, tree)).toBe(1);
  });

  it('picks the shortest edges on a known graph', () => {
    // A square with one diagonal: the tree drops the diagonal and one side
    const pts = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 1 }, { x: 0, y: 1 }];
    const edges: [number, number][] = [[0, 1], [1, 2], [2, 3], [3, 0], [0, 2]];
    const tree = minimumSpanningTree(pts, edges);
    const total = tree.reduce((sum, [a, b]) => sum + Math.hypot(pts[a].x - pts[b].x, pts[a].y - pts[b].y), 0);
    expect(tree.length).toBe(3);
    expect(total).toBeCloseTo(12);
  });

  it('returns a spanning forest for disconnected input', () => {
    const pts = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 50, y: 0 }, { x: 51, y: 0 }];
    const tree = minimumSpanningTree(pts, [[0, 1], [2, 3]]);
    expect(tree).toHaveLength(2);
    expect(components(4, tree)).toBe(2);
  });

  it('handles empty and single-point input', () => {
    expect(minimumSpanningTree([], [])).toEqual([]);
    expect(minimumSpanningTree([{ x: 0, y: 0 }], [])).toEqual([]);
  });
});
