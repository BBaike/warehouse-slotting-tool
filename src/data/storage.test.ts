import { describe, expect, it } from 'vitest'
import type { KeyValueStore } from './storage'
import { STORAGE_KEY, defaultData, loadState, saveState } from './storage'
import { SEED_WAREHOUSE } from './seed'

function memoryStore(initial?: Record<string, string>): KeyValueStore {
  const data = new Map(Object.entries(initial ?? {}))
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value)
    },
  }
}

describe('loadState', () => {
  it('returns the seed with no fallback flag when nothing is stored yet', () => {
    const { data, usedFallback } = loadState(memoryStore())
    expect(usedFallback).toBe(false)
    expect(data).toEqual(defaultData())
  })

  it('round-trips valid data saved earlier', () => {
    const store = memoryStore()
    const data = defaultData()
    saveState(data, store)

    const result = loadState(store)
    expect(result.usedFallback).toBe(false)
    expect(result.data).toEqual(data)
  })

  it('falls back to the seed on broken JSON', () => {
    const store = memoryStore({ [STORAGE_KEY]: '{not json' })
    const { data, usedFallback } = loadState(store)
    expect(usedFallback).toBe(true)
    expect(data).toEqual(defaultData())
  })

  it('falls back to the seed on a foreign schema version', () => {
    const store = memoryStore({
      [STORAGE_KEY]: JSON.stringify({ version: 999, data: defaultData() }),
    })
    const { data, usedFallback } = loadState(store)
    expect(usedFallback).toBe(true)
    expect(data).toEqual(defaultData())
  })

  it('falls back to the seed when a stored warehouse fails validation', () => {
    const broken = defaultData()
    broken.warehouses[0] = { ...broken.warehouses[0], length: -5 }
    const store = memoryStore({
      [STORAGE_KEY]: JSON.stringify({ version: 1, data: broken }),
    })
    const { usedFallback } = loadState(store)
    expect(usedFallback).toBe(true)
  })

  it('falls back to the seed when the batch references a missing box type', () => {
    const broken = defaultData()
    broken.batch = { warehouseId: SEED_WAREHOUSE.id, items: [{ boxTypeId: 'ghost', quantity: 1 }] }
    const store = memoryStore({
      [STORAGE_KEY]: JSON.stringify({ version: 1, data: broken }),
    })
    const { usedFallback } = loadState(store)
    expect(usedFallback).toBe(true)
  })

  it('falls back to the seed when the batch references a missing warehouse', () => {
    const broken = defaultData()
    broken.batch = { warehouseId: 'ghost', items: [] }
    const store = memoryStore({
      [STORAGE_KEY]: JSON.stringify({ version: 1, data: broken }),
    })
    const { usedFallback } = loadState(store)
    expect(usedFallback).toBe(true)
  })

  it('accepts an empty warehouseId as the "nothing selected" sentinel', () => {
    const data = defaultData()
    data.warehouses = []
    data.batch = { warehouseId: '', items: [] }
    const store = memoryStore({ [STORAGE_KEY]: JSON.stringify({ version: 1, data }) })
    const result = loadState(store)
    expect(result.usedFallback).toBe(false)
    expect(result.data).toEqual(data)
  })

  it('falls back to the seed when the stored value is not an object', () => {
    const store = memoryStore({ [STORAGE_KEY]: JSON.stringify([1, 2, 3]) })
    const { usedFallback } = loadState(store)
    expect(usedFallback).toBe(true)
  })
})

describe('saveState', () => {
  it('never throws even when the underlying store is broken', () => {
    const store: KeyValueStore = {
      getItem: () => null,
      setItem: () => {
        throw new Error('quota exceeded')
      },
    }
    expect(() => saveState(defaultData(), store)).not.toThrow()
  })
})
