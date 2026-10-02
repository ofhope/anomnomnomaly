import { describe, it, expect } from 'vitest';
import { xoshiro256, mulberry32 } from '@anomnomnomaly/prng';
import { simplex2D, worley2D, worley2DAsNoise, fbm } from './index.js';

// ── helpers ────────────────────────────────────────────────────────────────────

function rng(seed = 42) { return xoshiro256({ seed }); }
function rng32(seed = 42) { return mulberry32({ seed }); }

// ── simplex2D ──────────────────────────────────────────────────────────────────

describe('simplex2D', () => {
  it('returns values in [-1, 1]', () => {
    const noise = simplex2D(rng());
    for (let i = 0; i < 200; i++) {
      const v = noise(i * 0.1, i * 0.07);
      expect(v).toBeGreaterThanOrEqual(-1);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it('is deterministic for the same seed', () => {
    const a = simplex2D(rng(1));
    const b = simplex2D(rng(1));
    for (let i = 0; i < 50; i++) {
      expect(a(i, i)).toBe(b(i, i));
    }
  });

  it('differs for different seeds', () => {
    const a = simplex2D(rng(1));
    const b = simplex2D(rng(2));
    // Compared across many points: at any single point (especially on the simplex diagonal,
    // where several gradients give the same value) two seeds can agree by chance
    const points = Array.from({ length: 20 }, (_, i) => [i * 0.37 + 0.1, i * 0.91 + 0.3] as const);
    const differing = points.filter(([x, y]) => a(x, y) !== b(x, y));
    expect(differing.length).toBeGreaterThan(15);
  });

  it('is continuous — nearby inputs give nearby outputs', () => {
    const noise = simplex2D(rng());
    const delta = 1e-4;
    const v0 = noise(1.0, 1.0);
    const v1 = noise(1.0 + delta, 1.0);
    expect(Math.abs(v1 - v0)).toBeLessThan(0.01);
  });
});

// ── worley2D ───────────────────────────────────────────────────────────────────

describe('worley2D', () => {
  it('returns f1 and f2 in [0, 1]', () => {
    const w = worley2D(rng());
    for (let i = 0; i < 100; i++) {
      const { f1, f2 } = w(i * 0.3, i * 0.2);
      expect(f1).toBeGreaterThanOrEqual(0);
      expect(f1).toBeLessThanOrEqual(1);
      expect(f2).toBeGreaterThanOrEqual(0);
      expect(f2).toBeLessThanOrEqual(1);
    }
  });

  it('f1 <= f2', () => {
    const w = worley2D(rng());
    for (let i = 0; i < 100; i++) {
      const { f1, f2 } = w(i * 0.3, i * 0.2);
      expect(f1).toBeLessThanOrEqual(f2);
    }
  });

  it('worley2DAsNoise returns values in [-1, 1]', () => {
    const noise = worley2DAsNoise(rng32());
    for (let i = 0; i < 100; i++) {
      const v = noise(i * 0.2, i * 0.15);
      expect(v).toBeGreaterThanOrEqual(-1);
      expect(v).toBeLessThanOrEqual(1);
    }
  });
});

// ── fbm ────────────────────────────────────────────────────────────────────────

describe('fbm', () => {
  it('wraps simplex2D and returns approximately [-1, 1]', () => {
    const noise = fbm(simplex2D(rng()), { octaves: 6 });
    for (let i = 0; i < 200; i++) {
      const v = noise(i * 0.1, i * 0.07);
      expect(v).toBeGreaterThanOrEqual(-1.05);
      expect(v).toBeLessThanOrEqual(1.05);
    }
  });

  it('wraps worley noise via worley2DAsNoise', () => {
    const noise = fbm(worley2DAsNoise(rng()), { octaves: 4 });
    for (let i = 0; i < 100; i++) {
      const v = noise(i * 0.1, i * 0.07);
      expect(v).toBeGreaterThanOrEqual(-1.1);
      expect(v).toBeLessThanOrEqual(1.1);
    }
  });

  it('more octaves add detail', () => {
    // Detail is fine-grained change: how much the value moves between close samples, relative to
    // how much it varies overall. (Not raw variance: fbm normalizes by the total amplitude, so
    // stacking octaves averages them and the overall variance drops.)
    const roughness = (noise: (x: number, y: number) => number) => {
      const vals = Array.from({ length: 2000 }, (_, i) => noise(i * 0.005, i * 0.003));
      const mean = vals.reduce((a, v) => a + v, 0) / vals.length;
      const rms = Math.sqrt(vals.reduce((a, v) => a + (v - mean) ** 2, 0) / vals.length);
      const steps = vals.slice(1).reduce((a, v, i) => a + Math.abs(v - vals[i]), 0) / (vals.length - 1);

      return steps / rms;
    };
    const lo = fbm(simplex2D(rng()), { octaves: 1 });
    const hi = fbm(simplex2D(rng()), { octaves: 8 });

    expect(roughness(hi)).toBeGreaterThan(roughness(lo) * 2);
  });
});
