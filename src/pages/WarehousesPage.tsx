import { useState } from 'react'
import type { Warehouse } from '../domain/types'
import { buildLayout } from '../domain/layout'
import { WarehouseForm } from '../components/WarehouseForm'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { LayoutPreview } from '../components/LayoutPreview'
import { EmptyState } from '../components/EmptyState'
import { formatMeters, formatSquareMeters, pluralize } from '../components/format'

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
    <section className="page">
      <div className="page-head">
        <div>
          <h2>Склады</h2>
          <p className="muted">Помещения, их этажи и разметка на ряды и проходы.</p>
        </div>
        <button type="button" className="button button-primary" onClick={() => setFormState('new')}>
          + Добавить склад
        </button>
      </div>

      {warehouses.length === 0 ? (
        <EmptyState
          title="Складов пока нет"
          text="Добавьте помещение — приложение само разметит этаж на ряды и проходы."
          action="Добавить склад"
          onAction={() => setFormState('new')}
        />
      ) : (
        <ul className="card-grid">
          {warehouses.map((warehouse) => {
            const layout = buildLayout(warehouse)
            const storageArea = layout.bays.reduce((sum, b) => sum + b.width * b.height, 0)
            return (
              <li key={warehouse.id} className="card">
                <LayoutPreview
                  className="card-media"
                  length={warehouse.length}
                  width={warehouse.width}
                  layout={layout}
                />
                <div className="card-body">
                  <h3>{warehouse.name}</h3>
                  <dl className="spec-list">
                    <div>
                      <dt>Размер этажа</dt>
                      <dd>
                        {formatMeters(warehouse.length)} × {formatMeters(warehouse.width)} м
                      </dd>
                    </div>
                    <div>
                      <dt>Этажей</dt>
                      <dd>
                        {warehouse.floors}, высота {warehouse.clearance} см
                      </dd>
                    </div>
                    <div>
                      <dt>Разметка</dt>
                      <dd>
                        {layout.bays.length} {pluralize(layout.bays.length, ['ряд', 'ряда', 'рядов'])} по{' '}
                        {warehouse.rowDepth} см, проход {warehouse.aisleWidth} см
                      </dd>
                    </div>
                    <div>
                      <dt>Хранение</dt>
                      <dd>{formatSquareMeters(storageArea * warehouse.floors)} м² на всех этажах</dd>
                    </div>
                  </dl>
                </div>
                <div className="card-actions">
                  <button type="button" className="button" onClick={() => setFormState(warehouse.id)}>
                    Изменить
                  </button>
                  <button
                    type="button"
                    className="button button-quiet-danger"
                    onClick={() => setPendingDelete(warehouse)}
                  >
                    Удалить
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}

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
          message={`Удалить склад «${pendingDelete.name}»? Если он выбран на «Размещении», партия сбросится.`}
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
