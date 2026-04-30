export {
  unpackRGB, packRGB, lerpColor,
  toCSSHex, fromCSSHex,
  colorRamp, starPalette,
} from './color.js';
export type { RGB, ColorStop } from './color.js';

export {
  remap, clamp, normalize,
  threshold, smoothstep,
  bias, gain, dither,
} from './remap.js';
