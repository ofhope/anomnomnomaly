import type { PicoCADModel } from './types.js';
import { TEXTURE_HEIGHT, TEXTURE_WIDTH } from './types.js';

/** Triangles sharing one kind of material, as flat arrays ready for a vertex buffer */
export interface PicoCADMeshGroup {
  unlit: boolean;
  doubleSided: boolean;
  /** A plain-colour group's PICO-8 palette index; null for textured faces */
  color: number | null;
  /** xyz per vertex, three vertices per triangle */
  positions: Float32Array;
  /** One flat normal per face, repeated for each of its vertices */
  normals: Float32Array;
  /** uv per vertex, 0–1 across the texture */
  uvs: Float32Array;
}

export interface PicoCADMesh {
  groups: PicoCADMeshGroup[];
  min: [number, number, number];
  max: [number, number, number];
}

export interface MeshOptions {
  /**
   * Objects to leave out, by index (0-based, in file order). Scenes often carry a backdrop plane
   * or a reference image that isn't part of the model.
   */
  exclude?: number[];
  /** Centre the model on the origin and scale its longest side to 1. Defaults to false. */
  normalize?: boolean;
  /** Reverse every face's winding, should single-sided faces come out inside-out */
  flip?: boolean;
}

/**
 * Builds triangle geometry from a picoCAD model: each face fanned into triangles with a flat
 * normal, grouped by material (lit or unlit, single- or double-sided, textured or plain).
 *
 * picoCAD's y axis points down the screen; it's flipped (with z, keeping the handedness and the
 * winding) so the result is y-up. Object rotations aren't applied: picoCAD bakes rotations into
 * vertex positions.
 *
 * @example
 * ```ts
 * const mesh = picoCADMesh({ exclude: [1], normalize: true }, model);
 * for (const g of mesh.groups) upload(g.positions, g.normals, g.uvs);
 * ```
 */
export function picoCADMesh(options: MeshOptions, model: PicoCADModel): PicoCADMesh {
  const exclude = new Set(options.exclude ?? []);
  const groups = new Map<string, { group: Omit<PicoCADMeshGroup, 'positions' | 'normals' | 'uvs'>; p: number[]; n: number[]; t: number[] }>();

  model.objects.forEach((obj, index) => {
    if (exclude.has(index)) return;

    const [ox, oy, oz] = obj.position;

    for (const face of obj.faces) {
      if (face.vertices.length < 3) continue;

      const color = face.untextured ? face.color : null;
      const key = `${face.unlit}|${face.doubleSided}|${color}`;
      let g = groups.get(key);

      if (!g) {
        g = { group: { unlit: face.unlit, doubleSided: face.doubleSided, color }, p: [], n: [], t: [] };
        groups.set(key, g);
      }

      const corners = face.vertices.map((v, j) => {
        const [x, y, z] = obj.vertices[v];
        const [u, w] = face.uvs[j];

        return { p: [x + ox, -(y + oy), -(z + oz)], t: [u / TEXTURE_WIDTH, w / TEXTURE_HEIGHT] };
      });

      if (options.flip) corners.reverse();

      const normal = newell(corners.map((c) => c.p));

      for (let j = 1; j < corners.length - 1; j++) {
        for (const c of [corners[0], corners[j], corners[j + 1]]) {
          g.p.push(...c.p);
          g.n.push(...normal);
          g.t.push(...c.t);
        }
      }
    }
  });

  const min: [number, number, number] = [Infinity, Infinity, Infinity];
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];

  for (const { p } of groups.values()) {
    for (let k = 0; k < p.length; k++) {
      min[k % 3] = Math.min(min[k % 3], p[k]);
      max[k % 3] = Math.max(max[k % 3], p[k]);
    }
  }

  if (options.normalize && Number.isFinite(min[0])) {
    const size = Math.max(max[0] - min[0], max[1] - min[1], max[2] - min[2]) || 1;
    const mid = [0, 1, 2].map((k) => (max[k] + min[k]) / 2);

    for (const { p } of groups.values()) {
      for (let k = 0; k < p.length; k++) p[k] = (p[k] - mid[k % 3]) / size;
    }
    for (let k = 0; k < 3; k++) {
      min[k] = (min[k] - mid[k]) / size;
      max[k] = (max[k] - mid[k]) / size;
    }
  }

  return {
    groups: [...groups.values()].map(({ group, p, n, t }) => ({
      ...group,
      positions: new Float32Array(p),
      normals: new Float32Array(n),
      uvs: new Float32Array(t),
    })),
    min,
    max,
  };
}

/** A polygon's unit normal by Newell's method, which copes with any planar-ish polygon */
function newell(points: number[][]): [number, number, number] {
  let x = 0;
  let y = 0;
  let z = 0;

  for (let j = 0; j < points.length; j++) {
    const a = points[j];
    const b = points[(j + 1) % points.length];

    x += (a[1] - b[1]) * (a[2] + b[2]);
    y += (a[2] - b[2]) * (a[0] + b[0]);
    z += (a[0] - b[0]) * (a[1] + b[1]);
  }

  const len = Math.hypot(x, y, z) || 1;

  return [x / len, y / len, z / len];
}
