import type { Palette, PicoCADModel } from './types.js';

/** PICO-8's sixteen colours, which picoCAD paints with */
export const PICO8_PALETTE: Palette = [
  [0x00, 0x00, 0x00], [0x1d, 0x2b, 0x53], [0x7e, 0x25, 0x53], [0x00, 0x87, 0x51],
  [0xab, 0x52, 0x36], [0x5f, 0x57, 0x4f], [0xc2, 0xc3, 0xc7], [0xff, 0xf1, 0xe8],
  [0xff, 0x00, 0x4d], [0xff, 0xa3, 0x00], [0xff, 0xec, 0x27], [0x00, 0xe4, 0x36],
  [0x29, 0xad, 0xff], [0x83, 0x76, 0x9c], [0xff, 0x77, 0xa8], [0xff, 0xcc, 0xaa],
];

export interface TextureOptions {
  /**
   * Colours for the sixteen palette indices. Defaults to PICO-8's; pass another to recolour a
   * model into a game's own palette.
   */
  palette?: Palette;
  /** Make the model's alpha colour transparent. Defaults to true. */
  transparency?: boolean;
}

/**
 * The model's texture as RGBA pixels (width × height × 4 bytes), ready for an image or a GPU
 * texture.
 *
 * @example
 * ```ts
 * const rgba = picoCADTexture({}, model);
 * const image = new ImageData(new Uint8ClampedArray(rgba.buffer), 128, 120);
 * ```
 */
export function picoCADTexture(options: TextureOptions, model: PicoCADModel): Uint8Array {
  const palette = options.palette ?? PICO8_PALETTE;
  const transparent = options.transparency ?? true;
  const rgba = new Uint8Array(model.texture.length * 4);

  model.texture.forEach((index, i) => {
    const [r, g, b] = palette[index] ?? [0, 0, 0];

    rgba[i * 4] = r;
    rgba[i * 4 + 1] = g;
    rgba[i * 4 + 2] = b;
    rgba[i * 4 + 3] = transparent && index === model.alpha ? 0 : 255;
  });

  return rgba;
}
