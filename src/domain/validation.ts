import type { Batch, BoxType, ValidationError, Warehouse } from './types'

export const MIN_FLOORS = 1
export const MAX_FLOORS = 5
/** Upper bound on boxes per batch; keeps the synchronous planner fast. */
export const MAX_BATCH_SIZE = 300

const HEX_COLOR = /^#[0-9a-f]{6}$/i

const isPositiveInteger = (value: number) => Number.isInteger(value) && value > 0

const error = (field: string, label: string, text: string): ValidationError => ({
  field,
  message: `Поле «${label}»: ${text}`,
})

const MUST_BE_POSITIVE_INTEGER = 'нужно целое число больше 0'

function checkName(name: string, errors: ValidationError[]) {
  if (name.trim() === '') {
    errors.push(error('name', 'Название', 'не может быть пустым'))
  }
}

function checkPositiveIntegers<T>(
  entity: T,
  labels: { [K in keyof T]?: string },
  errors: ValidationError[],
) {
  for (const key of Object.keys(labels) as (keyof T & string)[]) {
    if (!isPositiveInteger(entity[key] as number)) {
      errors.push(error(key, labels[key] as string, MUST_BE_POSITIVE_INTEGER))
    }
  }
}

export function validateWarehouse(warehouse: Warehouse): ValidationError[] {
  const errors: ValidationError[] = []
  checkName(warehouse.name, errors)

  const { floors } = warehouse
  // Field order mirrors the form so errors read top to bottom.
  checkPositiveIntegers(
    warehouse,
    { length: 'Длина', width: 'Ширина' },
    errors,
  )
  if (!Number.isInteger(floors) || floors < MIN_FLOORS || floors > MAX_FLOORS) {
    errors.push(
      error('floors', 'Этажей', `нужно целое число от ${MIN_FLOORS} до ${MAX_FLOORS}`),
    )
  }
  checkPositiveIntegers(
    warehouse,
    { clearance: 'Высота этажа', rowDepth: 'Глубина ряда', aisleWidth: 'Ширина прохода' },
    errors,
  )

  const { rowDepth, width } = warehouse
  if (isPositiveInteger(rowDepth) && isPositiveInteger(width) && rowDepth > width) {
    errors.push(error('rowDepth', 'Глубина ряда', 'не может быть больше ширины склада'))
  }

  return errors
}

export function validateBoxType(boxType: BoxType): ValidationError[] {
  const errors: ValidationError[] = []
  checkName(boxType.name, errors)

  if (!HEX_COLOR.test(boxType.color)) {
    errors.push(error('color', 'Цвет', 'нужен цвет в формате #RRGGBB'))
  }
  checkPositiveIntegers(
    boxType,
    { length: 'Длина', width: 'Ширина', height: 'Высота' },
    errors,
  )
  if (!Number.isFinite(boxType.weight) || boxType.weight <= 0) {
    errors.push(error('weight', 'Вес', 'нужно число больше 0'))
  }

  return errors
}

export function validateBatch(batch: Batch): ValidationError[] {
  const errors: ValidationError[] = []

  batch.items.forEach(({ quantity }, index) => {
    if (!Number.isInteger(quantity) || quantity < 0) {
      errors.push(
        error(`items[${index}].quantity`, 'Количество', 'нужно целое число от 0'),
      )
    }
  })

  // A total over invalid quantities would be meaningless, so check it only on clean input.
  if (errors.length === 0) {
    const total = batch.items.reduce((sum, item) => sum + item.quantity, 0)
    if (total > MAX_BATCH_SIZE) {
      errors.push({
        field: 'items',
        message: `Партия: не больше ${MAX_BATCH_SIZE} коробок, сейчас ${total}`,
      })
    }
  }

  return errors
}
