import { describe, expect, it } from 'vitest'
import { buildLayout } from './layout'
import type { Rect, Warehouse } from './types'

const seed: Warehouse = {
  id: 'w1',
  name: 'Тестовое помещение',
  length: 900,
  width: 800,
  floors: 2,
  clearance: 60,
  rowDepth: 120,
  aisleWidth: 150,
}

const withWidth = (width: number, overrides: Partial<Warehouse> = {}): Warehouse => ({
  ...seed,
  ...overrides,
  width,
})

const area = (r: Rect) => r.width * r.height

const overlaps = (a: Rect, b: Rect) =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height

/** Checks every structural invariant a layout must hold for the given warehouse. */
function expectConsistent(warehouse: Warehouse) {
  const { bays, aisles, unusedArea } = buildLayout(warehouse)
  const all = [...bays, ...aisles]

  const covered = all.reduce((sum, r) => sum + area(r), 0)
  expect(covered + unusedArea).toBe(warehouse.length * warehouse.width)
  expect(unusedArea).toBeGreaterThanOrEqual(0)

  for (const r of all) {
    expect(r.x).toBe(0)
    expect(r.width).toBe(warehouse.length)
    expect(r.y).toBeGreaterThanOrEqual(0)
    expect(r.y + r.height).toBeLessThanOrEqual(warehouse.width)
  }
  for (const bay of bays) expect(bay.height).toBe(warehouse.rowDepth)
  for (const aisle of aisles) expect(aisle.height).toBe(warehouse.aisleWidth)

  for (let i = 0; i < all.length; i++) {
    for (let j = i + 1; j < all.length; j++) {
      expect(overlaps(all[i], all[j])).toBe(false)
    }
  }

  // Every bay must be reachable: it touches an aisle along its long side.
  for (const bay of bays) {
    const touchesAisle = aisles.some(
      (a) => a.y === bay.y + bay.height || a.y + a.height === bay.y,
    )
    expect(touchesAisle).toBe(true)
  }
}

describe('buildLayout', () => {
  it('fills a width that exactly fits the row-aisle-row pattern', () => {
    const layout = buildLayout(withWidth(780))

    expect(layout.bays.map((b) => b.y)).toEqual([0, 270, 390, 660])
    expect(layout.aisles.map((a) => a.y)).toEqual([120, 510])
    expect(layout.unusedArea).toBe(0)
  })

  it('leaves a remainder narrower than a row unused', () => {
    const layout = buildLayout(seed)

    expect(layout.bays).toHaveLength(4)
    expect(layout.aisles).toHaveLength(2)
    expect(layout.unusedArea).toBe(20 * 900)
  })

  it('adds a single row with its own aisle when the remainder fits one', () => {
    // 390 (row-aisle-row) + 270 (row-aisle) = 660
    const layout = buildLayout(withWidth(660))

    expect(layout.bays.map((b) => b.y)).toEqual([0, 270, 390])
    expect(layout.aisles.map((a) => a.y)).toEqual([120, 510])
    expect(layout.unusedArea).toBe(0)
  })

  it('places one row when the floor fits exactly a row and an aisle', () => {
    const layout = buildLayout(withWidth(270))

    expect(layout.bays).toEqual([{ x: 0, y: 0, width: 900, height: 120 }])
    expect(layout.aisles).toEqual([{ x: 0, y: 120, width: 900, height: 150 }])
    expect(layout.unusedArea).toBe(0)
  })

  it('has no rows when the floor is narrower than one row with its aisle', () => {
    const layout = buildLayout(withWidth(200))

    expect(layout.bays).toEqual([])
    expect(layout.aisles).toEqual([])
    expect(layout.unusedArea).toBe(200 * 900)
  })

  it('has no rows when the floor is narrower than a single row', () => {
    const layout = buildLayout(withWidth(100))

    expect(layout.bays).toEqual([])
    expect(layout.unusedArea).toBe(100 * 900)
  })

  it('has no rows when the aisle is wider than the floor', () => {
    const layout = buildLayout(withWidth(800, { aisleWidth: 900 }))

    expect(layout.bays).toEqual([])
    expect(layout.aisles).toEqual([])
    expect(layout.unusedArea).toBe(800 * 900)
  })

  it('does not depend on the number of floors', () => {
    expect(buildLayout({ ...seed, floors: 5 })).toEqual(buildLayout({ ...seed, floors: 1 }))
  })

  it('keeps areas balanced, rects disjoint and every row accessible across many sizes', () => {
    for (let width = 1; width <= 1200; width += 7) {
      for (const rowDepth of [40, 120, 250]) {
        for (const aisleWidth of [60, 150, 400]) {
          expectConsistent({ ...seed, length: 530, width, rowDepth, aisleWidth })
        }
      }
    }
  })

  it('never loses rows when the floor gets wider', () => {
    let previous = 0
    for (let width = 1; width <= 2000; width++) {
      const rows = buildLayout(withWidth(width)).bays.length
      expect(rows).toBeGreaterThanOrEqual(previous)
      previous = rows
    }
  })
})
