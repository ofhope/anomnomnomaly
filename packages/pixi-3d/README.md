# @anomnomnomaly/pixi-3d

Helpers for [pixi-3d](https://github.com/pixijs/pixi-3d). For now: [picoCAD](https://johanpeitz.itch.io/picocad) models loaded straight into a scene, no conversion step.

Needs `@pixi/3d` and `pixi.js` v8 alongside (peer dependencies).

## picoCAD models

Register the loader once, then load picoCAD saves like any other asset. A model is read once into a `PicoCADSource` (shared geometry, materials and texture), then placed as many times as you like with `createPicoCADModel`, like pixi-3d's `Scene3DSource` and `Model3D`.

```ts
import { Assets, extensions } from 'pixi.js';
import { createPicoCADModel, loadPicoCAD } from '@anomnomnomaly/pixi-3d';
import type { PicoCADSource } from '@anomnomnomaly/pixi-3d';

extensions.add(loadPicoCAD);

const source = await Assets.load<PicoCADSource>({
  src: 'models/station.picocad.txt',
  data: { exclude: [1], normalize: true },
});

scene.addChild(createPicoCADModel(source));
```

Files named `*.picocad` or `*.picocad.txt` are picked up by name. A plain `.txt` needs the parser named: `{ src: 'station.txt', parser: 'loadPicoCAD' }`.

The options in `data` are those of [`@anomnomnomaly/picocad`](../picocad)'s `picoCADMesh` and `picoCADTexture`:

- `exclude`: objects to leave out, by index (0-based), such as a backdrop plane.
- `normalize`: centre the model and scale its longest side to 1.
- `flip`: reverse the winding.
- `palette`: recolour the model with sixteen colours of your own.

The texture is sampled nearest, so it stays pixel-crisp, with the save's transparent colour cut out. Lit faces get a `Material3D`, `noshade` faces a `FlatMaterial`, and `dbl` faces are double-sided.

Without `Assets`, build a source from a parsed model directly:

```ts
import { parsePicoCAD } from '@anomnomnomaly/picocad';
import { createPicoCADModel, picoCADSource } from '@anomnomnomaly/pixi-3d';

const source = picoCADSource({ normalize: true }, parsePicoCAD(text));
```
