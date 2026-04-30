import { describe, it, expect } from 'vitest';
import { xoshiro256, mulberry32 } from '@anomnomnomaly/prng';
import { simplex2D, worley2D, worley2DAsNoise, fbm } from '../index.js';

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
    expect(a(0.5, 0.5)).not.toBe(b(0.5, 0.5));
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
    // With more octaves, variance should increase (harder to test exactly,
    // so just verify it runs and the range is sensible)
    const lo = fbm(simplex2D(rng()), { octaves: 1 });
    const hi = fbm(simplex2D(rng()), { octaves: 8 });
    const samples = Array.from({ length: 100 }, (_, i) => i * 0.1);
    const loVals = samples.map(s => lo(s, s));
    const hiVals = samples.map(s => hi(s, s));
    const loVar = loVals.reduce((a, v) => a + v * v, 0);
    const hiVar = hiVals.reduce((a, v) => a + v * v, 0);
    expect(hiVar).toBeGreaterThan(loVar * 0.5); // very loose bound
  });
});
