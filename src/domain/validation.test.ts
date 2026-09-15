import { describe, expect, it } from 'vitest'
import type { Batch, BoxType, Warehouse } from './types'
import {
  MAX_BATCH_SIZE,
  MAX_FLOORS,
  validateBatch,
  validateBoxType,
  validateWarehouse,
} from './validation'

const warehouse: Warehouse = {
  id: 'w1',
  name: 'Тестовое помещение',
  length: 900,
  width: 800,
  floors: 2,
  clearance: 60,
  rowDepth: 120,
  aisleWidth: 150,
}

const boxType: BoxType = {
  id: 'b1',
  name: 'Большая',
  color: '#3b82f6',
  length: 60,
  width: 40,
  height: 40,
  weight: 12,
  rotatable: true,
}

const batch: Batch = {
  warehouseId: 'w1',
  items: [
    { boxTypeId: 'b1', quantity: 10 },
    { boxTypeId: 'b2', quantity: 0 },
  ],
}

const fields = (errors: { field: string }[]) => errors.map((e) => e.field)

describe('validateWarehouse', () => {
  it('accepts a valid warehouse', () => {
    expect(validateWarehouse(warehouse)).toEqual([])
  })

  it('rejects a blank name', () => {
    const errors = validateWarehouse({ ...warehouse, name: '   ' })
    expect(fields(errors)).toEqual(['name'])
    expect(errors[0].message).toContain('Название')
  })

  const positiveIntegerFields = [
    'length',
    'width',
    'clearance',
    'rowDepth',
    'aisleWidth',
  ] as const

  describe.each(positiveIntegerFields)('%s must be a positive integer', (field) => {
    it.each([0, -10, 12.5, Number.NaN, Number.POSITIVE_INFINITY])('rejects %s', (value) => {
      const errors = validateWarehouse({ ...warehouse, [field]: value })
      expect(fields(errors)).toEqual([field])
    })

    it('accepts 1', () => {
      // Keep rowDepth <= width so only the field under test varies.
      const errors = validateWarehouse({ ...warehouse, rowDepth: 1, [field]: 1 })
      expect(errors).toEqual([])
    })
  })

  it.each([1, MAX_FLOORS])('accepts floors = %s', (floors) => {
    expect(validateWarehouse({ ...warehouse, floors })).toEqual([])
  })

  it.each([0, MAX_FLOORS + 1, 1.5, Number.NaN])('rejects floors = %s', (floors) => {
    const errors = validateWarehouse({ ...warehouse, floors })
    expect(fields(errors)).toEqual(['floors'])
    expect(errors[0].message).toContain(`${MAX_FLOORS}`)
  })

  it('accepts rowDepth equal to width', () => {
    expect(validateWarehouse({ ...warehouse, rowDepth: 800 })).toEqual([])
  })

  it('rejects rowDepth greater than width', () => {
    const errors = validateWarehouse({ ...warehouse, rowDepth: 801 })
    expect(fields(errors)).toEqual(['rowDepth'])
    expect(errors[0].message).toContain('Глубина ряда')
  })

  it('does not compare rowDepth with an invalid width', () => {
    const errors = validateWarehouse({ ...warehouse, width: 0 })
    expect(fields(errors)).toEqual(['width'])
  })

  it('reports every invalid field at once', () => {
    const errors = validateWarehouse({ ...warehouse, name: '', length: 0, floors: 9 })
    expect(fields(errors)).toEqual(['name', 'length', 'floors'])
  })
})

describe('validateBoxType', () => {
  it('accepts a valid box type', () => {
    expect(validateBoxType(boxType)).toEqual([])
  })

  it('rejects a blank name', () => {
    const errors = validateBoxType({ ...boxType, name: '' })
    expect(fields(errors)).toEqual(['name'])
  })

  describe.each(['length', 'width', 'height'] as const)('%s must be a positive integer', (field) => {
    it.each([0, -1, 40.5, Number.NaN])('rejects %s', (value) => {
      const errors = validateBoxType({ ...boxType, [field]: value })
      expect(fields(errors)).toEqual([field])
    })
  })

  it('accepts a fractional weight', () => {
    expect(validateBoxType({ ...boxType, weight: 0.5 })).toEqual([])
  })

  it.each([0, -3, Number.NaN, Number.POSITIVE_INFINITY])('rejects weight = %s', (weight) => {
    const errors = validateBoxType({ ...boxType, weight })
    expect(fields(errors)).toEqual(['weight'])
    expect(errors[0].message).toContain('Вес')
  })

  it.each(['#ABCDEF', '#0a0b0c'])('accepts colour %s', (color) => {
    expect(validateBoxType({ ...boxType, color })).toEqual([])
  })

  it.each(['', 'red', '#fff', '#12345g', '3b82f6'])('rejects colour %j', (color) => {
    const errors = validateBoxType({ ...boxType, color })
    expect(fields(errors)).toEqual(['color'])
  })
})

describe('validateBatch', () => {
  it('accepts a valid batch, including zero quantities', () => {
    expect(validateBatch(batch)).toEqual([])
  })

  it('accepts an empty batch', () => {
    expect(validateBatch({ warehouseId: 'w1', items: [] })).toEqual([])
  })

  it.each([-1, 2.5, Number.NaN])('rejects quantity = %s with the item path', (quantity) => {
    const errors = validateBatch({
      ...batch,
      items: [batch.items[0], { boxTypeId: 'b2', quantity }],
    })
    expect(fields(errors)).toEqual(['items[1].quantity'])
    expect(errors[0].message).toContain('Количество')
  })

  it('accepts a batch of exactly MAX_BATCH_SIZE boxes', () => {
    const errors = validateBatch({
      warehouseId: 'w1',
      items: [
        { boxTypeId: 'b1', quantity: MAX_BATCH_SIZE - 100 },
        { boxTypeId: 'b2', quantity: 100 },
      ],
    })
    expect(errors).toEqual([])
  })

  it('rejects a batch larger than MAX_BATCH_SIZE in total', () => {
    const errors = validateBatch({
      warehouseId: 'w1',
      items: [
        { boxTypeId: 'b1', quantity: MAX_BATCH_SIZE },
        { boxTypeId: 'b2', quantity: 1 },
      ],
    })
    expect(fields(errors)).toEqual(['items'])
    expect(errors[0].message).toContain(`${MAX_BATCH_SIZE}`)
  })

  it('skips the size limit while a quantity is invalid', () => {
    const errors = validateBatch({
      warehouseId: 'w1',
      items: [
        { boxTypeId: 'b1', quantity: 1000 },
        { boxTypeId: 'b2', quantity: -1 },
      ],
    })
    expect(fields(errors)).toEqual(['items[1].quantity'])
  })
})
