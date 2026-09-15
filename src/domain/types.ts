// Domain model. All dimensions are integer centimetres, weight is kilograms.

export interface Warehouse {
  id: string
  name: string
  /** Floor length of a single storey. */
  length: number
  /** Floor width of a single storey; rows and aisles are laid out across it. */
  width: number
  /** Number of storeys separated by shelves. */
  floors: number
  /** Usable height of a storey, from floor or shelf to the next shelf. */
  clearance: number
  /** Depth of one storage row. */
  rowDepth: number
  aisleWidth: number
}

export interface BoxType {
  id: string
  name: string
  /** CSS hex colour, `#rrggbb`. */
  color: string
  length: number
  width: number
  height: number
  weight: number
  /** Whether the box may be turned 90° in the floor plane. */
  rotatable: boolean
}

export interface BatchItem {
  boxTypeId: string
  quantity: number
}

export interface Batch {
  warehouseId: string
  items: BatchItem[]
}

/** Axis-aligned rectangle on a floor: `x` runs along the length, `y` across the width. */
export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export interface ValidationError {
  /** Path of the offending field, e.g. `width` or `items[2].quantity`. */
  field: string
  /** Human-readable message in Russian that names the field. */
  message: string
}
