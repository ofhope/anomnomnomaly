import { describe, it, expect } from 'vitest';
import { xoshiro256, mulberry32, squirrel3, squirrel3_2d, squirrel3Seeded } from '../index.js';

// ── helpers ────────────────────────────────────────────────────────────────────

function collectN(rng: () => number, n = 1000): number[] {
  return Array.from({ length: n }, () => rng());
}

// ── xoshiro256** ───────────────────────────────────────────────────────────────

describe('xoshiro256', () => {
  it('returns values in [0, 1)', () => {
    for (const v of collectN(xoshiro256({ seed: 42 }))) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('is deterministic for the same seed', () => {
    const a = collectN(xoshiro256({ seed: 12345 }), 200);
    const b = collectN(xoshiro256({ seed: 12345 }), 200);
    expect(a).toEqual(b);
  });

  it('produces different sequences for different seeds', () => {
    const a = xoshiro256({ seed: 1 })();
    const b = xoshiro256({ seed: 2 })();
    expect(a).not.toBe(b);
  });

  it('accepts bigint seeds', () => {
    const rng = xoshiro256({ seed: 0xdeadbeefn });
    expect(rng()).toBeGreaterThanOrEqual(0);
    expect(rng()).toBeLessThan(1);
  });

  it('distributes values roughly uniformly across [0, 1)', () => {
    const samples = collectN(xoshiro256({ seed: 99 }), 10_000);
    const buckets = new Array<number>(10).fill(0);
    for (const v of samples) buckets[Math.floor(v * 10)]++;
    // Each bucket should be between 800 and 1200 (±20%)
    for (const count of buckets) {
      expect(count).toBeGreaterThan(800);
      expect(count).toBeLessThan(1200);
    }
  });
});

// ── mulberry32 ─────────────────────────────────────────────────────────────────

describe('mulberry32', () => {
  it('returns values in [0, 1)', () => {
    for (const v of collectN(mulberry32({ seed: 42 }))) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('is deterministic for the same seed', () => {
    const a = collectN(mulberry32({ seed: 99 }), 200);
    const b = collectN(mulberry32({ seed: 99 }), 200);
    expect(a).toEqual(b);
  });

  it('produces different sequences for different seeds', () => {
    expect(mulberry32({ seed: 1 })()).not.toBe(mulberry32({ seed: 2 })());
  });

  it('handles seed 0', () => {
    const rng = mulberry32({ seed: 0 });
    expect(rng()).toBeGreaterThanOrEqual(0);
    expect(rng()).toBeLessThan(1);
  });
});

// ── squirrel3 ──────────────────────────────────────────────────────────────────

describe('squirrel3', () => {
  it('returns values in [0, 1)', () => {
    for (let i = 0; i < 1000; i++) {
      const v = squirrel3(i, 42);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('is stateless — same inputs always return the same value', () => {
    expect(squirrel3(100, 42)).toBe(squirrel3(100, 42));
    expect(squirrel3(999, 7)).toBe(squirrel3(999, 7));
  });

  it('different positions produce different values', () => {
    expect(squirrel3(1, 42)).not.toBe(squirrel3(2, 42));
    expect(squirrel3(0, 42)).not.toBe(squirrel3(1000, 42));
  });

  it('different seeds produce different values for the same position', () => {
    expect(squirrel3(42, 1)).not.toBe(squirrel3(42, 2));
  });
});

describe('squirrel3_2d', () => {
  it('returns values in [0, 1)', () => {
    for (let x = 0; x < 10; x++) {
      for (let y = 0; y < 10; y++) {
        const v = squirrel3_2d(x, y, 0);
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThan(1);
      }
    }
  });

  it('is stateless', () => {
    expect(squirrel3_2d(3, 7, 42)).toBe(squirrel3_2d(3, 7, 42));
  });
});

describe('squirrel3Seeded', () => {
  it('returns a bound HashFn', () => {
    const hash = squirrel3Seeded(42);
    expect(hash(10)).toBe(squirrel3(10, 42));
    expect(hash(20)).toBe(squirrel3(20, 42));
  });
});
