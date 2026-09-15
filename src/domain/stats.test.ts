import { describe, expect, it } from 'vitest'
import type { Layout } from './layout'
import type { PlacedBox, PlacementPlan } from './packing/planner'
import type { BoxType, Warehouse } from './types'
import { computeStats } from './stats'

const warehouse = (floors: number): Warehouse => ({
  id: 'w1',
  name: 'Склад',
  length: 100,
  width: 100,
  floors,
  clearance: 100,
  rowDepth: 10,
  aisleWidth: 5,
})

// One row per storey, 100 x 10 = 1000 cm².
const oneRowLayout: Layout = {
  bays: [{ x: 0, y: 0, width: 100, height: 10 }],
  aisles: [],
  unusedArea: 0,
}

const boxType = (id: string, weight: number): BoxType => ({
  id,
  name: id,
  color: '#ff0000',
  length: 10,
  width: 10,
  height: 10,
  weight,
  rotatable: true,
})

const placedBox = (boxTypeId: string, floorIndex: number, bayIndex = 0): PlacedBox => ({
  boxTypeId,
  floorIndex,
  bayIndex,
  x: 0,
  y: 0,
  width: 10,
  height: 10,
  rotated: false,
})

function plan(placed: PlacedBox[], unplaced: PlacementPlan['unplaced'] = []): PlacementPlan {
  return {
    placed,
    unplaced,
    placedArea: placed.reduce((sum, p) => sum + p.width * p.height, 0),
    floorsUsed: placed.reduce((max, p) => Math.max(max, p.floorIndex + 1), 0),
    baysUsed: new Set(placed.map((p) => p.floorIndex * 1 + p.bayIndex)).size,
    strategy: { sort: 'area', heuristic: 'BSSF' },
  }
}

describe('computeStats', () => {
  it('reports 0% fill for an empty warehouse', () => {
    const stats = computeStats(oneRowLayout, plan([]), warehouse(1), [])
    expect(stats.fillRate).toBe(0)
    expect(stats.totalArea).toBe(1000)
    expect(stats.placedArea).toBe(0)
    expect(stats.placedCount).toBe(0)
    expect(stats.placedWeight).toBe(0)
  })

  it('reports 100% fill when the row is fully packed', () => {
    const placed = Array.from({ length: 10 }, () => placedBox('a', 0))
    const stats = computeStats(oneRowLayout, plan(placed), warehouse(1), [boxType('a', 2)])
    expect(stats.fillRate).toBe(1)
    expect(stats.placedArea).toBe(1000)
  })

  it('breaks the fill rate down by floor', () => {
    const placed = [placedBox('a', 0), placedBox('a', 0)]
    const stats = computeStats(oneRowLayout, plan(placed), warehouse(2), [boxType('a', 1)])
    expect(stats.byFloor).toEqual([
      { floorIndex: 0, totalArea: 1000, placedArea: 200, fillRate: 0.2 },
      { floorIndex: 1, totalArea: 1000, placedArea: 0, fillRate: 0 },
    ])
  })

  it('breaks placed and unplaced counts down by type, with the rejection reason', () => {
    const placed = [placedBox('a', 0), placedBox('a', 0), placedBox('b', 0)]
    const unplaced = [{ boxTypeId: 'c', quantity: 3, reason: 'too_tall' as const }]
    const types = [boxType('a', 1), boxType('b', 1), boxType('c', 1)]
    const stats = computeStats(oneRowLayout, plan(placed, unplaced), warehouse(1), types)

    expect(stats.byType).toEqual([
      { boxTypeId: 'a', placedCount: 2, unplacedCount: 0, unplacedReason: undefined },
      { boxTypeId: 'b', placedCount: 1, unplacedCount: 0, unplacedReason: undefined },
      { boxTypeId: 'c', placedCount: 0, unplacedCount: 3, unplacedReason: 'too_tall' },
    ])
    expect(stats.placedCount).toBe(3)
    expect(stats.unplacedCount).toBe(3)
  })

  it('omits box types with nothing placed and nothing unplaced', () => {
    const types = [boxType('a', 1), boxType('unused', 1)]
    const stats = computeStats(oneRowLayout, plan([placedBox('a', 0)]), warehouse(1), types)
    expect(stats.byType.map((t) => t.boxTypeId)).toEqual(['a'])
  })

  it('sums the weight of placed boxes only', () => {
    const placed = [placedBox('a', 0), placedBox('a', 0), placedBox('b', 0)]
    const unplaced = [{ boxTypeId: 'c', quantity: 5, reason: 'no_space' as const }]
    const types = [boxType('a', 3), boxType('b', 7), boxType('c', 100)]
    const stats = computeStats(oneRowLayout, plan(placed, unplaced), warehouse(1), types)
    expect(stats.placedWeight).toBe(3 + 3 + 7)
  })
})
