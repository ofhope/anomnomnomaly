# @anomnomnomaly/picocad

Read [picoCAD](https://johanpeitz.itch.io/picocad) models: the geometry, the PICO-8 texture, and a GLB for any engine or tool that reads glTF (Blender, three.js, Godot, pixi-3d, …). No dependencies, and it runs in browsers and Node.

## Command line

```sh
npx @anomnomnomaly/picocad info station.txt
npx @anomnomnomaly/picocad to-glb station.txt station.glb --exclude 2 --normalize
```

`info` lists a save's objects. `to-glb` converts it:

- `--exclude 2,3` leaves out objects by number (as `info` lists them). picoCAD scenes often carry a backdrop plane or a reference image that isn't part of the model.
- `--normalize` centres the model and scales its longest side to 1.
- `--flip` reverses the winding, should single-sided faces come out inside-out.

The texture is embedded as a PNG and sampled nearest so it stays pixel-crisp, with the save's transparent colour cut out. `noshade` faces become unlit (`KHR_materials_unlit`), `dbl` faces double-sided, and `notex` faces a plain colour.

## The format

A picoCAD save (`.txt`) is a header line, `picocad;<name>;<zoom>;<background>;<alpha>`, then a Lua table of objects, then after a `%` the 128×120 texture as hex digits, each a PICO-8 palette index.

### `parsePicoCAD`

```ts
import { parsePicoCAD } from '@anomnomnomaly/picocad';

const model = parsePicoCAD(await readFile('station.txt', 'utf8'));

model.objects.map((o) => o.name); // ['cube', 'plane', 'plane']
model.alpha;                      // 11: the transparent colour
```

Faces have 0-based vertex indices, UVs in texture pixels, and the flags `doubleSided`, `unlit`, `untextured` and `priority`.

### `picoCADMesh`

Triangles ready for a vertex buffer, grouped by material: lit or unlit, single- or double-sided, textured or plain. Each face gets a flat normal. picoCAD's y axis points down the screen; the mesh is flipped to y-up.

```ts
const mesh = picoCADMesh({ exclude: [1], normalize: true }, model);

for (const group of mesh.groups) {
  group.positions; // Float32Array, xyz per vertex
  group.normals;   // Float32Array
  group.uvs;       // Float32Array, 0–1
}
```

### `picoCADTexture`

The texture as RGBA bytes. Pass `palette` to recolour a model into your own sixteen colours.

```ts
const rgba = picoCADTexture({}, model);
const image = new ImageData(new Uint8ClampedArray(rgba.buffer), 128, 120);
```

### `picoCADToGLB`

```ts
import { deflateSync } from 'node:zlib';

const glb = picoCADToGLB({ exclude: [1], normalize: true, deflate: deflateSync }, model);
```

`deflate` compresses the embedded PNG. Without it the PNG is stored uncompressed: still valid, just larger (about 60 KB instead of a few).

## In pixi-3d

[`@anomnomnomaly/pixi-3d`](../pixi-3d) loads picoCAD saves straight into a scene, no conversion step.

## Licence

MIT
