/**
 * picoCAD → glTF binary (GLB), for any engine or tool that reads glTF (Blender, three.js, Godot,
 * pixi-3d, …)
 *
 * The texture is embedded as a PNG and sampled nearest, so it stays pixel-crisp, with the model's
 * alpha colour cut out (alpha mode MASK). Each mesh group becomes a primitive with its own
 * material: unlit faces use KHR_materials_unlit, double-sided faces set doubleSided, and plain
 * (untextured) faces get their PICO-8 colour as a base colour.
 */
import type { MeshOptions, PicoCADMeshGroup } from './mesh.js';
import { picoCADMesh } from './mesh.js';
import type { Deflate } from './png.js';
import { concat, encodePNG } from './png.js';
import type { TextureOptions } from './texture.js';
import { PICO8_PALETTE, picoCADTexture } from './texture.js';
import type { PicoCADModel } from './types.js';
import { TEXTURE_HEIGHT, TEXTURE_WIDTH } from './types.js';

export interface GlbOptions extends MeshOptions, TextureOptions {
  /** Compresses the embedded PNG (e.g. Node's `zlib.deflateSync`); stored uncompressed without */
  deflate?: Deflate;
}

const FLOAT = 5126;
const ARRAY_BUFFER = 34962;
const NEAREST = 9728;
const CLAMP = 33071;

/**
 * Converts a picoCAD model to a GLB file.
 *
 * @example
 * ```ts
 * import { deflateSync } from 'node:zlib';
 * const glb = picoCADToGLB({ exclude: [1], normalize: true, deflate: deflateSync }, model);
 * await writeFile('station.glb', glb);
 * ```
 */
export function picoCADToGLB(options: GlbOptions, model: PicoCADModel): Uint8Array {
  const mesh = picoCADMesh(options, model);
  const palette = options.palette ?? PICO8_PALETTE;
  const png = encodePNG({ deflate: options.deflate }, TEXTURE_WIDTH, TEXTURE_HEIGHT, picoCADTexture(options, model));

  const parts: Uint8Array[] = [];
  const bufferViews: Record<string, unknown>[] = [];
  const accessors: Record<string, unknown>[] = [];
  let offset = 0;

  const view = (bytes: Uint8Array, target?: number) => {
    const pad = (4 - (bytes.length % 4)) % 4;

    bufferViews.push({ buffer: 0, byteOffset: offset, byteLength: bytes.length, ...(target ? { target } : {}) });
    parts.push(bytes, new Uint8Array(pad));
    offset += bytes.length + pad;

    return bufferViews.length - 1;
  };
  const accessor = (values: Float32Array, size: 2 | 3) => {
    const min = Array<number>(size).fill(Infinity);
    const max = Array<number>(size).fill(-Infinity);

    for (let k = 0; k < values.length; k++) {
      min[k % size] = Math.min(min[k % size], values[k]);
      max[k % size] = Math.max(max[k % size], values[k]);
    }
    accessors.push({
      bufferView: view(new Uint8Array(values.buffer, values.byteOffset, values.byteLength), ARRAY_BUFFER),
      componentType: FLOAT,
      count: values.length / size,
      type: size === 3 ? 'VEC3' : 'VEC2',
      min,
      max,
    });

    return accessors.length - 1;
  };

  const image = view(png);
  const material = (g: PicoCADMeshGroup) => {
    const rgb = g.color === null ? null : (palette[g.color] ?? [0, 0, 0]);

    return {
      name: `${g.unlit ? 'unlit' : 'lit'}${g.doubleSided ? '-double' : ''}${g.color === null ? '' : `-c${g.color}`}`,
      pbrMetallicRoughness: {
        ...(rgb ? { baseColorFactor: [...rgb.map(srgbToLinear), 1] } : { baseColorTexture: { index: 0 } }),
        metallicFactor: 0,
        roughnessFactor: 0.9,
      },
      ...(rgb ? {} : { alphaMode: 'MASK', alphaCutoff: 0.5 }),
      doubleSided: g.doubleSided,
      ...(g.unlit ? { extensions: { KHR_materials_unlit: {} } } : {}),
    };
  };

  const primitives = mesh.groups.map((g, i) => ({
    attributes: { POSITION: accessor(g.positions, 3), NORMAL: accessor(g.normals, 3), TEXCOORD_0: accessor(g.uvs, 2) },
    material: i,
  }));
  const bin = concat(parts);
  const gltf = {
    asset: { version: '2.0', generator: '@anomnomnomaly/picocad' },
    ...(mesh.groups.some((g) => g.unlit) ? { extensionsUsed: ['KHR_materials_unlit'] } : {}),
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ name: model.name || 'picocad', mesh: 0 }],
    meshes: [{ primitives }],
    materials: mesh.groups.map(material),
    samplers: [{ magFilter: NEAREST, minFilter: NEAREST, wrapS: CLAMP, wrapT: CLAMP }],
    images: [{ bufferView: image, mimeType: 'image/png' }],
    textures: [{ source: 0, sampler: 0 }],
    bufferViews,
    accessors,
    buffers: [{ byteLength: bin.length }],
  };

  // The JSON chunk is padded with spaces to a 4-byte boundary (counted in bytes, not characters)
  const encoded = new TextEncoder().encode(JSON.stringify(gltf));
  const jsonBytes = concat([encoded, new Uint8Array((4 - (encoded.length % 4)) % 4).fill(0x20)]);
  const header = new Uint8Array(12);
  const head = new DataView(header.buffer);

  head.setUint32(0, 0x46546c67, true); // 'glTF'
  head.setUint32(4, 2, true);
  head.setUint32(8, 12 + 8 + jsonBytes.length + 8 + bin.length, true);

  return concat([header, chunkHeader(jsonBytes.length, 0x4e4f534a), jsonBytes, chunkHeader(bin.length, 0x004e4942), bin]);
}

function chunkHeader(length: number, type: number): Uint8Array {
  const h = new Uint8Array(8);
  const view = new DataView(h.buffer);

  view.setUint32(0, length, true);
  view.setUint32(4, type, true);

  return h;
}

/** glTF base colour factors are linear */
function srgbToLinear(c: number): number {
  const v = c / 255;

  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}
