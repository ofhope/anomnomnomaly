import { describe, it, expect } from 'vitest';
import { xoshiro256 } from '@anomnomnomaly/prng';
import {
  unpackRGB, packRGB, lerpColor, toCSSHex, fromCSSHex, colorRamp, starPalette,
  remap, clamp, normalize, threshold, smoothstep, bias, gain, dither,
} from '../index.js';

function rng(seed = 42) { return xoshiro256({ seed }); }

// ── color ──────────────────────────────────────────────────────────────────────

describe('unpackRGB / packRGB', () => {
  it('round-trips', () => {
    const colors = [0x000000, 0xffffff, 0xff0000, 0x1a2b3c];
    for (const c of colors) {
      expect(packRGB(unpackRGB(c))).toBe(c);
    }
  });

  it('unpacks correctly', () => {
    const { r, g, b } = unpackRGB(0x1a2b3c);
    expect(r).toBe(0x1a);
    expect(g).toBe(0x2b);
    expect(b).toBe(0x3c);
  });
});

describe('lerpColor', () => {
  it('t=0 returns a', () => expect(lerpColor(0xff0000, 0x0000ff, 0)).toBe(0xff0000));
  it('t=1 returns b', () => expect(lerpColor(0xff0000, 0x0000ff, 1)).toBe(0x0000ff));
  it('t=0.5 is midpoint', () => {
    const mid = lerpColor(0x000000, 0xffffff, 0.5);
    const { r, g, b } = unpackRGB(mid);
    expect(r).toBeCloseTo(128, -1);
    expect(g).toBeCloseTo(128, -1);
    expect(b).toBeCloseTo(128, -1);
  });
});

describe('toCSSHex / fromCSSHex', () => {
  it('round-trips', () => {
    expect(fromCSSHex(toCSSHex(0x1a2b3c))).toBe(0x1a2b3c);
    expect(fromCSSHex(toCSSHex(0x000000))).toBe(0x000000);
    expect(fromCSSHex(toCSSHex(0xffffff))).toBe(0xffffff);
  });

  it('parses #rgb shorthand', () => {
    expect(fromCSSHex('#fff')).toBe(0xffffff);
    expect(fromCSSHex('#000')).toBe(0x000000);
  });
});

describe('colorRamp', () => {
  it('returns first stop color at t=0', () => {
    const ramp = colorRamp([{ stop: 0, color: 0xff0000 }, { stop: 1, color: 0x0000ff }]);
    expect(ramp(0)).toBe(0xff0000);
  });

  it('returns last stop color at t=1', () => {
    const ramp = colorRamp([{ stop: 0, color: 0xff0000 }, { stop: 1, color: 0x0000ff }]);
    expect(ramp(1)).toBe(0x0000ff);
  });

  it('interpolates at midpoint', () => {
    const ramp = colorRamp([{ stop: 0, color: 0x000000 }, { stop: 1, color: 0xffffff }]);
    const mid = ramp(0.5);
    const { r } = unpackRGB(mid);
    expect(r).toBeCloseTo(128, -1);
  });

  it('handles unsorted stops', () => {
    const ramp = colorRamp([{ stop: 1, color: 0x0000ff }, { stop: 0, color: 0xff0000 }]);
    expect(ramp(0)).toBe(0xff0000);
    expect(ramp(1)).toBe(0x0000ff);
  });

  it('clamps out-of-range t', () => {
    const ramp = colorRamp([{ stop: 0, color: 0xff0000 }, { stop: 1, color: 0x0000ff }]);
    expect(ramp(-0.5)).toBe(0xff0000);
    expect(ramp(1.5)).toBe(0x0000ff);
  });
});

describe('starPalette', () => {
  it('returns 6 colors', () => {
    expect(starPalette(0)).toHaveLength(6);
    expect(starPalette(0.5)).toHaveLength(6);
    expect(starPalette(1)).toHaveLength(6);
  });

  it('all colors are valid integers', () => {
    for (const c of starPalette(0.3)) {
      expect(Number.isInteger(c)).toBe(true);
      expect(c).toBeGreaterThanOrEqual(0);
      expect(c).toBeLessThanOrEqual(0xffffff);
    }
  });
});

// ── remap / clamp ──────────────────────────────────────────────────────────────

describe('remap', () => {
  it('maps midpoint correctly', () => {
    expect(remap(0.5, 0, 1, 0, 100)).toBeCloseTo(50);
  });
  it('maps edge values', () => {
    expect(remap(0, 0, 1, 10, 20)).toBeCloseTo(10);
    expect(remap(1, 0, 1, 10, 20)).toBeCloseTo(20);
  });
  it('handles inverted output range', () => {
    expect(remap(0.25, 0, 1, 100, 0)).toBeCloseTo(75);
  });
});

describe('clamp', () => {
  it('clamps below min', () => expect(clamp(-5, 0, 10)).toBe(0));
  it('clamps above max', () => expect(clamp(15, 0, 10)).toBe(10));
  it('passes through in-range', () => expect(clamp(5, 0, 10)).toBe(5));
});

describe('normalize', () => {
  it('maps -1 → 0, 1 → 1, 0 → 0.5', () => {
    expect(normalize(-1)).toBeCloseTo(0);
    expect(normalize(1)).toBeCloseTo(1);
    expect(normalize(0)).toBeCloseTo(0.5);
  });
  it('clamps out-of-range inputs', () => {
    expect(normalize(-2)).toBe(0);
    expect(normalize(2)).toBe(1);
  });
});

describe('threshold', () => {
  it('returns 1 at and above t', () => {
    expect(threshold(0.5, 0.5)).toBe(1);
    expect(threshold(0.6, 0.5)).toBe(1);
  });
  it('returns 0 below t', () => {
    expect(threshold(0.4, 0.5)).toBe(0);
  });
});

describe('smoothstep', () => {
  it('returns 0 at lo', () => expect(smoothstep(0.2, 0.8, 0.2)).toBeCloseTo(0));
  it('returns 1 at hi', () => expect(smoothstep(0.2, 0.8, 0.8)).toBeCloseTo(1));
  it('returns 0.5 at midpoint', () => expect(smoothstep(0, 1, 0.5)).toBeCloseTo(0.5));
  it('clamps outside range', () => {
    expect(smoothstep(0.2, 0.8, 0)).toBe(0);
    expect(smoothstep(0.2, 0.8, 1)).toBe(1);
  });
});

describe('bias / gain', () => {
  it('bias(0.5, 0.5) ≈ 0.5 (identity)', () => {
    expect(bias(0.5, 0.5)).toBeCloseTo(0.5);
  });
  it('bias skews toward 0 when b < 0.5', () => {
    expect(bias(0.5, 0.2)).toBeLessThan(0.5);
  });
  it('gain(0.5, g) = 0.5 for any g', () => {
    expect(gain(0.5, 0.2)).toBeCloseTo(0.5);
    expect(gain(0.5, 0.8)).toBeCloseTo(0.5);
  });
});

describe('dither', () => {
  it('returns 0 or 1', () => {
    const r = rng();
    for (let i = 0; i < 100; i++) {
      const v = dither(Math.random(), 0.5, 0.1, r);
      expect(v === 0 || v === 1).toBe(true);
    }
  });
  it('is deterministic for the same rng', () => {
    const a = dither(0.5, 0.5, 0.2, rng(1));
    const b = dither(0.5, 0.5, 0.2, rng(1));
    expect(a).toBe(b);
  });
});
