import { useState, type FormEvent } from 'react'
import type { BoxType } from '../domain/types'
import { validateBoxType } from '../domain/validation'
import { BoxFootprint } from './BoxFootprint'
import { FormField } from './FormField'
import { Modal } from './Modal'

type BoxTypeValues = Omit<BoxType, 'id'>
type NumericKey = 'length' | 'width' | 'height' | 'weight'
type RawValues = { name: string; color: string; rotatable: boolean } & Record<NumericKey, string>

interface BoxTypeFormProps {
  initial: BoxType | null
  onSubmit: (values: BoxTypeValues) => void
  onCancel: () => void
}

/** Distinct, readable on the dark floor plan; yellow is left out, it marks aisles. */
const PRESET_COLORS = [
  '#e07a5f',
  '#f0a04b',
  '#d6609a',
  '#9b7fe0',
  '#5b8def',
  '#4fb3c8',
  '#5fbf8f',
  '#a3b86c',
]

function toRaw(boxType: BoxType | null): RawValues {
  return {
    name: boxType?.name ?? '',
    color: boxType?.color ?? PRESET_COLORS[4],
    length: boxType ? String(boxType.length) : '',
    width: boxType ? String(boxType.width) : '',
    height: boxType ? String(boxType.height) : '',
    weight: boxType ? String(boxType.weight) : '',
    rotatable: boxType?.rotatable ?? true,
  }
}

function toNumber(raw: string): number {
  return raw.trim() === '' ? NaN : Number(raw)
}

function toValues(raw: RawValues): BoxTypeValues {
  return {
    name: raw.name,
    color: raw.color,
    length: toNumber(raw.length),
    width: toNumber(raw.width),
    height: toNumber(raw.height),
    weight: toNumber(raw.weight),
    rotatable: raw.rotatable,
  }
}

export function BoxTypeForm({ initial, onSubmit, onCancel }: BoxTypeFormProps) {
  const [raw, setRaw] = useState<RawValues>(() => toRaw(initial))
  const [errors, setErrors] = useState<Record<string, string>>({})

  const values = toValues(raw)
  const hasFootprint = values.length > 0 && values.width > 0

  function set<K extends keyof RawValues>(key: K, value: RawValues[K]) {
    setRaw((prev) => ({ ...prev, [key]: value }))
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const validationErrors = validateBoxType({ id: initial?.id ?? '', ...values })
    if (validationErrors.length > 0) {
      const byField: Record<string, string> = {}
      for (const err of validationErrors) byField[err.field] = err.message
      setErrors(byField)
      return
    }
    setErrors({})
    onSubmit(values)
  }

  const numeric = (key: NumericKey, label: string, suffix: string) => (
    <FormField label={label} htmlFor={`bt-${key}`} error={errors[key]} suffix={suffix}>
      <input
        id={`bt-${key}`}
        inputMode="numeric"
        value={raw[key]}
        onChange={(e) => set(key, e.target.value)}
      />
    </FormField>
  )

  return (
    <Modal title={initial ? 'Изменить тип коробки' : 'Новый тип коробки'} onClose={onCancel}>
      <form className="entity-form" onSubmit={handleSubmit} noValidate>
        <div className="entity-form-body">
          <div className="entity-form-fields">
            <FormField label="Название" htmlFor="bt-name" error={errors.name}>
              <input
                id="bt-name"
                value={raw.name}
                onChange={(e) => set('name', e.target.value)}
                autoFocus
              />
            </FormField>

            <fieldset className="form-group">
              <legend>Размеры и вес</legend>
              <div className="form-grid">
                {numeric('length', 'Длина', 'см')}
                {numeric('width', 'Ширина', 'см')}
                {numeric('height', 'Высота', 'см')}
                {numeric('weight', 'Вес', 'кг')}
              </div>
            </fieldset>

            <fieldset className="form-group">
              <legend>Цвет на схеме</legend>
              <div className="color-picker">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={
                      color === raw.color.toLowerCase() ? 'color-option color-option-active' : 'color-option'
                    }
                    style={{ background: color }}
                    aria-label={`Цвет ${color}`}
                    aria-pressed={color === raw.color.toLowerCase()}
                    onClick={() => set('color', color)}
                  />
                ))}
                <label className="color-custom" title="Свой цвет">
                  <input
                    id="bt-color"
                    type="color"
                    value={raw.color}
                    onChange={(e) => set('color', e.target.value)}
                  />
                  <span>Свой</span>
                </label>
              </div>
              {errors.color && <p className="field-error">{errors.color}</p>}
            </fieldset>

            <label className="toggle" htmlFor="bt-rotatable">
              <input
                id="bt-rotatable"
                type="checkbox"
                checked={raw.rotatable}
                onChange={(e) => set('rotatable', e.target.checked)}
              />
              <span className="toggle-track" aria-hidden="true" />
              <span>
                Можно поворачивать на 90°
                <span className="toggle-hint muted">Планировщик сможет класть коробку поперёк ряда</span>
              </span>
            </label>
          </div>

          <div className="entity-form-preview" aria-hidden="true">
            <span className="eyebrow">Вид сверху</span>
            {hasFootprint ? (
              <BoxFootprint length={values.length} width={values.width} color={raw.color} size={180} showLabel />
            ) : (
              <p className="preview-empty muted">Укажите длину и ширину</p>
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
