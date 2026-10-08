/**
 * Random room placement — rejection sampling.
 *
 * Propose a room with a random size and position; keep it if it doesn't
 * overlap any room kept so far, otherwise throw it away. Repeat for a fixed
 * number of attempts. The simplest dungeon layout, and the fastest to tune.
 *
 * ```ts
 * const rng = xoshiro256({ seed: 42 });
 * const rooms = placeRooms({ width: 30, height: 24, attempts: 60, minSize: 3, maxSize: 7 }, rng);
 * ```
 */
import type { RandomFn } from '@anomnomnomaly/prng';
import type { Rect } from './types.js';
import { rectsOverlap } from './grid.js';

export interface PlaceRoomsOptions {
  /** Map width in tiles. */
  width: number;
  /** Map height in tiles. */
  height: number;
  /** Rooms to propose. Each costs one overlap check per room already kept. */
  attempts: number;
  /** Smallest room side, in tiles. */
  minSize: number;
  /** Largest room side, in tiles. */
  maxSize: number;
  /** Stop once this many rooms are kept. Default: no limit. */
  maxRooms?: number;
  /** Minimum gap between rooms, in tiles. Default: 1, one wall between rooms. */
  padding?: number;
  /** Tiles kept clear around the map edge. Default: 1, a solid outer wall. */
  margin?: number;
  /** Called for every proposed room, kept or not. Useful for visualising. */
  onCandidate?: (room: Rect, accepted: boolean) => void;
}

/** Returns the rooms kept, in the order they were placed. */
export function placeRooms(options: PlaceRoomsOptions, rng: RandomFn): Rect[] {
  const {
    width, height, attempts, minSize, maxSize,
    maxRooms = Infinity, padding = 1, margin = 1, onCandidate,
  } = options;

  const between = (min: number, max: number) => min + Math.floor(rng() * (max - min + 1));
  const rooms: Rect[] = [];

  for (let i = 0; i < attempts && rooms.length < maxRooms; i++) {
    const w = between(minSize, maxSize);
    const h = between(minSize, maxSize);
    const maxX = width - margin - w;
    const maxY = height - margin - h;
    if (maxX < margin || maxY < margin) continue; // room too big for the map

    const room: Rect = { x: between(margin, maxX), y: between(margin, maxY), width: w, height: h };
    const accepted = !rooms.some((other) => rectsOverlap(room, other, padding));
    if (accepted) rooms.push(room);
    onCandidate?.(room, accepted);
  }

  return rooms;
}

export interface RoomInsideOptions {
  /** Smallest room side, in tiles. */
  minSize: number;
  /** Tiles kept clear between the room and the edge of `area`. Default: 1 */
  margin?: number;
}

/**
 * Returns a randomly sized and positioned room inside `area`, or null when
 * the area is too small to hold `minSize` plus margins. Used to put one room
 * in each BSP leaf.
 */
export function roomInside(area: Rect, options: RoomInsideOptions, rng: RandomFn): Rect | null {
  const { minSize, margin = 1 } = options;
  const maxW = area.width - margin * 2;
  const maxH = area.height - margin * 2;
  if (maxW < minSize || maxH < minSize) return null;

  const between = (min: number, max: number) => min + Math.floor(rng() * (max - min + 1));
  const w = between(minSize, maxW);
  const h = between(minSize, maxH);
  return {
    x: area.x + margin + between(0, maxW - w),
    y: area.y + margin + between(0, maxH - h),
    width: w,
    height: h,
  };
}
