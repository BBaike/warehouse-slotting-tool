import { useState, type FormEvent } from 'react'
import type { BoxType } from '../domain/types'
import { validateBoxType } from '../domain/validation'
import { FormField } from './FormField'

type BoxTypeValues = Omit<BoxType, 'id'>
type RawValues = { [K in keyof Omit<BoxTypeValues, 'rotatable'>]: string } & {
  rotatable: boolean
}

interface BoxTypeFormProps {
  initial: BoxType | null
  onSubmit: (values: BoxTypeValues) => void
  onCancel: () => void
}

const DEFAULT_COLOR = '#4287f5'

function toRaw(boxType: BoxType | null): RawValues {
  return {
    name: boxType?.name ?? '',
    color: boxType?.color ?? DEFAULT_COLOR,
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

export function BoxTypeForm({ initial, onSubmit, onCancel }: BoxTypeFormProps) {
  const [raw, setRaw] = useState<RawValues>(() => toRaw(initial))
  const [errors, setErrors] = useState<Record<string, string>>({})

  function set(key: keyof Omit<RawValues, 'rotatable'>, value: string) {
    setRaw((prev) => ({ ...prev, [key]: value }))
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const values: BoxTypeValues = {
      name: raw.name,
      color: raw.color,
      length: toNumber(raw.length),
      width: toNumber(raw.width),
      height: toNumber(raw.height),
      weight: toNumber(raw.weight),
      rotatable: raw.rotatable,
    }
    const candidate: BoxType = { id: initial?.id ?? '', ...values }
    const validationErrors = validateBoxType(candidate)
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
      <h3>{initial ? 'Изменить тип коробки' : 'Новый тип коробки'}</h3>
      <FormField label="Название" htmlFor="bt-name" error={errors.name}>
        <input id="bt-name" value={raw.name} onChange={(e) => set('name', e.target.value)} />
      </FormField>
      <FormField label="Цвет" htmlFor="bt-color" error={errors.color}>
        <input
          id="bt-color"
          type="color"
          value={raw.color}
          onChange={(e) => set('color', e.target.value)}
        />
      </FormField>
      <FormField label="Длина, см" htmlFor="bt-length" error={errors.length}>
        <input
          id="bt-length"
          inputMode="numeric"
          value={raw.length}
          onChange={(e) => set('length', e.target.value)}
        />
      </FormField>
      <FormField label="Ширина, см" htmlFor="bt-width" error={errors.width}>
        <input
          id="bt-width"
          inputMode="numeric"
          value={raw.width}
          onChange={(e) => set('width', e.target.value)}
        />
      </FormField>
      <FormField label="Высота, см" htmlFor="bt-height" error={errors.height}>
        <input
          id="bt-height"
          inputMode="numeric"
          value={raw.height}
          onChange={(e) => set('height', e.target.value)}
        />
      </FormField>
      <FormField label="Вес, кг" htmlFor="bt-weight" error={errors.weight}>
        <input
          id="bt-weight"
          inputMode="numeric"
          value={raw.weight}
          onChange={(e) => set('weight', e.target.value)}
        />
      </FormField>
      <FormField label="Можно поворачивать на 90°" htmlFor="bt-rotatable">
        <input
          id="bt-rotatable"
          type="checkbox"
          checked={raw.rotatable}
          onChange={(e) => setRaw((prev) => ({ ...prev, rotatable: e.target.checked }))}
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
