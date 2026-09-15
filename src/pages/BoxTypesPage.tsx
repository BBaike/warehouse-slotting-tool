import { useState } from 'react'
import type { BoxType } from '../domain/types'
import { BoxTypeForm } from '../components/BoxTypeForm'
import { ConfirmDialog } from '../components/ConfirmDialog'

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
    <section>
      <div className="page-toolbar">
        <h2>Типы коробок</h2>
        <button type="button" onClick={() => setFormState('new')}>
          Добавить тип
        </button>
      </div>

      {boxTypes.length === 0 && <p className="empty-state">Типов коробок пока нет.</p>}

      <ul className="entity-list">
        {boxTypes.map((boxType) => (
          <li key={boxType.id} className="entity-row">
            <div>
              <span className="color-swatch" style={{ backgroundColor: boxType.color }} />
              <strong>{boxType.name}</strong>
              <span className="entity-meta">
                {boxType.length}×{boxType.width}×{boxType.height} см, {boxType.weight} кг
                {boxType.rotatable ? ', поворот разрешён' : ', без поворота'}
              </span>
            </div>
            <div className="entity-actions">
              <button type="button" onClick={() => setFormState(boxType.id)}>
                Изменить
              </button>
              <button type="button" onClick={() => setPendingDelete(boxType)}>
                Удалить
              </button>
            </div>
          </li>
        ))}
      </ul>

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
          message={`Удалить тип коробки «${pendingDelete.name}»?`}
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
