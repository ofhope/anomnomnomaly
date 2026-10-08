import { describe, it, expect } from 'vitest';
import {
  xoshiro256, mulberry32,
  seedFromString, deriveSeed,
  randomInt, randomFloat, chance, pick, shuffle, weightedPick,
} from './index.js';

function rng(seed = 42) { return xoshiro256({ seed }); }

// ── seeds ──────────────────────────────────────────────────────────────────────

describe('seedFromString', () => {
  it('is deterministic', () => {
    expect(seedFromString('ember-falls')).toBe(seedFromString('ember-falls'));
  });

  it('returns a safe non-negative integer', () => {
    for (const s of ['', 'a', 'ember-falls', 'ünïcödé', 'x'.repeat(1000)]) {
      const v = seedFromString(s);
      expect(Number.isSafeInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
    }
  });

  it('separates similar strings', () => {
    const seeds = new Set(Array.from({ length: 1000 }, (_, i) => seedFromString(`seed-${i}`)));
    expect(seeds.size).toBe(1000);
  });

  it('seeds every generator', () => {
    const seed = seedFromString('ember-falls');
    expect(xoshiro256({ seed })()).toBe(xoshiro256({ seed })());
    expect(mulberry32({ seed })()).toBe(mulberry32({ seed })());
  });
});

describe('deriveSeed', () => {
  it('is deterministic per (seed, key)', () => {
    expect(deriveSeed(7, 'terrain')).toBe(deriveSeed(7, 'terrain'));
    expect(deriveSeed(7, 3)).toBe(deriveSeed(7, 3));
  });

  it('gives different keys and parents different seeds', () => {
    expect(deriveSeed(7, 'terrain')).not.toBe(deriveSeed(7, 'loot'));
    expect(deriveSeed(7, 'terrain')).not.toBe(deriveSeed(8, 'terrain'));
    expect(deriveSeed(7, 1)).not.toBe(deriveSeed(7, 2));
  });
});

// ── distributions ──────────────────────────────────────────────────────────────

describe('randomInt', () => {
  it('stays in [min, max] and hits both ends', () => {
    const r = rng();
    const seen = new Set<number>();
    for (let i = 0; i < 2000; i++) {
      const v = randomInt(3, 7, r);
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(3);
      expect(v).toBeLessThanOrEqual(7);
      seen.add(v);
    }
    expect([...seen].sort()).toEqual([3, 4, 5, 6, 7]);
  });

  it('returns min when min === max', () => {
    expect(randomInt(4, 4, rng())).toBe(4);
  });
});

describe('randomFloat', () => {
  it('stays in [min, max)', () => {
    const r = rng();
    for (let i = 0; i < 1000; i++) {
      const v = randomFloat(-2, 5, r);
      expect(v).toBeGreaterThanOrEqual(-2);
      expect(v).toBeLessThan(5);
    }
  });
});

describe('chance', () => {
  it('never fires at 0 and always fires at 1', () => {
    const r = rng();
    for (let i = 0; i < 200; i++) {
      expect(chance(0, r)).toBe(false);
      expect(chance(1, r)).toBe(true);
    }
  });

  it('fires about p of the time', () => {
    const r = rng();
    let hits = 0;
    for (let i = 0; i < 10000; i++) if (chance(0.3, r)) hits++;
    expect(hits / 10000).toBeGreaterThan(0.27);
    expect(hits / 10000).toBeLessThan(0.33);
  });
});

describe('pick', () => {
  it('returns every element eventually', () => {
    const r = rng();
    const seen = new Set<string>();
    for (let i = 0; i < 200; i++) seen.add(pick(['a', 'b', 'c'], r));
    expect(seen.size).toBe(3);
  });

  it('throws on an empty array', () => {
    expect(() => pick([], rng())).toThrow(RangeError);
  });
});

describe('shuffle', () => {
  it('returns a permutation and leaves the input alone', () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8];
    const out = shuffle(input, rng());
    expect(input).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect([...out].sort((a, b) => a - b)).toEqual(input);
  });

  it('is deterministic for the same seed', () => {
    expect(shuffle([1, 2, 3, 4, 5, 6], rng(9))).toEqual(shuffle([1, 2, 3, 4, 5, 6], rng(9)));
  });

  it('puts each element first about equally often', () => {
    const r = rng();
    const counts = [0, 0, 0, 0];
    for (let i = 0; i < 8000; i++) counts[shuffle([0, 1, 2, 3], r)[0]]++;
    for (const c of counts) {
      expect(c / 8000).toBeGreaterThan(0.22);
      expect(c / 8000).toBeLessThan(0.28);
    }
  });
});

describe('weightedPick', () => {
  const entries = [
    { value: 'common', weight: 70 },
    { value: 'rare', weight: 25 },
    { value: 'epic', weight: 5 },
    { value: 'never', weight: 0 },
  ];

  it('follows the weights', () => {
    const r = rng();
    const counts: Record<string, number> = { common: 0, rare: 0, epic: 0, never: 0 };
    for (let i = 0; i < 20000; i++) counts[weightedPick(entries, r)]++;
    expect(counts.never).toBe(0);
    expect(counts.common / 20000).toBeGreaterThan(0.67);
    expect(counts.common / 20000).toBeLessThan(0.73);
    expect(counts.epic / 20000).toBeGreaterThan(0.035);
    expect(counts.epic / 20000).toBeLessThan(0.065);
  });

  it('throws when no weight is positive', () => {
    expect(() => weightedPick([{ value: 1, weight: 0 }], rng())).toThrow(RangeError);
    expect(() => weightedPick([], rng())).toThrow(RangeError);
  });
});
