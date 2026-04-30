/**
 * Bowyer-Watson incremental Delaunay triangulation.
 *
 * Replaces the inline implementation in the galaxy simulation.
 * Tested against the empty circumcircle property.
 *
 * Returns index-triples into `pts`; the super-triangle vertices are stripped
 * from the output so all returned indices are valid into the original array.
 *
 * ```ts
 * const pts = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }];
 * const tris = delaunayTriangulate(pts);
 * // tris: [[0, 1, 2]]
 * ```
 */

export interface Point2D {
  x: number;
  y: number;
}

/** An index-triple into the original point array. */
export type Triangle = [number, number, number];

/**
 * Triangulates an array of 2D points using the Bowyer-Watson algorithm.
 * O(n²) in the worst case; fast in practice for typical game/map sizes.
 */
export function delaunayTriangulate(pts: readonly Point2D[]): Triangle[] {
  const n = pts.length;
  if (n < 3) return [];

  // Bounding box
  let minX = pts[0].x, maxX = pts[0].x;
  let minY = pts[0].y, maxY = pts[0].y;
  for (const p of pts) {
    if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y; if (p.y > maxY) maxY = p.y;
  }

  const span = Math.max(maxX - minX, maxY - minY) * 10;
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;

  // Super-triangle vertices appended after real points
  const all: Point2D[] = [
    ...pts,
    { x: cx - span, y: cy - span },
    { x: cx,        y: cy + span },
    { x: cx + span, y: cy - span },
  ];

  let tris: number[][] = [[n, n + 1, n + 2]];

  for (let i = 0; i < n; i++) {
    const p = all[i];
    const bad: number[][] = [];

    for (const tri of tris) {
      const a = all[tri[0]], b = all[tri[1]], c = all[tri[2]];
      const ax = a.x - p.x, ay = a.y - p.y;
      const bx = b.x - p.x, by = b.y - p.y;
      const cx2 = c.x - p.x, cy2 = c.y - p.y;
      const D = 2 * (ax * (by - cy2) + bx * (cy2 - ay) + cx2 * (ay - by));
      if (Math.abs(D) < 1e-10) continue;
      const ux = ((ax * ax + ay * ay) * (by - cy2) + (bx * bx + by * by) * (cy2 - ay) + (cx2 * cx2 + cy2 * cy2) * (ay - by)) / D;
      const uy = ((ax * ax + ay * ay) * (cx2 - bx) + (bx * bx + by * by) * (ax - cx2) + (cx2 * cx2 + cy2 * cy2) * (bx - ax)) / D;
      // P is inside the circumcircle iff |P→center|² < circumradius²
      // i.e. ux²+uy² < (ax-ux)²+(ay-uy)², which simplifies to:
      if (2 * (ax * ux + ay * uy) < ax * ax + ay * ay + 1e-6) bad.push(tri);
    }

    // Boundary polygon of the cavity
    const boundary: [number, number][] = [];
    for (const tri of bad) {
      for (let e = 0; e < 3; e++) {
        const u = tri[e], v = tri[(e + 1) % 3];
        const dup = boundary.findIndex(([a, b]) => a === v && b === u);
        if (dup >= 0) boundary.splice(dup, 1);
        else boundary.push([u, v]);
      }
    }

    tris = tris.filter(t => !bad.includes(t));
    for (const [a, b] of boundary) tris.push([a, b, i]);
  }

  return tris
    .filter(t => t[0] < n && t[1] < n && t[2] < n)
    .map(t => [t[0], t[1], t[2]] as Triangle);
}

/**
 * Returns the unique edges from a Delaunay triangulation.
 * Optionally filters out edges longer than `maxLength`.
 */
export function delaunayEdges(
  pts: readonly Point2D[],
  tris: readonly Triangle[],
  maxLength?: number,
): [number, number][] {
  const seen = new Set<string>();
  const edges: [number, number][] = [];
  const maxLenSq = maxLength !== undefined ? maxLength * maxLength : Infinity;

  for (const [a, b, c] of tris) {
    for (const [u, v] of [[a, b], [b, c], [c, a]] as [number, number][]) {
      const key = `${Math.min(u, v)}-${Math.max(u, v)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const dx = pts[u].x - pts[v].x;
      const dy = pts[u].y - pts[v].y;
      if (dx * dx + dy * dy <= maxLenSq) edges.push([u, v]);
    }
  }

  return edges;
}
