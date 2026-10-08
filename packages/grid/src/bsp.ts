/**
 * Binary space partitioning — recursively split a rectangle in two.
 *
 * Each split cuts a node across its longer side at a random position, so
 * the leaves tile the whole area without overlapping. Putting one room in
 * each leaf gives an even spread of rooms that never collide, and the tree
 * itself says which rooms are neighbours: siblings share a split line.
 *
 * ```ts
 * const tree = bspPartition({ width: 30, height: 24, minSize: 6 }, rng);
 * for (const leaf of bspLeaves(tree)) {
 *   const room = roomInside(leaf, { minSize: 3 }, rng);
 * }
 * ```
 */
import type { RandomFn } from '@anomnomnomaly/prng';
import type { Rect } from './types.js';

export interface BspNode extends Rect {
  /** 0 for the root. */
  depth: number;
  /** Set on internal nodes: the first half (left or top). */
  left?: BspNode;
  /** Set on internal nodes: the second half (right or bottom). */
  right?: BspNode;
  /** Set on internal nodes: `vertical` cuts along x, `horizontal` along y. */
  split?: 'vertical' | 'horizontal';
}

export interface BspOptions {
  /** Left of the area to split. Default: 0 */
  x?: number;
  /** Top of the area to split. Default: 0 */
  y?: number;
  width: number;
  height: number;
  /** Smallest side a leaf may have. A node narrower than 2 × minSize can't split. */
  minSize: number;
  /** Stop splitting at this depth. Default: no limit (minSize stops it). */
  maxDepth?: number;
  /**
   * Where along the side a cut may fall, as fractions. Default: [0.35, 0.65].
   * A narrow range gives evenly sized leaves; a wide one gives variety.
   */
  splitRange?: readonly [number, number];
  /**
   * A node whose sides differ by more than this ratio is always cut across
   * its longer side, which avoids long thin leaves. Default: 1.25
   */
  aspectLimit?: number;
}

/** Builds the full BSP tree and returns its root. */
export function bspPartition(options: BspOptions, rng: RandomFn): BspNode {
  const {
    x = 0, y = 0, width, height, minSize,
    maxDepth = Infinity, splitRange = [0.35, 0.65], aspectLimit = 1.25,
  } = options;

  function split(node: BspNode): void {
    if (node.depth >= maxDepth) return;

    const canCutX = node.width >= minSize * 2;
    const canCutY = node.height >= minSize * 2;
    if (!canCutX && !canCutY) return;

    let vertical: boolean;
    if (!canCutY) vertical = true;
    else if (!canCutX) vertical = false;
    else if (node.width / node.height > aspectLimit) vertical = true;
    else if (node.height / node.width > aspectLimit) vertical = false;
    else vertical = rng() < 0.5;

    const side = vertical ? node.width : node.height;
    // Clamp the random cut so both halves are at least minSize
    const lo = Math.max(minSize, Math.round(side * splitRange[0]));
    const hi = Math.min(side - minSize, Math.round(side * splitRange[1]));
    const cut = lo <= hi
      ? lo + Math.floor(rng() * (hi - lo + 1))
      : Math.floor(side / 2);

    const depth = node.depth + 1;
    if (vertical) {
      node.left = { x: node.x, y: node.y, width: cut, height: node.height, depth };
      node.right = { x: node.x + cut, y: node.y, width: node.width - cut, height: node.height, depth };
    } else {
      node.left = { x: node.x, y: node.y, width: node.width, height: cut, depth };
      node.right = { x: node.x, y: node.y + cut, width: node.width, height: node.height - cut, depth };
    }
    node.split = vertical ? 'vertical' : 'horizontal';
    split(node.left);
    split(node.right);
  }

  const root: BspNode = { x, y, width, height, depth: 0 };
  split(root);
  return root;
}

/** Returns the leaves of a BSP tree, left to right. */
export function bspLeaves(node: BspNode): BspNode[] {
  if (!node.left || !node.right) return [node];
  return [...bspLeaves(node.left), ...bspLeaves(node.right)];
}

/** Returns every node in the tree, parents before children. */
export function bspNodes(node: BspNode): BspNode[] {
  if (!node.left || !node.right) return [node];
  return [node, ...bspNodes(node.left), ...bspNodes(node.right)];
}
