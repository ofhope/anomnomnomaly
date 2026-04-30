/**
 * Voronoi tessellation — derived as the dual of the Delaunay triangulation.
 *
 * Given a set of sites, returns for each site the list of vertices
 * that form its Voronoi cell polygon (the circumcentres of surrounding
 * Delaunay triangles).
 *
 * Natural uses: region partitioning, biome maps, tile territories.
 *
 * ```ts
 * const pts = poissonDisk({ width: 800, height: 600, minDistance: 60 }, rng);
 * const tris = delaunayTriangulate(pts);
 * const cells = voronoiCells(pts, tris);
 * // cells[i] = array of { x, y } circumcentre vertices for site i
 * ```
 */
import type { Point2D, Triangle } from './delaunay.js';

export interface VoronoiCell {
  /** Index into the original sites array. */
  siteIndex: number;
  /** Circumcentre vertices of the surrounding Delaunay triangles, in order. */
  vertices: Point2D[];
}

/** Computes the circumcentre of triangle (a, b, c). Returns null for degenerate cases. */
function circumcentre(a: Point2D, b: Point2D, c: Point2D): Point2D | null {
  const ax = a.x, ay = a.y;
  const bx = b.x - ax, by = b.y - ay;
  const cx2 = c.x - ax, cy2 = c.y - ay;
  const D = 2 * (bx * cy2 - by * cx2);
  if (Math.abs(D) < 1e-10) return null;
  const ux = (cy2 * (bx * bx + by * by) - by * (cx2 * cx2 + cy2 * cy2)) / D;
  const uy = (bx * (cx2 * cx2 + cy2 * cy2) - cx2 * (bx * bx + by * by)) / D;
  return { x: ax + ux, y: ay + uy };
}

/**
 * Builds Voronoi cells from a Delaunay triangulation.
 *
 * For each site, collects the circumcentres of all triangles that include
 * it, then sorts them angularly to produce a convex polygon.
 *
 * Note: cells at the convex hull are open (unbounded). Their vertex lists
 * will be shorter; clip them against your viewport as needed.
 */
export function voronoiCells(
  sites: readonly Point2D[],
  tris: readonly Triangle[],
): VoronoiCell[] {
  // Map siteIndex → circumcentre vertices
  const cellMap = new Map<number, Point2D[]>();
  for (let i = 0; i < sites.length; i++) cellMap.set(i, []);

  for (const tri of tris) {
    const cc = circumcentre(sites[tri[0]], sites[tri[1]], sites[tri[2]]);
    if (!cc) continue;
    for (const idx of tri) {
      cellMap.get(idx)!.push(cc);
    }
  }

  return sites.map((site, i) => {
    const verts = cellMap.get(i)!;
    // Sort angularly around the site so vertices form a proper polygon
    verts.sort((a, b) =>
      Math.atan2(a.y - site.y, a.x - site.x) -
      Math.atan2(b.y - site.y, b.x - site.x),
    );
    return { siteIndex: i, vertices: verts };
  });
}
