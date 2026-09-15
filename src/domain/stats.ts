// Placement statistics: fill rate, placed/unplaced counts, weight. Read-only view
// over a `Layout` and a `PlacementPlan`, both already computed by the planner.

import type { PlacedBox, PlacementPlan, UnplacedReason } from './packing/planner'
import type { Layout } from './layout'
import type { BoxType, Warehouse } from './types'

export interface FloorStats {
  floorIndex: number
  totalArea: number
  placedArea: number
  /** 0..1; 0 when the floor has no rows. */
  fillRate: number
}

export interface TypeStats {
  boxTypeId: string
  placedCount: number
  unplacedCount: number
  unplacedReason?: UnplacedReason
}

export interface Stats {
  totalArea: number
  placedArea: number
  /** 0..1; 0 when the warehouse has no rows. */
  fillRate: number
  byFloor: FloorStats[]
  byType: TypeStats[]
  placedCount: number
  unplacedCount: number
  /** Total weight of the placed boxes, kg. */
  placedWeight: number
}

/**
 * Aggregates a `PlacementPlan` into figures for the UI. `layout` is the shared
 * single-storey plan from `buildLayout`; every storey of `warehouse` repeats it.
 */
export function computeStats(
  layout: Layout,
  plan: PlacementPlan,
  warehouse: Warehouse,
  boxTypes: BoxType[],
): Stats {
  const floorArea = layout.bays.reduce((sum, bay) => sum + bay.width * bay.height, 0)
  const byFloor = computeFloorStats(warehouse.floors, floorArea, plan.placed)
  const byType = computeTypeStats(boxTypes, plan)

  const totalArea = floorArea * warehouse.floors
  const weightById = new Map(boxTypes.map((t) => [t.id, t.weight]))
  const placedWeight = plan.placed.reduce((sum, p) => sum + (weightById.get(p.boxTypeId) ?? 0), 0)
  const unplacedCount = plan.unplaced.reduce((sum, u) => sum + u.quantity, 0)

  return {
    totalArea,
    placedArea: plan.placedArea,
    fillRate: fillRate(plan.placedArea, totalArea),
    byFloor,
    byType,
    placedCount: plan.placed.length,
    unplacedCount,
    placedWeight,
  }
}

function computeFloorStats(floors: number, floorArea: number, placed: PlacedBox[]): FloorStats[] {
  const placedAreaByFloor = new Map<number, number>()
  for (const p of placed) {
    placedAreaByFloor.set(p.floorIndex, (placedAreaByFloor.get(p.floorIndex) ?? 0) + p.width * p.height)
  }

  return Array.from({ length: floors }, (_, floorIndex) => {
    const placedArea = placedAreaByFloor.get(floorIndex) ?? 0
    return { floorIndex, totalArea: floorArea, placedArea, fillRate: fillRate(placedArea, floorArea) }
  })
}

function computeTypeStats(boxTypes: BoxType[], plan: PlacementPlan): TypeStats[] {
  const placedCountById = new Map<string, number>()
  for (const p of plan.placed) {
    placedCountById.set(p.boxTypeId, (placedCountById.get(p.boxTypeId) ?? 0) + 1)
  }
  const unplacedById = new Map(plan.unplaced.map((u) => [u.boxTypeId, u]))

  return boxTypes
    .map((type) => {
      const placedCount = placedCountById.get(type.id) ?? 0
      const unplaced = unplacedById.get(type.id)
      return {
        boxTypeId: type.id,
        placedCount,
        unplacedCount: unplaced?.quantity ?? 0,
        unplacedReason: unplaced?.reason,
      }
    })
    .filter((t) => t.placedCount > 0 || t.unplacedCount > 0)
}

function fillRate(placedArea: number, totalArea: number): number {
  return totalArea === 0 ? 0 : placedArea / totalArea
}
