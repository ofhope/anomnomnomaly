import { describe, it, expect } from 'vitest';
import { xoshiro256 } from '@anomnomnomaly/prng';
import {
  createGrid, cloneGrid, inBounds, rectCenter, rectsOverlap, fillRect,
  placeRooms, roomInside,
  bspPartition, bspLeaves, bspNodes,
  randomFill, cellularStep, countWallNeighbours, CAVE_RULE,
  floodFill, labelRegions, removeSmallRegions, distanceField, farthestTile,
  carveCorridor, connectRegions,
} from './index.js';
import type { Rect, TileGrid } from './index.js';

function rng(seed = 42) { return xoshiro256({ seed }); }

function parse(rows: string[]): TileGrid {
  return rows.map((r) => [...r].map((c) => (c === '#' ? 1 : 0)));
}

// ── basics ─────────────────────────────────────────────────────────────────────

describe('grid basics', () => {
  it('createGrid fills width × height', () => {
    const g = createGrid(4, 3, 1);
    expect(g).toHaveLength(3);
    expect(g[0]).toHaveLength(4);
    expect(g.flat().every((v) => v === 1)).toBe(true);
  });

  it('rows are independent and cloneGrid copies deeply', () => {
    const g = createGrid(3, 3);
    g[0][0] = 5;
    expect(g[1][0]).toBe(0);
    const c = cloneGrid(g);
    c[0][0] = 9;
    expect(g[0][0]).toBe(5);
  });

  it('inBounds', () => {
    const g = createGrid(4, 3);
    expect(inBounds(g, 0, 0)).toBe(true);
    expect(inBounds(g, 3, 2)).toBe(true);
    expect(inBounds(g, 4, 0)).toBe(false);
    expect(inBounds(g, 0, -1)).toBe(false);
  });

  it('rectCenter and rectsOverlap', () => {
    expect(rectCenter({ x: 2, y: 2, width: 5, height: 4 })).toEqual({ x: 4, y: 4 });
    const a: Rect = { x: 0, y: 0, width: 3, height: 3 };
    expect(rectsOverlap(a, { x: 3, y: 0, width: 2, height: 2 })).toBe(false);   // touching
    expect(rectsOverlap(a, { x: 3, y: 0, width: 2, height: 2 }, 1)).toBe(true); // within padding
    expect(rectsOverlap(a, { x: 4, y: 0, width: 2, height: 2 }, 1)).toBe(false);
    expect(rectsOverlap(a, { x: 1, y: 1, width: 1, height: 1 })).toBe(true);
  });

  it('fillRect clips to the grid', () => {
    const g = createGrid(3, 3, 1);
    fillRect(g, { x: 1, y: 1, width: 5, height: 5 }, 0);
    expect(g).toEqual([[1, 1, 1], [1, 0, 0], [1, 0, 0]]);
  });
});

// ── rooms ──────────────────────────────────────────────────────────────────────

describe('placeRooms', () => {
  const opts = { width: 40, height: 30, attempts: 80, minSize: 3, maxSize: 8 };

  it('keeps rooms inside the margin and apart by the padding', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const rooms = placeRooms(opts, rng(seed));
      expect(rooms.length).toBeGreaterThan(3);
      for (const r of rooms) {
        expect(r.x).toBeGreaterThanOrEqual(1);
        expect(r.y).toBeGreaterThanOrEqual(1);
        expect(r.x + r.width).toBeLessThanOrEqual(39);
        expect(r.y + r.height).toBeLessThanOrEqual(29);
        expect(r.width).toBeGreaterThanOrEqual(3);
        expect(r.width).toBeLessThanOrEqual(8);
      }
      for (let i = 0; i < rooms.length; i++) {
        for (let j = i + 1; j < rooms.length; j++) {
          expect(rectsOverlap(rooms[i], rooms[j], 1)).toBe(false);
        }
      }
    }
  });

  it('is deterministic and reports every candidate', () => {
    let accepted = 0, total = 0;
    const rooms = placeRooms({ ...opts, onCandidate: (_, ok) => { total++; if (ok) accepted++; } }, rng(7));
    expect(rooms).toEqual(placeRooms(opts, rng(7)));
    expect(accepted).toBe(rooms.length);
    expect(total).toBe(80);
  });

  it('respects maxRooms', () => {
    expect(placeRooms({ ...opts, maxRooms: 3 }, rng()).length).toBeLessThanOrEqual(3);
  });
});

describe('roomInside', () => {
  it('fits inside the area with margins', () => {
    const area = { x: 10, y: 5, width: 8, height: 6 };
    const r = rng();
    for (let i = 0; i < 200; i++) {
      const room = roomInside(area, { minSize: 3 }, r)!;
      expect(room.x).toBeGreaterThanOrEqual(11);
      expect(room.y).toBeGreaterThanOrEqual(6);
      expect(room.x + room.width).toBeLessThanOrEqual(17);
      expect(room.y + room.height).toBeLessThanOrEqual(10);
      expect(room.width).toBeGreaterThanOrEqual(3);
      expect(room.height).toBeGreaterThanOrEqual(3);
    }
  });

  it('returns null when the area is too small', () => {
    expect(roomInside({ x: 0, y: 0, width: 4, height: 9 }, { minSize: 3 }, rng())).toBeNull();
  });
});

// ── BSP ────────────────────────────────────────────────────────────────────────

describe('bspPartition', () => {
  it('leaves tile the area exactly and respect minSize', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const tree = bspPartition({ width: 40, height: 30, minSize: 6 }, rng(seed));
      const leaves = bspLeaves(tree);
      expect(leaves.length).toBeGreaterThan(4);
      const cover = createGrid(40, 30, 0);
      for (const leaf of leaves) {
        expect(leaf.width).toBeGreaterThanOrEqual(6);
        expect(leaf.height).toBeGreaterThanOrEqual(6);
        for (let y = leaf.y; y < leaf.y + leaf.height; y++) {
          for (let x = leaf.x; x < leaf.x + leaf.width; x++) cover[y][x]++;
        }
      }
      expect(cover.flat().every((c) => c === 1)).toBe(true);
    }
  });

  it('stops at maxDepth', () => {
    const tree = bspPartition({ width: 64, height: 64, minSize: 2, maxDepth: 3 }, rng());
    expect(bspLeaves(tree)).toHaveLength(8);
    expect(Math.max(...bspNodes(tree).map((n) => n.depth))).toBe(3);
  });

  it('cuts long nodes across their long side', () => {
    const tree = bspPartition({ width: 60, height: 10, minSize: 4, maxDepth: 1 }, rng());
    expect(tree.split).toBe('vertical');
  });

  it('is deterministic', () => {
    const a = bspPartition({ width: 40, height: 30, minSize: 6 }, rng(5));
    const b = bspPartition({ width: 40, height: 30, minSize: 6 }, rng(5));
    expect(a).toEqual(b);
  });
});

// ── cellular automata ──────────────────────────────────────────────────────────

describe('cellular automata', () => {
  it('randomFill respects border and density', () => {
    const g = randomFill({ width: 100, height: 80, density: 0.45 }, rng());
    expect(g[0].every((v) => v === 1)).toBe(true);
    expect(g.every((row) => row[0] === 1 && row[99] === 1)).toBe(true);
    const inner = g.slice(1, -1).flatMap((row) => row.slice(1, -1));
    const density = inner.filter((v) => v === 1).length / inner.length;
    expect(density).toBeGreaterThan(0.42);
    expect(density).toBeLessThan(0.48);
  });

  it('counts neighbours, treating the edge as wall by default', () => {
    const g = parse(['...', '.#.', '...']);
    expect(countWallNeighbours(g, 1, 1)).toBe(0);
    expect(countWallNeighbours(g, 0, 0)).toBe(6); // 5 off-grid + centre
    expect(countWallNeighbours(g, 0, 0, 0)).toBe(1);
  });

  it('cellularStep applies B5678/S45678', () => {
    // A lone wall dies; a floor tile surrounded by walls fills in
    expect(cellularStep(parse(['.....', '.....', '..#..', '.....', '.....']), CAVE_RULE, { edge: 0 })[2][2]).toBe(0);
    expect(cellularStep(parse(['#####', '#####', '##.##', '#####', '#####']))[2][2]).toBe(1);
  });

  it('does not modify its input', () => {
    const g = randomFill({ width: 20, height: 20, density: 0.45 }, rng());
    const before = JSON.stringify(g);
    cellularStep(g);
    expect(JSON.stringify(g)).toBe(before);
  });

  it('smoothing reduces the number of regions', () => {
    let g = randomFill({ width: 60, height: 40, density: 0.45 }, rng(3));
    const before = labelRegions(g).regions.length;
    for (let i = 0; i < 4; i++) g = cellularStep(g);
    expect(labelRegions(g).regions.length).toBeLessThan(before);
  });
});

// ── regions ────────────────────────────────────────────────────────────────────

describe('regions', () => {
  const g = parse([
    '#######',
    '#..#..#',
    '#..#..#',
    '####.##',
    '#.....#',
    '#######',
  ]);

  it('floodFill finds only connected tiles, 4-way', () => {
    expect(floodFill(g, { x: 1, y: 1 })).toHaveLength(4);
    expect(floodFill(g, { x: 4, y: 1 })).toHaveLength(10);
    expect(floodFill(g, { x: 0, y: 0 })).toEqual([]);
  });

  it('labelRegions sorts largest first', () => {
    const { labels, regions } = labelRegions(g);
    expect(regions.map((r) => r.length)).toEqual([10, 4]);
    expect(labels[1][4]).toBe(0);
    expect(labels[1][1]).toBe(1);
    expect(labels[0][0]).toBe(-1);
  });

  it('removeSmallRegions fills pockets in place', () => {
    const copy = cloneGrid(g);
    expect(removeSmallRegions(copy, 5)).toBe(1);
    expect(copy[1][1]).toBe(1);
    expect(labelRegions(copy).regions).toHaveLength(1);
  });

  it('distanceField and farthestTile', () => {
    const d = distanceField(g, [{ x: 4, y: 1 }]);
    expect(d[1][4]).toBe(0);
    expect(d[4][1]).toBe(6);
    expect(d[1][1]).toBe(Infinity);
    expect(d[0][0]).toBe(Infinity);
    expect(farthestTile(d)).toEqual({ x: 1, y: 4 });
  });
});

// ── corridors ──────────────────────────────────────────────────────────────────

describe('corridors', () => {
  it('carveCorridor makes an L and returns its tiles', () => {
    const g = createGrid(6, 5, 1);
    const path = carveCorridor(g, { x: 1, y: 1 }, { x: 4, y: 3 });
    expect(path[0]).toEqual({ x: 1, y: 1 });
    expect(path[path.length - 1]).toEqual({ x: 4, y: 3 });
    expect(path).toHaveLength(6);
    expect(g[1][4]).toBe(0); // corner of a horizontal-first L
    const v = createGrid(6, 5, 1);
    carveCorridor(v, { x: 1, y: 1 }, { x: 4, y: 3 }, { horizontalFirst: false });
    expect(v[3][1]).toBe(0); // corner of a vertical-first L
  });

  it('connectRegions joins every region', () => {
    for (let seed = 1; seed <= 15; seed++) {
      let cave = randomFill({ width: 50, height: 35, density: 0.47 }, rng(seed));
      for (let i = 0; i < 4; i++) cave = cellularStep(cave);
      const before = labelRegions(cave).regions.length;
      const corridors = connectRegions(cave);
      expect(labelRegions(cave).regions).toHaveLength(1);
      expect(corridors.length).toBeLessThanOrEqual(Math.max(0, before - 1));
    }
  });

  it('connectRegions keeps the largest region intact', () => {
    const g = parse(['#######', '#..#..#', '#..#..#', '####.##', '#.....#', '#######']);
    const corridors = connectRegions(g);
    expect(corridors).toHaveLength(1);
    // Both ends are existing floor; the one wall tile between them is carved
    expect(corridors[0]).toHaveLength(3);
    expect(g[1][3]).toBe(0);
  });

  it('connectRegions rejects an impassable carve value', () => {
    expect(() => connectRegions(createGrid(3, 3), { value: 1 })).toThrow(RangeError);
  });
});
