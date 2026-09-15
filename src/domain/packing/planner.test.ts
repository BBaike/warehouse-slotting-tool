import { describe, expect, it } from 'vitest'
import { STRATEGIES, planPlacement, planWithStrategy, type PlacementPlan } from './planner'
import { buildLayout } from '../layout'
import type { Batch, BoxType, Rect, Warehouse } from '../types'
import { mulberry32, randomInt } from '../testing/random'

const warehouse = (overrides: Partial<Warehouse> = {}): Warehouse => ({
  id: 'w1',
  name: 'Склад',
  length: 900,
  width: 800,
  floors: 2,
  clearance: 60,
  rowDepth: 120,
  aisleWidth: 150,
  ...overrides,
})

const box = (id: string, length: number, width: number, height: number, rotatable = true): BoxType => ({
  id,
  name: id,
  color: '#336699',
  length,
  width,
  height,
  weight: 1,
  rotatable,
})

const batch = (items: [boxTypeId: string, quantity: number][], warehouseId = 'w1'): Batch => ({
  warehouseId,
  items: items.map(([boxTypeId, quantity]) => ({ boxTypeId, quantity })),
})

/** One 100 × 50 row per storey: the pair pattern needs 150 cm, a single row with aisle exactly 100. */
const oneRowPerFloor = (floors: number) =>
  warehouse({ length: 100, width: 100, rowDepth: 50, aisleWidth: 50, floors, clearance: 50 })

const overlaps = (a: Rect, b: Rect) =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height

const contains = (outer: Rect, inner: Rect) =>
  inner.x >= outer.x &&
  inner.y >= outer.y &&
  inner.x + inner.width <= outer.x + outer.width &&
  inner.y + inner.height <= outer.y + outer.height

/** Lexicographic key of the selection rule; lower is better. */
const rank = (plan: PlacementPlan) => [-plan.placedArea, plan.floorsUsed, plan.baysUsed]

const lexLessOrEqual = (a: number[], b: number[]) => {
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return a[i] < b[i]
  }
  return true
}

describe('planPlacement', () => {
  describe('rejection reasons', () => {
    it('rejects boxes taller than the storey clearance as too_tall', () => {
      const plan = planPlacement(warehouse({ clearance: 60 }), [box('tall', 40, 40, 61)], batch([['tall', 3]]))

      expect(plan.placed).toEqual([])
      expect(plan.unplaced).toEqual([{ boxTypeId: 'tall', quantity: 3, reason: 'too_tall' }])
    })

    it('accepts a box exactly as tall as the clearance', () => {
      const plan = planPlacement(warehouse({ clearance: 60 }), [box('b', 40, 40, 60)], batch([['b', 1]]))

      expect(plan.placed).toHaveLength(1)
      expect(plan.unplaced).toEqual([])
    })

    it('rejects boxes that fit a row in no orientation as too_large', () => {
      const plan = planPlacement(warehouse({ rowDepth: 120 }), [box('wide', 130, 130, 10)], batch([['wide', 2]]))

      expect(plan.unplaced).toEqual([{ boxTypeId: 'wide', quantity: 2, reason: 'too_large' }])
    })

    it('rejects a non-rotatable box that would only fit turned as too_large', () => {
      const types = [box('fixed', 120, 200, 10, false)]
      const plan = planPlacement(warehouse({ rowDepth: 120 }), types, batch([['fixed', 1]]))

      expect(plan.unplaced).toEqual([{ boxTypeId: 'fixed', quantity: 1, reason: 'too_large' }])
    })

    it('turns a rotatable box that only fits turned', () => {
      const types = [box('turn', 120, 200, 10, true)]
      const plan = planPlacement(warehouse({ rowDepth: 120 }), types, batch([['turn', 1]]))

      expect(plan.unplaced).toEqual([])
      expect(plan.placed[0]).toMatchObject({ width: 200, height: 120, rotated: true })
    })

    it('reports too_tall before too_large', () => {
      const plan = planPlacement(warehouse(), [box('huge', 500, 500, 500)], batch([['huge', 1]]))

      expect(plan.unplaced).toEqual([{ boxTypeId: 'huge', quantity: 1, reason: 'too_tall' }])
    })

    it('reports the boxes left over when the warehouse is full as no_space', () => {
      const plan = planPlacement(oneRowPerFloor(1), [box('sq', 50, 50, 10)], batch([['sq', 5]]))

      expect(plan.placed).toHaveLength(2)
      expect(plan.unplaced).toEqual([{ boxTypeId: 'sq', quantity: 3, reason: 'no_space' }])
    })

    it('reports no_space when the floor is too narrow for any row', () => {
      const narrow = warehouse({ width: 200, rowDepth: 120, aisleWidth: 150 })
      expect(buildLayout(narrow).bays).toEqual([])

      const plan = planPlacement(narrow, [box('b', 40, 40, 40)], batch([['b', 4]]))
      expect(plan.unplaced).toEqual([{ boxTypeId: 'b', quantity: 4, reason: 'no_space' }])
    })

    it('lists unplaced types in batch order, one entry per type', () => {
      const types = [box('tall', 10, 10, 100), box('sq', 50, 50, 10), box('wide', 60, 60, 10)]
      const plan = planPlacement(
        oneRowPerFloor(1),
        types,
        batch([['wide', 1], ['sq', 3], ['tall', 2], ['sq', 1]]),
      )

      expect(plan.unplaced).toEqual([
        { boxTypeId: 'wide', quantity: 1, reason: 'too_large' },
        { boxTypeId: 'sq', quantity: 2, reason: 'no_space' },
        { boxTypeId: 'tall', quantity: 2, reason: 'too_tall' },
      ])
    })
  })

  describe('traversal', () => {
    it('sends the overflow of the first storey to the second one', () => {
      const plan = planPlacement(oneRowPerFloor(2), [box('sq', 50, 50, 10)], batch([['sq', 3]]))

      expect(plan.unplaced).toEqual([])
      expect(plan.placed.map((p) => p.floorIndex).sort()).toEqual([0, 0, 1])
      expect(plan.floorsUsed).toBe(2)
      expect(plan.baysUsed).toBe(2)
    })

    it('fills the rows of a storey in order before moving on', () => {
      // Seed warehouse: four 900 × 120 rows per storey; 22 boxes of 40 × 120 fill one row exactly.
      const plan = planPlacement(warehouse(), [box('slab', 40, 120, 10, false)], batch([['slab', 23]]))

      expect(plan.placed.filter((p) => p.bayIndex === 0)).toHaveLength(22)
      expect(plan.placed.filter((p) => p.bayIndex === 1)).toHaveLength(1)
      expect(plan.floorsUsed).toBe(1)
    })

    it('places boxes in floor coordinates inside their row', () => {
      const layout = buildLayout(warehouse())
      const plan = planPlacement(warehouse(), [box('slab', 40, 120, 10, false)], batch([['slab', 23]]))
      const inSecondRow = plan.placed.find((p) => p.bayIndex === 1)

      expect(inSecondRow).toMatchObject({ y: layout.bays[1].y, height: 120 })
    })

    it('ignores zero quantities and returns an empty plan for an empty batch', () => {
      const plan = planPlacement(warehouse(), [box('b', 40, 40, 40)], batch([['b', 0]]))

      expect(plan).toMatchObject({ placed: [], unplaced: [], placedArea: 0, floorsUsed: 0, baysUsed: 0 })
    })
  })

  describe('input contract', () => {
    it('throws on a box type missing from the catalogue', () => {
      expect(() => planPlacement(warehouse(), [], batch([['ghost', 1]]))).toThrow(/ghost/)
    })

    it('throws when the batch belongs to another warehouse', () => {
      expect(() => planPlacement(warehouse(), [box('b', 40, 40, 40)], batch([['b', 1]], 'w2'))).toThrow(/w2/)
    })
  })

  describe('multistart', () => {
    it('runs every sort order with every heuristic', () => {
      expect(STRATEGIES).toHaveLength(9)
      expect(new Set(STRATEGIES.map((s) => `${s.sort}/${s.heuristic}`)).size).toBe(9)
    })

    it('picks the best single run by area, then storeys, then rows', () => {
      for (let seed = 1; seed <= 60; seed++) {
        const { wh, types, b } = randomCase(seed)
        const best = planPlacement(wh, types, b)

        for (const strategy of STRATEGIES) {
          const single = planWithStrategy(wh, types, b, strategy)
          expect(lexLessOrEqual(rank(best), rank(single)), `seed ${seed}, ${strategy.sort}/${strategy.heuristic}`).toBe(
            true,
          )
        }
        expect(best).toEqual(planWithStrategy(wh, types, b, best.strategy))
      }
    })

    it('is deterministic', () => {
      const { wh, types, b } = randomCase(7)
      expect(planPlacement(wh, types, b)).toEqual(planPlacement(wh, types, b))
    })
  })

  it('holds its invariants on random batches', () => {
    for (let seed = 1; seed <= 150; seed++) {
      const { wh, types, b } = randomCase(seed)
      const plan = planPlacement(wh, types, b)
      const layout = buildLayout(wh)
      const typeById = new Map(types.map((t) => [t.id, t]))
      const ctx = `seed ${seed}`

      for (const [i, p] of plan.placed.entries()) {
        const where = `${ctx}, box #${i}`
        const type = typeById.get(p.boxTypeId)!
        expect(p.floorIndex, where).toBeGreaterThanOrEqual(0)
        expect(p.floorIndex, where).toBeLessThan(wh.floors)
        expect(contains(layout.bays[p.bayIndex], p), where).toBe(true)
        expect(type.height, where).toBeLessThanOrEqual(wh.clearance)
        if (p.rotated) {
          expect(type.rotatable, where).toBe(true)
          expect([p.width, p.height], where).toEqual([type.width, type.length])
        } else {
          expect([p.width, p.height], where).toEqual([type.length, type.width])
        }
        for (const q of plan.placed.slice(0, i)) {
          if (q.floorIndex === p.floorIndex) expect(overlaps(p, q), where).toBe(false)
        }
      }

      const area = plan.placed.reduce((s, p) => s + p.width * p.height, 0)
      expect(plan.placedArea, ctx).toBe(area)

      for (const t of types) {
        const requested = b.items.filter((it) => it.boxTypeId === t.id).reduce((s, it) => s + it.quantity, 0)
        const placed = plan.placed.filter((p) => p.boxTypeId === t.id).length
        const unplaced = plan.unplaced.find((u) => u.boxTypeId === t.id)?.quantity ?? 0
        expect(placed + unplaced, `${ctx}, type ${t.id}`).toBe(requested)
      }
    }
  })

  it('plans a batch of 300 boxes in under 500 ms', () => {
    const types = [box('big', 60, 40, 40), box('square', 40, 40, 40), box('small', 40, 30, 30)]
    const b = batch([['big', 100], ['square', 100], ['small', 100]])
    // One storey so the seed warehouse overflows and every run touches every row.
    const wh = warehouse({ floors: 1 })

    planPlacement(wh, types, b) // warm-up
    const start = performance.now()
    const plan = planPlacement(wh, types, b)
    const elapsed = performance.now() - start

    expect(plan.unplaced.some((u) => u.reason === 'no_space')).toBe(true)
    expect(elapsed).toBeLessThan(500)
  })
})

function randomCase(seed: number) {
  const rnd = mulberry32(seed)
  const int = (min: number, max: number) => randomInt(rnd, min, max)

  const rowDepth = int(30, 150)
  const aisleWidth = int(50, 200)
  const wh = warehouse({
    length: int(100, 1200),
    width: int(rowDepth, 900),
    floors: int(1, 3),
    clearance: int(30, 120),
    rowDepth,
    aisleWidth,
  })

  const types = Array.from({ length: int(1, 5) }, (_, i) =>
    box(`t${i}`, int(10, 160), int(10, 160), int(10, 130), rnd() < 0.7),
  )
  const b = batch(types.map((t) => [t.id, int(0, 60)] as [string, number]))
  return { wh, types, b }
}
