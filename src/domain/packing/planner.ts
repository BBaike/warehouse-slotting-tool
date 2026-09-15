// Batch planner: lays a batch of boxes out over the rows of every storey.
// Each row is packed with MaxRects; the whole run is repeated for every
// sort order × heuristic and the best result is kept. The result is close to
// optimal, not guaranteed optimal: 2D packing is NP-hard.

import { buildLayout } from '../layout'
import type { Batch, BoxType, Rect, Warehouse } from '../types'
import { HEURISTICS, MaxRectsBin, type Heuristic } from './maxRects'

/**
 * - `too_tall` the box is taller than the storey clearance.
 * - `too_large` the box footprint fits a row in no allowed orientation.
 * - `no_space` the box would fit a row, but every row is already full.
 */
export type UnplacedReason = 'too_tall' | 'too_large' | 'no_space'

/** Order in which box instances are fed to the packer, always largest first. */
export type SortOrder = 'area' | 'longSide' | 'perimeter'

export const SORT_ORDERS: readonly SortOrder[] = ['area', 'longSide', 'perimeter']

export interface Strategy {
  sort: SortOrder
  heuristic: Heuristic
}

export const STRATEGIES: readonly Strategy[] = SORT_ORDERS.flatMap((sort) =>
  HEURISTICS.map((heuristic) => ({ sort, heuristic })),
)

/** A placed box in floor coordinates. `width` runs along the floor length, as in `Rect`. */
export interface PlacedBox extends Rect {
  boxTypeId: string
  /** Zero-based storey index. */
  floorIndex: number
  /** Index into `Layout.bays`; the same on every storey. */
  bayIndex: number
  /** `true` when the box stands turned 90°: its length runs across the row. */
  rotated: boolean
}

export interface UnplacedItem {
  boxTypeId: string
  quantity: number
  reason: UnplacedReason
}

export interface PlacementPlan {
  placed: PlacedBox[]
  /** At most one entry per box type, in batch order. */
  unplaced: UnplacedItem[]
  /** Total footprint of the placed boxes, cm². */
  placedArea: number
  /** Storeys holding at least one box. */
  floorsUsed: number
  /** Rows, over all storeys, holding at least one box. */
  baysUsed: number
  /** The run this plan came from. */
  strategy: Strategy
}

/** Batch items resolved against the catalogue, with quantities of repeated types merged. */
interface Demand {
  type: BoxType
  quantity: number
}

/**
 * Plans the batch with every strategy and keeps the best plan: the largest placed
 * area, then fewer storeys, then fewer rows; on a full tie the earlier strategy wins.
 *
 * Expects inputs that passed validation. Throws if the batch names another
 * warehouse or a box type missing from `boxTypes`.
 */
export function planPlacement(warehouse: Warehouse, boxTypes: BoxType[], batch: Batch): PlacementPlan {
  let best: PlacementPlan | null = null
  for (const strategy of STRATEGIES) {
    const plan = planWithStrategy(warehouse, boxTypes, batch, strategy)
    if (best === null || isBetterPlan(plan, best)) best = plan
  }
  return best!
}

/** A single run of the planner with a fixed sort order and heuristic. */
export function planWithStrategy(
  warehouse: Warehouse,
  boxTypes: BoxType[],
  batch: Batch,
  strategy: Strategy,
): PlacementPlan {
  if (batch.warehouseId !== warehouse.id) {
    throw new Error(`Batch belongs to warehouse ${batch.warehouseId}, not ${warehouse.id}`)
  }

  const { bays } = buildLayout(warehouse)
  const unplacedByType = new Map<string, UnplacedItem>()
  const reject = (type: BoxType, quantity: number, reason: UnplacedReason) =>
    unplacedByType.set(type.id, { boxTypeId: type.id, quantity, reason })

  const demands = resolveDemands(boxTypes, batch)
  const packable: Demand[] = []
  for (const demand of demands) {
    const { type, quantity } = demand
    if (type.height > warehouse.clearance) reject(type, quantity, 'too_tall')
    else if (!fitsRow(type, warehouse.length, warehouse.rowDepth)) reject(type, quantity, 'too_large')
    else packable.push(demand)
  }

  // Bins in traversal order: storey 1 rows in order, then storey 2, …
  const bins = Array.from({ length: warehouse.floors * bays.length }, () => null as MaxRectsBin | null)
  const placed: PlacedBox[] = []
  const usedBins = new Set<number>()

  for (const { type, quantity } of sortDemands(packable, strategy.sort)) {
    // Free space only shrinks, so a bin that rejected this type rejects it for good:
    // the next instance of the type resumes from the first bin not yet ruled out.
    let binIndex = 0
    let left = quantity
    while (left > 0 && binIndex < bins.length) {
      const bay = bays[binIndex % bays.length]
      const bin = (bins[binIndex] ??= new MaxRectsBin(bay.width, bay.height))
      const p = bin.insert(type.length, type.width, type.rotatable, strategy.heuristic)
      if (p === null) {
        binIndex++
        continue
      }
      placed.push({
        boxTypeId: type.id,
        floorIndex: Math.floor(binIndex / bays.length),
        bayIndex: binIndex % bays.length,
        x: bay.x + p.x,
        y: bay.y + p.y,
        width: p.width,
        height: p.height,
        rotated: p.rotated,
      })
      usedBins.add(binIndex)
      left--
    }
    if (left > 0) reject(type, left, 'no_space')
  }

  const unplaced = demands.flatMap(({ type }) => unplacedByType.get(type.id) ?? [])

  return {
    placed,
    unplaced,
    placedArea: placed.reduce((sum, p) => sum + p.width * p.height, 0),
    floorsUsed: placed.reduce((max, p) => Math.max(max, p.floorIndex + 1), 0),
    baysUsed: usedBins.size,
    strategy,
  }
}

function resolveDemands(boxTypes: BoxType[], batch: Batch): Demand[] {
  const typeById = new Map(boxTypes.map((t) => [t.id, t]))
  const demands = new Map<string, Demand>()
  for (const { boxTypeId, quantity } of batch.items) {
    const type = typeById.get(boxTypeId)
    if (type === undefined) throw new Error(`Unknown box type ${boxTypeId}`)
    if (quantity <= 0) continue
    const demand = demands.get(boxTypeId)
    if (demand) demand.quantity += quantity
    else demands.set(boxTypeId, { type, quantity })
  }
  return [...demands.values()]
}

/** Whether the footprint fits a `rowLength` × `rowDepth` row in an allowed orientation. */
function fitsRow({ length, width, rotatable }: BoxType, rowLength: number, rowDepth: number): boolean {
  return (length <= rowLength && width <= rowDepth) || (rotatable && width <= rowLength && length <= rowDepth)
}

const area = (t: BoxType) => t.length * t.width
const longSide = (t: BoxType) => Math.max(t.length, t.width)
const perimeter = (t: BoxType) => t.length + t.width

/** Descending sort keys; ties fall through to the next key, then to batch order. */
const SORT_KEYS: Record<SortOrder, ((t: BoxType) => number)[]> = {
  area: [area, longSide],
  longSide: [longSide, area],
  perimeter: [perimeter, area],
}

function sortDemands(demands: Demand[], order: SortOrder): Demand[] {
  const keys = SORT_KEYS[order]
  // Array.prototype.sort is stable, so equal types keep their batch order.
  return [...demands].sort((a, b) => {
    for (const key of keys) {
      const diff = key(b.type) - key(a.type)
      if (diff !== 0) return diff
    }
    return 0
  })
}

function isBetterPlan(a: PlacementPlan, b: PlacementPlan): boolean {
  if (a.placedArea !== b.placedArea) return a.placedArea > b.placedArea
  if (a.floorsUsed !== b.floorsUsed) return a.floorsUsed < b.floorsUsed
  return a.baysUsed < b.baysUsed
}
