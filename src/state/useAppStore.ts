import { useEffect, useState } from 'react'
import type { Batch, BoxType, Warehouse } from '../domain/types'
import { defaultData, loadState, saveState } from '../data/storage'

function generateId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`
}

export interface AppStore {
  warehouses: Warehouse[]
  boxTypes: BoxType[]
  batch: Batch
  /** True when stored data was corrupt/incompatible and the seed was loaded instead. */
  usedFallback: boolean
  addWarehouse: (warehouse: Omit<Warehouse, 'id'>) => Warehouse
  updateWarehouse: (warehouse: Warehouse) => void
  removeWarehouse: (id: string) => void
  addBoxType: (boxType: Omit<BoxType, 'id'>) => BoxType
  updateBoxType: (boxType: BoxType) => void
  removeBoxType: (id: string) => void
  setBatch: (batch: Batch) => void
  resetToDefaults: () => void
}

export function useAppStore(): AppStore {
  const [initial] = useState(() => loadState())
  const [usedFallback] = useState(initial.usedFallback)
  const [warehouses, setWarehouses] = useState<Warehouse[]>(initial.data.warehouses)
  const [boxTypes, setBoxTypes] = useState<BoxType[]>(initial.data.boxTypes)
  const [batch, setBatchState] = useState<Batch>(initial.data.batch)

  useEffect(() => {
    saveState({ warehouses, boxTypes, batch })
  }, [warehouses, boxTypes, batch])

  function addWarehouse(warehouse: Omit<Warehouse, 'id'>): Warehouse {
    const created: Warehouse = { ...warehouse, id: generateId('warehouse') }
    setWarehouses((prev) => [...prev, created])
    return created
  }

  function updateWarehouse(warehouse: Warehouse): void {
    setWarehouses((prev) => prev.map((w) => (w.id === warehouse.id ? warehouse : w)))
  }

  function removeWarehouse(id: string): void {
    setWarehouses((prev) => prev.filter((w) => w.id !== id))
    setBatchState((prev) => (prev.warehouseId === id ? { warehouseId: '', items: [] } : prev))
  }

  function addBoxType(boxType: Omit<BoxType, 'id'>): BoxType {
    const created: BoxType = { ...boxType, id: generateId('box-type') }
    setBoxTypes((prev) => [...prev, created])
    return created
  }

  function updateBoxType(boxType: BoxType): void {
    setBoxTypes((prev) => prev.map((b) => (b.id === boxType.id ? boxType : b)))
  }

  function removeBoxType(id: string): void {
    setBoxTypes((prev) => prev.filter((b) => b.id !== id))
    setBatchState((prev) => ({
      ...prev,
      items: prev.items.filter((item) => item.boxTypeId !== id),
    }))
  }

  function setBatch(next: Batch): void {
    setBatchState(next)
  }

  function resetToDefaults(): void {
    const fresh = defaultData()
    setWarehouses(fresh.warehouses)
    setBoxTypes(fresh.boxTypes)
    setBatchState(fresh.batch)
  }

  return {
    warehouses,
    boxTypes,
    batch,
    usedFallback,
    addWarehouse,
    updateWarehouse,
    removeWarehouse,
    addBoxType,
    updateBoxType,
    removeBoxType,
    setBatch,
    resetToDefaults,
  }
}
