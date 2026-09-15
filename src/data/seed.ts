import type { BoxType, Warehouse } from '../domain/types'

export const SEED_WAREHOUSE: Warehouse = {
  id: 'seed-warehouse-1',
  name: 'Тестовое помещение',
  length: 900,
  width: 800,
  floors: 2,
  clearance: 60,
  rowDepth: 120,
  aisleWidth: 150,
}

export const SEED_BOX_TYPES: BoxType[] = [
  {
    id: 'seed-box-large',
    name: 'Большая',
    color: '#e07a5f',
    length: 60,
    width: 40,
    height: 40,
    weight: 12,
    rotatable: true,
  },
  {
    id: 'seed-box-square',
    name: 'Квадратная',
    color: '#3d5a80',
    length: 40,
    width: 40,
    height: 40,
    weight: 9,
    rotatable: true,
  },
  {
    id: 'seed-box-small',
    name: 'Малая',
    color: '#81b29a',
    length: 40,
    width: 30,
    height: 30,
    weight: 5,
    rotatable: true,
  },
]
