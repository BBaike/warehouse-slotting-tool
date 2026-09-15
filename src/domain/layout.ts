import type { Rect, Warehouse } from './types'

/** Floor plan of a single storey; every storey of a warehouse is identical. */
export interface Layout {
  /** Storage rows, ordered across the width. Each spans the full floor length. */
  bays: Rect[]
  /** Aisles, ordered across the width. Each spans the full floor length. */
  aisles: Rect[]
  /** Floor area covered by neither a row nor an aisle, in cm². */
  unusedArea: number
}

/**
 * Cuts the floor across its width into `row | aisle | row`, `row | aisle | row`, …
 *
 * Back-to-back rows share one aisle, which is the densest pattern, so the floor is
 * filled with such pairs first. If the remaining width still fits a row with its own
 * aisle, one single row is added. Whatever is left is unused: a row deeper than
 * `rowDepth` could not be reached from its aisle, and a row without an aisle not at all.
 *
 * Expects a warehouse that passed `validateWarehouse`.
 */
export function buildLayout(warehouse: Warehouse): Layout {
  const { length, width, rowDepth, aisleWidth } = warehouse
  const bays: Rect[] = []
  const aisles: Rect[] = []
  const strip = (y: number, height: number): Rect => ({ x: 0, y, width: length, height })

  const pairWidth = 2 * rowDepth + aisleWidth
  let y = 0

  while (y + pairWidth <= width) {
    bays.push(strip(y, rowDepth))
    aisles.push(strip(y + rowDepth, aisleWidth))
    bays.push(strip(y + rowDepth + aisleWidth, rowDepth))
    y += pairWidth
  }

  if (y + rowDepth + aisleWidth <= width) {
    bays.push(strip(y, rowDepth))
    aisles.push(strip(y + rowDepth, aisleWidth))
    y += rowDepth + aisleWidth
  }

  return { bays, aisles, unusedArea: (width - y) * length }
}
