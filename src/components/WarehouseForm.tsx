import { useState, type FormEvent } from 'react'
import type { Warehouse } from '../domain/types'
import { validateWarehouse } from '../domain/validation'
import { buildLayout } from '../domain/layout'
import { FormField } from './FormField'
import { LayoutPreview } from './LayoutPreview'
import { Modal } from './Modal'
import { formatSquareMeters, pluralize } from './format'

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

function toValues(raw: RawValues): WarehouseValues {
  return {
    name: raw.name,
    length: toNumber(raw.length),
    width: toNumber(raw.width),
    floors: toNumber(raw.floors),
    clearance: toNumber(raw.clearance),
    rowDepth: toNumber(raw.rowDepth),
    aisleWidth: toNumber(raw.aisleWidth),
  }
}

export function WarehouseForm({ initial, onSubmit, onCancel }: WarehouseFormProps) {
  const [raw, setRaw] = useState<RawValues>(() => toRaw(initial))
  const [errors, setErrors] = useState<Record<string, string>>({})

  const values = toValues(raw)
  const candidate: Warehouse = { id: initial?.id ?? '', ...values }
  // The preview ignores the name so it appears as soon as the dimensions make sense.
  const previewable = validateWarehouse({ ...candidate, name: 'preview' }).length === 0
  const layout = previewable ? buildLayout(candidate) : null

  function set(key: keyof RawValues, value: string) {
    setRaw((prev) => ({ ...prev, [key]: value }))
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
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

  const numeric = (key: keyof RawValues, label: string, suffix?: string) => (
    <FormField label={label} htmlFor={`wh-${key}`} error={errors[key]} suffix={suffix}>
      <input
        id={`wh-${key}`}
        inputMode="numeric"
        value={raw[key]}
        onChange={(e) => set(key, e.target.value)}
      />
    </FormField>
  )

  return (
    <Modal title={initial ? 'Изменить склад' : 'Новый склад'} onClose={onCancel}>
      <form className="entity-form" onSubmit={handleSubmit} noValidate>
        <div className="entity-form-body">
          <div className="entity-form-fields">
            <FormField label="Название" htmlFor="wh-name" error={errors.name}>
              <input
                id="wh-name"
                value={raw.name}
                onChange={(e) => set('name', e.target.value)}
                autoFocus
              />
            </FormField>

            <fieldset className="form-group">
              <legend>Помещение</legend>
              <div className="form-grid">
                {numeric('length', 'Длина', 'см')}
                {numeric('width', 'Ширина', 'см')}
                {numeric('floors', 'Этажей (1–5)')}
                {numeric('clearance', 'Высота этажа', 'см')}
              </div>
            </fieldset>

            <fieldset className="form-group">
              <legend>Разметка</legend>
              <div className="form-grid">
                {numeric('rowDepth', 'Глубина ряда', 'см')}
                {numeric('aisleWidth', 'Ширина прохода', 'см')}
              </div>
            </fieldset>
          </div>

          <div className="entity-form-preview" aria-live="polite">
            <span className="eyebrow">Предпросмотр этажа</span>
            {layout ? (
              <>
                <LayoutPreview length={candidate.length} width={candidate.width} layout={layout} />
                <p className="muted">
                  {layout.bays.length} {pluralize(layout.bays.length, ['ряд', 'ряда', 'рядов'])},{' '}
                  {formatSquareMeters(layout.bays.reduce((s, b) => s + b.width * b.height, 0))} м²
                  под хранение на этаж
                </p>
                {layout.bays.length === 0 && (
                  <p className="field-error">Ни один ряд с проходом не помещается в ширину</p>
                )}
              </>
            ) : (
              <p className="preview-empty muted">Укажите размеры помещения и разметки</p>
            )}
          </div>
        </div>

        <div className="modal-actions">
          <button type="button" className="button" onClick={onCancel}>
            Отмена
          </button>
          <button type="submit" className="button button-primary">
            Сохранить
          </button>
        </div>
      </form>
    </Modal>
  )
}
