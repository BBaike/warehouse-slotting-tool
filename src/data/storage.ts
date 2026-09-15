import { validateBoxType, validateWarehouse } from '../domain/validation'
import type { Batch, BoxType, Warehouse } from '../domain/types'
import { SEED_BOX_TYPES, SEED_WAREHOUSE } from './seed'

export interface AppData {
  warehouses: Warehouse[]
  boxTypes: BoxType[]
  batch: Batch
}

/** Minimal key-value contract so tests can inject an in-memory store instead of `localStorage`. */
export interface KeyValueStore {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export const STORAGE_KEY = 'warehouse-slotting-tool:v1'
const SCHEMA_VERSION = 1

interface StoredEnvelope {
  version: number
  data: AppData
}

function defaultStore(): KeyValueStore {
  if (typeof localStorage !== 'undefined') return localStorage
  // No-op fallback for environments without localStorage (SSR, some test runners).
  return { getItem: () => null, setItem: () => {} }
}

export function defaultData(): AppData {
  return {
    warehouses: [SEED_WAREHOUSE],
    boxTypes: SEED_BOX_TYPES,
    batch: { warehouseId: SEED_WAREHOUSE.id, items: [] },
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isValidWarehouse(value: unknown): value is Warehouse {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    validateWarehouse(value as unknown as Warehouse).length === 0
  )
}

function isValidBoxType(value: unknown): value is BoxType {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    validateBoxType(value as unknown as BoxType).length === 0
  )
}

function isValidBatch(value: unknown, warehouses: Warehouse[], boxTypes: BoxType[]): value is Batch {
  if (!isRecord(value) || typeof value.warehouseId !== 'string' || !Array.isArray(value.items)) {
    return false
  }
  // '' is the sentinel for "no warehouse selected" (e.g. after the last warehouse was deleted).
  const warehouseKnown = value.warehouseId === '' || warehouses.some((w) => w.id === value.warehouseId)
  if (!warehouseKnown) return false
  return value.items.every((item) => {
    if (!isRecord(item) || typeof item.boxTypeId !== 'string') return false
    if (!boxTypes.some((b) => b.id === item.boxTypeId)) return false
    return Number.isInteger(item.quantity) && (item.quantity as number) >= 0
  })
}

function isValidData(value: unknown): value is AppData {
  if (!isRecord(value)) return false
  const { warehouses, boxTypes, batch } = value
  if (!Array.isArray(warehouses) || !warehouses.every(isValidWarehouse)) return false
  if (!Array.isArray(boxTypes) || !boxTypes.every(isValidBoxType)) return false
  return isValidBatch(batch, warehouses, boxTypes)
}

export interface LoadResult {
  data: AppData
  /** True when stored data was missing/corrupt/incompatible and the seed was used instead. */
  usedFallback: boolean
}

export function loadState(store: KeyValueStore = defaultStore()): LoadResult {
  const raw = store.getItem(STORAGE_KEY)
  if (raw === null) {
    return { data: defaultData(), usedFallback: false }
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { data: defaultData(), usedFallback: true }
  }

  if (
    !isRecord(parsed) ||
    (parsed as Partial<StoredEnvelope>).version !== SCHEMA_VERSION ||
    !isValidData((parsed as Partial<StoredEnvelope>).data)
  ) {
    return { data: defaultData(), usedFallback: true }
  }

  return { data: (parsed as unknown as StoredEnvelope).data, usedFallback: false }
}

export function saveState(data: AppData, store: KeyValueStore = defaultStore()): void {
  const envelope: StoredEnvelope = { version: SCHEMA_VERSION, data }
  try {
    store.setItem(STORAGE_KEY, JSON.stringify(envelope))
  } catch {
    // Storage may be full or unavailable (private mode); losing persistence is not fatal.
  }
}
