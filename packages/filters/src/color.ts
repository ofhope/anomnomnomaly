/**
 * Color utilities — interpolation, palette mapping, and HR-diagram helpers.
 *
 * All colors are represented as packed 24-bit integers (0xRRGGBB) matching
 * the convention used in pixi.js and the galaxy simulation. Conversion
 * helpers for CSS strings and { r, g, b } objects are also provided.
 *
 * ```ts
 * lerpColor(0xFF0000, 0x0000FF, 0.5) // → 0x7F007F
 *
 * const ramp = colorRamp([
 *   { stop: 0.0, color: 0x000033 },
 *   { stop: 0.5, color: 0x7799BB },
 *   { stop: 1.0, color: 0xFFFFFF },
 * ]);
 * ramp(0.25) // → interpolated color between stop 0 and 0.5
 * ```
 */

export interface RGB {
  r: number;
  g: number;
  b: number;
}

/** Unpack a 0xRRGGBB integer into { r, g, b } (each 0–255). */
export function unpackRGB(color: number): RGB {
  return {
    r: (color >> 16) & 0xff,
    g: (color >> 8) & 0xff,
    b: color & 0xff,
  };
}

/** Pack { r, g, b } (each 0–255, floats rounded) into a 0xRRGGBB integer. */
export function packRGB(c: RGB): number {
  return (
    (Math.round(Math.max(0, Math.min(255, c.r))) << 16) |
    (Math.round(Math.max(0, Math.min(255, c.g))) << 8) |
    Math.round(Math.max(0, Math.min(255, c.b)))
  );
}

/** Linear interpolation between two packed colors. t ∈ [0, 1]. */
export function lerpColor(a: number, b: number, t: number): number {
  const ca = unpackRGB(a);
  const cb = unpackRGB(b);
  return packRGB({
    r: ca.r + (cb.r - ca.r) * t,
    g: ca.g + (cb.g - ca.g) * t,
    b: ca.b + (cb.b - ca.b) * t,
  });
}

/** Convert a packed 0xRRGGBB color to a CSS hex string ("#rrggbb"). */
export function toCSSHex(color: number): string {
  return '#' + (color & 0xffffff).toString(16).padStart(6, '0');
}

/** Parse a CSS hex string ("#rrggbb" or "#rgb") to a packed 0xRRGGBB integer. */
export function fromCSSHex(hex: string): number {
  const s = hex.replace('#', '');
  if (s.length === 3) {
    const r = parseInt(s[0] + s[0], 16);
    const g = parseInt(s[1] + s[1], 16);
    const b = parseInt(s[2] + s[2], 16);
    return (r << 16) | (g << 8) | b;
  }
  return parseInt(s.slice(0, 6), 16);
}

// ── Color ramp ─────────────────────────────────────────────────────────────────

export interface ColorStop {
  /** Position in [0, 1]. */
  stop: number;
  /** Packed 0xRRGGBB color. */
  color: number;
}

/**
 * Builds a smooth color ramp from an array of stops.
 * Returns a function that maps any value in [0, 1] to a packed color.
 * Stops need not be sorted — they are sorted internally.
 *
 * ```ts
 * const ramp = colorRamp([
 *   { stop: 0, color: 0x000022 },
 *   { stop: 1, color: 0xffffff },
 * ]);
 * const c = ramp(0.5); // 0x7F7F7F approximately
 * ```
 */
export function colorRamp(stops: readonly ColorStop[]): (t: number) => number {
  const sorted = [...stops].sort((a, b) => a.stop - b.stop);
  if (sorted.length === 0) return () => 0x000000;
  if (sorted.length === 1) return () => sorted[0].color;

  return (t: number): number => {
    const clamped = Math.max(0, Math.min(1, t));
    if (clamped <= sorted[0].stop) return sorted[0].color;
    if (clamped >= sorted[sorted.length - 1].stop) return sorted[sorted.length - 1].color;

    for (let i = 0; i < sorted.length - 1; i++) {
      const lo = sorted[i], hi = sorted[i + 1];
      if (clamped >= lo.stop && clamped <= hi.stop) {
        const span = hi.stop - lo.stop;
        const localT = span < 1e-10 ? 0 : (clamped - lo.stop) / span;
        return lerpColor(lo.color, hi.color, localT);
      }
    }
    return sorted[sorted.length - 1].color;
  };
}

// ── HR-diagram palette (ported from galaxy simulation) ─────────────────────────

/**
 * Maps an age value (0 = young O/B stars, 1 = old K/M stars) to a 6-slot
 * colour palette matching the Hertzsprung-Russell diagram:
 *
 * `[core, armInner, armMid, armOuter, hazeInner, hazeOuter]`
 *
 * Ported directly from the galaxy simulation's `starPalette` function.
 */
export function starPalette(age: number): readonly number[] {
  const young  = [0xffffff, 0xccddff, 0x8899ee, 0x5566bb, 0x7788cc, 0x5566aa];
  const mature = [0xffffff, 0xffdd88, 0xaabbff, 0x6688cc, 0xffaa77, 0xbb7744];
  const old    = [0xffeebb, 0xff9944, 0xff6633, 0xcc4422, 0xff7733, 0xcc4422];

  const clamped = Math.max(0, Math.min(1, age));
  const src = clamped < 0.5 ? young  : mature;
  const dst = clamped < 0.5 ? mature : old;
  const t   = clamped < 0.5 ? clamped * 2 : (clamped - 0.5) * 2;
  return src.map((c, i) => lerpColor(c, dst[i], t));
}
