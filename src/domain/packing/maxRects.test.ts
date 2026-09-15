import { describe, expect, it } from 'vitest'
import { HEURISTICS, MaxRectsBin, type Heuristic, type Placement } from './maxRects'
import type { Rect } from '../types'

const overlaps = (a: Rect, b: Rect) =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height

const inside = (r: Rect, w: number, h: number) =>
  r.x >= 0 && r.y >= 0 && r.width > 0 && r.height > 0 && r.x + r.width <= w && r.y + r.height <= h

const contains = (outer: Rect, inner: Rect) =>
  inner.x >= outer.x &&
  inner.y >= outer.y &&
  inner.x + inner.width <= outer.x + outer.width &&
  inner.y + inner.height <= outer.y + outer.height

/** Deterministic PRNG (mulberry32) so a failing random case can be reproduced from its seed. */
function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

describe('MaxRectsBin', () => {
  it.each(HEURISTICS)('fills the bin exactly with four squares (%s)', (heuristic) => {
    const bin = new MaxRectsBin(10, 10)
    const placed = [1, 2, 3, 4].map(() => bin.insert(5, 5, false, heuristic))

    expect(placed.every((p) => p !== null)).toBe(true)
    expect(bin.usedArea).toBe(100)
    expect(bin.freeRects).toEqual([])
    expect(bin.insert(1, 1, true, heuristic)).toBeNull()
  })

  it('rotates a box that only fits turned when rotation is allowed', () => {
    const bin = new MaxRectsBin(10, 4)
    expect(bin.insert(4, 10, true, 'BSSF')).toEqual<Placement>({
      x: 0,
      y: 0,
      width: 10,
      height: 4,
      rotated: true,
    })
  })

  it('does not rotate a box when rotation is forbidden', () => {
    const bin = new MaxRectsBin(10, 4)
    expect(bin.insert(4, 10, false, 'BSSF')).toBeNull()
    expect(bin.usedArea).toBe(0)
    expect(bin.freeRects).toEqual([{ x: 0, y: 0, width: 10, height: 4 }])
  })

  it('never reports a square box as rotated', () => {
    const bin = new MaxRectsBin(10, 10)
    expect(bin.insert(3, 3, true, 'BAF')?.rotated).toBe(false)
  })

  it('keeps the natural orientation when both fit equally well', () => {
    const bin = new MaxRectsBin(10, 10)
    expect(bin.insert(2, 3, true, 'BSSF')?.rotated).toBe(false)
  })

  it('returns null when a box is larger than the bin', () => {
    const bin = new MaxRectsBin(10, 10)
    expect(bin.insert(11, 1, true, 'BAF')).toBeNull()
  })

  it('returns null when the remaining space is too small and leaves the bin unchanged', () => {
    const bin = new MaxRectsBin(10, 10)
    bin.insert(10, 6, false, 'BSSF')
    const freeBefore = bin.freeRects

    expect(bin.insert(5, 5, true, 'BSSF')).toBeNull()
    expect(bin.freeRects).toEqual(freeBefore)
    expect(bin.usedArea).toBe(60)
  })

  it('uses the whole free space even when it is not the first free rectangle', () => {
    const bin = new MaxRectsBin(10, 10)
    bin.insert(6, 6, false, 'BSSF')
    // Free space is an L-shape; a 4x10 strip survives as a maximal rectangle.
    expect(bin.insert(4, 10, false, 'BSSF')).toMatchObject({ x: 6, y: 0 })
  })

  describe('heuristics pick different free rectangles', () => {
    // After a 6x6 box in a 12x10 bin the maximal free rectangles are
    // right (6,0 6x10) and bottom (0,6 12x4). A 3x4 box leaves:
    //   right:  3 and 6 (area left 48)
    //   bottom: 9 and 0 (area left 36)
    const place = (heuristic: Heuristic) => {
      const bin = new MaxRectsBin(12, 10)
      bin.insert(6, 6, false, heuristic)
      return bin.insert(3, 4, false, heuristic)
    }

    it('BSSF minimises the shorter leftover side', () => {
      expect(place('BSSF')).toMatchObject({ x: 0, y: 6 })
    })

    it('BLSF minimises the longer leftover side', () => {
      expect(place('BLSF')).toMatchObject({ x: 6, y: 0 })
    })

    it('BAF minimises the leftover area', () => {
      expect(place('BAF')).toMatchObject({ x: 0, y: 6 })
    })
  })

  it('rejects non-positive or fractional dimensions', () => {
    expect(() => new MaxRectsBin(0, 10)).toThrow(RangeError)
    expect(() => new MaxRectsBin(10, 2.5)).toThrow(RangeError)
    const bin = new MaxRectsBin(10, 10)
    expect(() => bin.insert(-1, 2, false, 'BAF')).toThrow(RangeError)
    expect(() => bin.insert(1, 0.5, false, 'BAF')).toThrow(RangeError)
  })

  it('holds its invariants on 200 random seeded batches', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const rnd = mulberry32(seed)
      const int = (min: number, max: number) => min + Math.floor(rnd() * (max - min + 1))

      const binW = int(20, 400)
      const binH = int(20, 150)
      const heuristic = HEURISTICS[int(0, HEURISTICS.length - 1)]
      const bin = new MaxRectsBin(binW, binH)
      const placed: Placement[] = []

      const count = int(5, 80)
      for (let i = 0; i < count; i++) {
        const w = int(1, Math.ceil(binW / 2))
        const h = int(1, Math.ceil(binH / 2))
        const rotatable = rnd() < 0.5
        const p = bin.insert(w, h, rotatable, heuristic)
        if (p === null) continue

        const ctx = `seed ${seed}, box #${i} ${w}x${h}`
        if (p.rotated) {
          expect(rotatable, ctx).toBe(true)
          expect([p.width, p.height], ctx).toEqual([h, w])
        } else {
          expect([p.width, p.height], ctx).toEqual([w, h])
        }
        expect(inside(p, binW, binH), ctx).toBe(true)
        for (const q of placed) expect(overlaps(p, q), ctx).toBe(false)
        placed.push(p)
      }

      const ctx = `seed ${seed}`
      const used = placed.reduce((s, p) => s + p.width * p.height, 0)
      expect(bin.usedArea, ctx).toBe(used)

      const free = bin.freeRects
      for (const f of free) {
        expect(inside(f, binW, binH), ctx).toBe(true)
        for (const p of placed) expect(overlaps(f, p), ctx).toBe(false)
      }
      for (let i = 0; i < free.length; i++) {
        for (let j = 0; j < free.length; j++) {
          if (i !== j) expect(contains(free[j], free[i]), ctx).toBe(false)
        }
      }
    }
  })
})
