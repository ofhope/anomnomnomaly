/**
 * picoCAD models in pixi-3d: load a picoCAD save (`.txt`) straight into the scene, no conversion
 *
 * A model is read once into a {@link PicoCADSource} (shared geometry, materials and texture), then
 * placed any number of times with {@link createPicoCADModel}, like pixi-3d's Scene3DSource and
 * Model3D. The texture is sampled nearest, so it stays pixel-crisp, with the model's alpha colour
 * cut out. Lit faces get a `Material3D`, unlit (`noshade`) faces a `FlatMaterial`.
 */
import { Container3D, FlatMaterial, Geometry3D, Material3D, Mesh3D } from '@pixi/3d';
import type { BaseMaterial3D } from '@pixi/3d';
import { DOMAdapter, ExtensionType, LoaderParserPriority, Texture, BufferImageSource } from 'pixi.js';
import type { LoaderParser, ResolvedAsset } from 'pixi.js';
import type { MeshOptions, PicoCADModel, TextureOptions } from '@anomnomnomaly/picocad';
import { PICO8_PALETTE, parsePicoCAD, picoCADMesh, picoCADTexture, TEXTURE_HEIGHT, TEXTURE_WIDTH } from '@anomnomnomaly/picocad';

export interface PicoCADSourceOptions extends MeshOptions, TextureOptions {}

/** A picoCAD model ready to place: geometry, materials and texture, shared by every copy */
export interface PicoCADSource {
  model: PicoCADModel;
  texture: Texture;
  /** One per material group, matched by index with {@link materials} */
  geometries: Geometry3D[];
  materials: BaseMaterial3D[];
  /** Frees the GPU resources; copies made from it stop drawing */
  destroy(): void;
}

/**
 * Builds the shared resources for a parsed picoCAD model.
 *
 * @example
 * ```ts
 * const source = picoCADSource({ exclude: [1], normalize: true }, parsePicoCAD(text));
 * scene.addChild(createPicoCADModel(source));
 * ```
 */
export function picoCADSource(options: PicoCADSourceOptions, model: PicoCADModel): PicoCADSource {
  const palette = options.palette ?? PICO8_PALETTE;
  const mesh = picoCADMesh(options, model);
  // pixi-3d's materials expect premultiplied colour (pixi premultiplies images as it uploads them,
  // but not raw pixels), so the cut-out pixels are zeroed here: left as their picoCAD colour, they'd
  // bleed into the edges wherever the GPU blends neighbouring pixels
  const rgba = picoCADTexture(options, model);

  for (let i = 0; i < rgba.length; i += 4) {
    const a = rgba[i + 3] / 255;

    rgba[i] = Math.round(rgba[i] * a);
    rgba[i + 1] = Math.round(rgba[i + 1] * a);
    rgba[i + 2] = Math.round(rgba[i + 2] * a);
  }

  const texture = new Texture({
    source: new BufferImageSource({ resource: rgba, width: TEXTURE_WIDTH, height: TEXTURE_HEIGHT, alphaMode: 'premultiplied-alpha' }),
  });
  const style = texture.source.style;

  // Pixel art: sampled nearest with no mips (as pixi-3d's glTF loader does for a NEAREST sampler),
  // or the cut-out colour bleeds into the edges
  style.magFilter = 'nearest';
  style.minFilter = 'nearest';
  style.mipmapFilter = 'nearest';
  style.addressModeU = 'clamp-to-edge';
  style.addressModeV = 'clamp-to-edge';
  texture.source.autoGenerateMipmaps = false;

  const geometries = mesh.groups.map((g) => new Geometry3D({ positions: g.positions, normals: g.normals, uvs: g.uvs }));
  const materials = mesh.groups.map((g) => {
    const plain = g.color !== null;
    const options = {
      doubleSided: g.doubleSided,
      ...(plain
        ? { baseColor: (palette[g.color!] ?? [0, 0, 0]).reduce((c, v) => (c << 8) | v, 0) }
        : { baseColorTexture: texture, alphaMode: 'mask' as const, alphaCutoff: 0.5 }),
    };

    return g.unlit ? new FlatMaterial(options) : new Material3D({ ...options, roughness: 0.9, metallic: 0 });
  });

  return {
    model,
    texture,
    geometries,
    materials,
    destroy() {
      for (const m of materials) m.destroy();
      for (const g of geometries) g.destroy();
      texture.destroy(true);
    },
  };
}

/**
 * A copy of a picoCAD model to place in a scene: a container of meshes sharing the source's
 * geometry and materials, so copies are cheap.
 */
export function createPicoCADModel(source: PicoCADSource): Container3D {
  const root = new Container3D({ label: source.model.name || 'picocad' });

  source.geometries.forEach((geometry, i) => root.addChild(new Mesh3D({ geometry, material: source.materials[i] })));

  return root;
}

/**
 * Lets pixi's `Assets` load picoCAD saves as {@link PicoCADSource}s. Files named `*.picocad` or
 * `*.picocad.txt` are picked up by name; a plain `.txt` needs the parser named. Options go in the
 * asset's `data`.
 *
 * @example
 * ```ts
 * import { extensions, Assets } from 'pixi.js';
 * extensions.add(loadPicoCAD);
 *
 * const source = await Assets.load<PicoCADSource>({
 *   src: 'models/station.txt',
 *   parser: 'loadPicoCAD',
 *   data: { exclude: [1], normalize: true },
 * });
 * scene.addChild(createPicoCADModel(source));
 * ```
 */
export const loadPicoCAD = {
  extension: { type: ExtensionType.LoadParser, priority: LoaderParserPriority.Normal, name: 'loadPicoCAD' },
  name: 'loadPicoCAD',
  id: 'loadPicoCAD',
  test: (url: string) => /\.picocad(\.txt)?$/i.test(url.split(/[?#]/)[0]),
  async load(url: string, asset?: ResolvedAsset<PicoCADSourceOptions>) {
    const response = await DOMAdapter.get().fetch(url);

    if (!response.ok) throw new Error(`picoCAD model ${url}: ${response.status}`);

    return picoCADSource(asset?.data ?? {}, parsePicoCAD(await response.text()));
  },
  unload(source: PicoCADSource) {
    source.destroy();
  },
} satisfies LoaderParser<PicoCADSource, PicoCADSourceOptions>;
