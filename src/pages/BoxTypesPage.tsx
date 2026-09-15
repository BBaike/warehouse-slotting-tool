import { useState } from 'react'
import type { BoxType } from '../domain/types'
import { BoxTypeForm } from '../components/BoxTypeForm'
import { BoxFootprint } from '../components/BoxFootprint'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { EmptyState } from '../components/EmptyState'
import { formatNumber } from '../components/format'

interface BoxTypesPageProps {
  boxTypes: BoxType[]
  onAdd: (boxType: Omit<BoxType, 'id'>) => void
  onUpdate: (boxType: BoxType) => void
  onRemove: (id: string) => void
}

type FormState = 'closed' | 'new' | string

export function BoxTypesPage({ boxTypes, onAdd, onUpdate, onRemove }: BoxTypesPageProps) {
  const [formState, setFormState] = useState<FormState>('closed')
  const [pendingDelete, setPendingDelete] = useState<BoxType | null>(null)

  const editingBoxType =
    formState !== 'closed' && formState !== 'new'
      ? (boxTypes.find((b) => b.id === formState) ?? null)
      : null

  return (
    <section className="page">
      <div className="page-head">
        <div>
          <h2>Типы коробок</h2>
          <p className="muted">Размеры, вес и цвет, которым коробка показана на схеме.</p>
        </div>
        <button type="button" className="button button-primary" onClick={() => setFormState('new')}>
          + Добавить тип
        </button>
      </div>

      {boxTypes.length === 0 ? (
        <EmptyState
          title="Типов коробок пока нет"
          text="Опишите хотя бы один тип коробки, чтобы собрать партию на размещение."
          action="Добавить тип"
          onAction={() => setFormState('new')}
        />
      ) : (
        <ul className="box-list">
          {boxTypes.map((boxType) => (
            <li key={boxType.id} className="box-row">
              <BoxFootprint
                length={boxType.length}
                width={boxType.width}
                color={boxType.color}
                size={56}
              />
              <div className="box-row-main">
                <h3>{boxType.name}</h3>
                <p className="muted">
                  {boxType.length} × {boxType.width} × {boxType.height} см
                </p>
              </div>
              <div className="box-row-facts">
                <span className="fact">{formatNumber(boxType.weight)} кг</span>
                <span className={boxType.rotatable ? 'chip' : 'chip chip-off'}>
                  {boxType.rotatable ? 'можно поворачивать' : 'без поворота'}
                </span>
              </div>
              <div className="card-actions">
                <button type="button" className="button" onClick={() => setFormState(boxType.id)}>
                  Изменить
                </button>
                <button
                  type="button"
                  className="button button-quiet-danger"
                  onClick={() => setPendingDelete(boxType)}
                >
                  Удалить
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {formState !== 'closed' && (
        <BoxTypeForm
          key={formState}
          initial={editingBoxType}
          onCancel={() => setFormState('closed')}
          onSubmit={(values) => {
            if (editingBoxType) {
              onUpdate({ ...editingBoxType, ...values })
            } else {
              onAdd(values)
            }
            setFormState('closed')
          }}
        />
      )}

      {pendingDelete && (
        <ConfirmDialog
          message={`Удалить тип коробки «${pendingDelete.name}»? Он пропадёт и из текущей партии.`}
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
