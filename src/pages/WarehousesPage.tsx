import { useState } from 'react'
import type { Warehouse } from '../domain/types'
import { WarehouseForm } from '../components/WarehouseForm'
import { ConfirmDialog } from '../components/ConfirmDialog'

interface WarehousesPageProps {
  warehouses: Warehouse[]
  onAdd: (warehouse: Omit<Warehouse, 'id'>) => void
  onUpdate: (warehouse: Warehouse) => void
  onRemove: (id: string) => void
}

type FormState = 'closed' | 'new' | string

export function WarehousesPage({ warehouses, onAdd, onUpdate, onRemove }: WarehousesPageProps) {
  const [formState, setFormState] = useState<FormState>('closed')
  const [pendingDelete, setPendingDelete] = useState<Warehouse | null>(null)

  const editingWarehouse =
    formState !== 'closed' && formState !== 'new'
      ? (warehouses.find((w) => w.id === formState) ?? null)
      : null

  return (
    <section>
      <div className="page-toolbar">
        <h2>Склады</h2>
        <button type="button" onClick={() => setFormState('new')}>
          Добавить склад
        </button>
      </div>

      {warehouses.length === 0 && <p className="empty-state">Складов пока нет.</p>}

      <ul className="entity-list">
        {warehouses.map((warehouse) => (
          <li key={warehouse.id} className="entity-row">
            <div>
              <strong>{warehouse.name}</strong>
              <span className="entity-meta">
                {warehouse.length}×{warehouse.width} см, этажей: {warehouse.floors}
              </span>
            </div>
            <div className="entity-actions">
              <button type="button" onClick={() => setFormState(warehouse.id)}>
                Изменить
              </button>
              <button type="button" onClick={() => setPendingDelete(warehouse)}>
                Удалить
              </button>
            </div>
          </li>
        ))}
      </ul>

      {formState !== 'closed' && (
        <WarehouseForm
          key={formState}
          initial={editingWarehouse}
          onCancel={() => setFormState('closed')}
          onSubmit={(values) => {
            if (editingWarehouse) {
              onUpdate({ ...editingWarehouse, ...values })
            } else {
              onAdd(values)
            }
            setFormState('closed')
          }}
        />
      )}

      {pendingDelete && (
        <ConfirmDialog
          message={`Удалить склад «${pendingDelete.name}»?`}
          onConfirm={() => {
            onRemove(pendingDelete.id)
            setPendingDelete(null)
          }}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </section>
  )
}
