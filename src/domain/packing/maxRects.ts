// MaxRects bin packing, after J. Jylänki, "A Thousand Ways to Pack the Bin" (2010).
// The bin keeps the list of all maximal free rectangles; every insertion picks a
// free rectangle by a heuristic score, then splits and prunes the free list.

import type { Rect } from '../types'

/**
 * - `BSSF` best short side fit: minimise the shorter leftover side.
 * - `BLSF` best long side fit: minimise the longer leftover side.
 * - `BAF` best area fit: minimise the leftover area.
 */
export type Heuristic = 'BSSF' | 'BLSF' | 'BAF'

export const HEURISTICS: readonly Heuristic[] = ['BSSF', 'BLSF', 'BAF']

/** Where a box ended up. `width`/`height` are the footprint as placed, after any rotation. */
export interface Placement extends Rect {
  rotated: boolean
}

/** Lexicographic score, lower is better. */
type Score = readonly [primary: number, secondary: number]

function score(free: Rect, w: number, h: number, heuristic: Heuristic): Score {
  const leftoverW = free.width - w
  const leftoverH = free.height - h
  const shortSide = Math.min(leftoverW, leftoverH)
  const longSide = Math.max(leftoverW, leftoverH)
  switch (heuristic) {
    case 'BSSF':
      return [shortSide, longSide]
    case 'BLSF':
      return [longSide, shortSide]
    case 'BAF':
      return [free.width * free.height - w * h, shortSide]
  }
}

const isBetter = (a: Score, b: Score) => a[0] < b[0] || (a[0] === b[0] && a[1] < b[1])

const overlaps = (a: Rect, b: Rect) =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height

const contains = (outer: Rect, inner: Rect) =>
  inner.x >= outer.x &&
  inner.y >= outer.y &&
  inner.x + inner.width <= outer.x + outer.width &&
  inner.y + inner.height <= outer.y + outer.height

function assertPositiveInt(value: number, name: string) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new RangeError(`${name} must be a positive integer, got ${value}`)
  }
}

export class MaxRectsBin {
  readonly width: number
  readonly height: number
  private free: Rect[]
  private used = 0

  constructor(width: number, height: number) {
    assertPositiveInt(width, 'width')
    assertPositiveInt(height, 'height')
    this.width = width
    this.height = height
    this.free = [{ x: 0, y: 0, width, height }]
  }

  /** Total area of the boxes placed so far. */
  get usedArea(): number {
    return this.used
  }

  /** Snapshot of the current maximal free rectangles. */
  get freeRects(): Rect[] {
    return this.free.map((r) => ({ ...r }))
  }

  /**
   * Places a `width` × `height` box, turned 90° if `rotatable` and that scores better.
   * Returns the placement, or `null` (leaving the bin untouched) if the box fits nowhere.
   * Ties keep the earliest free rectangle and the natural orientation.
   */
  insert(width: number, height: number, rotatable: boolean, heuristic: Heuristic): Placement | null {
    assertPositiveInt(width, 'width')
    assertPositiveInt(height, 'height')

    const orientations: [number, number, boolean][] = [[width, height, false]]
    if (rotatable && width !== height) orientations.push([height, width, true])

    let best: Placement | null = null
    let bestScore: Score | null = null
    for (const free of this.free) {
      for (const [w, h, rotated] of orientations) {
        if (w > free.width || h > free.height) continue
        const s = score(free, w, h, heuristic)
        if (bestScore === null || isBetter(s, bestScore)) {
          best = { x: free.x, y: free.y, width: w, height: h, rotated }
          bestScore = s
        }
      }
    }

    if (best !== null) this.place(best)
    return best
  }

  private place(box: Rect) {
    const next: Rect[] = []
    for (const free of this.free) {
      if (overlaps(free, box)) next.push(...split(free, box))
      else next.push(free)
    }
    this.free = prune(next)
    this.used += box.width * box.height
  }
}

/** The up-to-four maximal pieces of `free` that remain outside `box`; they may overlap each other. */
function split(free: Rect, box: Rect): Rect[] {
  const pieces: Rect[] = []
  const freeRight = free.x + free.width
  const freeBottom = free.y + free.height
  const boxRight = box.x + box.width
  const boxBottom = box.y + box.height

  if (box.x > free.x) {
    pieces.push({ x: free.x, y: free.y, width: box.x - free.x, height: free.height })
  }
  if (boxRight < freeRight) {
    pieces.push({ x: boxRight, y: free.y, width: freeRight - boxRight, height: free.height })
  }
  if (box.y > free.y) {
    pieces.push({ x: free.x, y: free.y, width: free.width, height: box.y - free.y })
  }
  if (boxBottom < freeBottom) {
    pieces.push({ x: free.x, y: boxBottom, width: free.width, height: freeBottom - boxBottom })
  }
  return pieces
}

/** Drops every rectangle contained in another one; of identical rectangles one survives. */
function prune(rects: Rect[]): Rect[] {
  const removed = new Array<boolean>(rects.length).fill(false)
  for (let i = 0; i < rects.length; i++) {
    if (removed[i]) continue
    for (let j = i + 1; j < rects.length; j++) {
      if (removed[j]) continue
      if (contains(rects[j], rects[i])) {
        removed[i] = true
        break
      }
      if (contains(rects[i], rects[j])) removed[j] = true
    }
  }
  return rects.filter((_, i) => !removed[i])
}
