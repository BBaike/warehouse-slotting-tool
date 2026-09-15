import { useState, type FormEvent } from 'react'
import type { Warehouse } from '../domain/types'
import { validateWarehouse } from '../domain/validation'
import { FormField } from './FormField'

type WarehouseValues = Omit<Warehouse, 'id'>
type RawValues = { [K in keyof WarehouseValues]: string }

interface WarehouseFormProps {
  initial: Warehouse | null
  onSubmit: (values: WarehouseValues) => void
  onCancel: () => void
}

function toRaw(warehouse: Warehouse | null): RawValues {
  return {
    name: warehouse?.name ?? '',
    length: warehouse ? String(warehouse.length) : '',
    width: warehouse ? String(warehouse.width) : '',
    floors: warehouse ? String(warehouse.floors) : '1',
    clearance: warehouse ? String(warehouse.clearance) : '',
    rowDepth: warehouse ? String(warehouse.rowDepth) : '',
    aisleWidth: warehouse ? String(warehouse.aisleWidth) : '',
  }
}

function toNumber(raw: string): number {
  return raw.trim() === '' ? NaN : Number(raw)
}

export function WarehouseForm({ initial, onSubmit, onCancel }: WarehouseFormProps) {
  const [raw, setRaw] = useState<RawValues>(() => toRaw(initial))
  const [errors, setErrors] = useState<Record<string, string>>({})

  function set(key: keyof RawValues, value: string) {
    setRaw((prev) => ({ ...prev, [key]: value }))
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const values: WarehouseValues = {
      name: raw.name,
      length: toNumber(raw.length),
      width: toNumber(raw.width),
      floors: toNumber(raw.floors),
      clearance: toNumber(raw.clearance),
      rowDepth: toNumber(raw.rowDepth),
      aisleWidth: toNumber(raw.aisleWidth),
    }
    const candidate: Warehouse = { id: initial?.id ?? '', ...values }
    const validationErrors = validateWarehouse(candidate)
    if (validationErrors.length > 0) {
      const byField: Record<string, string> = {}
      for (const err of validationErrors) byField[err.field] = err.message
      setErrors(byField)
      return
    }
    setErrors({})
    onSubmit(values)
  }

  return (
    <form className="entity-form" onSubmit={handleSubmit}>
      <h3>{initial ? 'Изменить склад' : 'Новый склад'}</h3>
      <FormField label="Название" htmlFor="wh-name" error={errors.name}>
        <input id="wh-name" value={raw.name} onChange={(e) => set('name', e.target.value)} />
      </FormField>
      <FormField label="Длина, см" htmlFor="wh-length" error={errors.length}>
        <input
          id="wh-length"
          inputMode="numeric"
          value={raw.length}
          onChange={(e) => set('length', e.target.value)}
        />
      </FormField>
      <FormField label="Ширина, см" htmlFor="wh-width" error={errors.width}>
        <input
          id="wh-width"
          inputMode="numeric"
          value={raw.width}
          onChange={(e) => set('width', e.target.value)}
        />
      </FormField>
      <FormField label="Этажей (1–5)" htmlFor="wh-floors" error={errors.floors}>
        <input
          id="wh-floors"
          inputMode="numeric"
          value={raw.floors}
          onChange={(e) => set('floors', e.target.value)}
        />
      </FormField>
      <FormField label="Высота этажа, см" htmlFor="wh-clearance" error={errors.clearance}>
        <input
          id="wh-clearance"
          inputMode="numeric"
          value={raw.clearance}
          onChange={(e) => set('clearance', e.target.value)}
        />
      </FormField>
      <FormField label="Глубина ряда, см" htmlFor="wh-rowDepth" error={errors.rowDepth}>
        <input
          id="wh-rowDepth"
          inputMode="numeric"
          value={raw.rowDepth}
          onChange={(e) => set('rowDepth', e.target.value)}
        />
      </FormField>
      <FormField label="Ширина прохода, см" htmlFor="wh-aisleWidth" error={errors.aisleWidth}>
        <input
          id="wh-aisleWidth"
          inputMode="numeric"
          value={raw.aisleWidth}
          onChange={(e) => set('aisleWidth', e.target.value)}
        />
      </FormField>
      <div className="form-actions">
        <button type="submit">Сохранить</button>
        <button type="button" onClick={onCancel}>
          Отмена
        </button>
      </div>
    </form>
  )
}
