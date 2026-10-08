/**
 * Minimum spanning tree — Kruskal's algorithm with a union–find.
 *
 * Connects every point with the shortest total edge length and no loops.
 * Paired with `delaunayEdges` it gives the classic dungeon corridor graph:
 * Delaunay supplies sensible candidate edges between neighbouring rooms,
 * the MST keeps just enough of them to connect everything.
 *
 * ```ts
 * const tris  = delaunayTriangulate(roomCentres);
 * const edges = delaunayEdges(roomCentres, tris);
 * const tree  = minimumSpanningTree(roomCentres, edges);
 * ```
 */
import type { Point2D } from './delaunay.js';

/**
 * Returns the subset of `edges` forming a minimum spanning tree over `pts`,
 * weighted by Euclidean length. Edges are index pairs into `pts`.
 *
 * If the edges don't connect every point the result is a minimum spanning
 * forest: one tree per connected component.
 */
export function minimumSpanningTree(
  pts: readonly Point2D[],
  edges: readonly (readonly [number, number])[],
): [number, number][] {
  const parent = Array.from({ length: pts.length }, (_, i) => i);
  const rank = new Array<number>(pts.length).fill(0);

  // Path halving keeps the trees shallow, so find is close to O(1)
  function find(i: number): number {
    while (parent[i] !== i) {
      parent[i] = parent[parent[i]];
      i = parent[i];
    }
    return i;
  }

  function union(a: number, b: number): boolean {
    let ra = find(a), rb = find(b);
    if (ra === rb) return false;
    if (rank[ra] < rank[rb]) [ra, rb] = [rb, ra];
    parent[rb] = ra;
    if (rank[ra] === rank[rb]) rank[ra]++;
    return true;
  }

  const lengthSq = ([u, v]: readonly [number, number]) => {
    const dx = pts[u].x - pts[v].x;
    const dy = pts[u].y - pts[v].y;
    return dx * dx + dy * dy;
  };

  const sorted = [...edges].sort((a, b) => lengthSq(a) - lengthSq(b));
  const tree: [number, number][] = [];
  for (const [u, v] of sorted) {
    if (union(u, v)) tree.push([u, v]);
    if (tree.length === pts.length - 1) break;
  }
  return tree;
}
