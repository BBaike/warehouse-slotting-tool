import { useEffect, useMemo, useState } from 'react'
import type { Batch, BoxType, Warehouse } from '../domain/types'
import { validateBatch } from '../domain/validation'
import { buildLayout, type Layout } from '../domain/layout'
import { planPlacement, type PlacementPlan, type UnplacedReason } from '../domain/packing/planner'
import { computeStats, type Stats } from '../domain/stats'
import { FloorPlan } from '../components/FloorPlan'

interface PlanningPageProps {
  warehouses: Warehouse[]
  boxTypes: BoxType[]
  batch: Batch
  onBatchChange: (batch: Batch) => void
}

const RECALC_DELAY_MS = 300

const REASON_LABELS: Record<UnplacedReason, string> = {
  too_tall: 'выше высоты этажа',
  too_large: 'не помещается в ряд',
  no_space: 'не хватило места на складе',
}

function quantityOf(batch: Batch, boxTypeId: string): number {
  return batch.items.find((item) => item.boxTypeId === boxTypeId)?.quantity ?? 0
}

function withQuantity(batch: Batch, boxTypeId: string, quantity: number): Batch {
  const items = batch.items.some((item) => item.boxTypeId === boxTypeId)
    ? batch.items.map((item) => (item.boxTypeId === boxTypeId ? { ...item, quantity } : item))
    : [...batch.items, { boxTypeId, quantity }]
  return { ...batch, items }
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)} %`
}

export function PlanningPage({ warehouses, boxTypes, batch, onBatchChange }: PlanningPageProps) {
  const selectedWarehouse = warehouses.find((w) => w.id === batch.warehouseId) ?? null
  const [batchErrors, setBatchErrors] = useState<string[]>([])
  const [result, setResult] = useState<{ layout: Layout; plan: PlacementPlan; stats: Stats } | null>(null)

  const calculate = useMemo(
    () => () => {
      const errors = validateBatch(batch)
      setBatchErrors(errors.map((e) => e.message))
      if (errors.length > 0 || selectedWarehouse === null) {
        setResult(null)
        return
      }
      const layout = buildLayout(selectedWarehouse)
      const plan = planPlacement(selectedWarehouse, boxTypes, batch)
      setResult({ layout, plan, stats: computeStats(layout, plan, selectedWarehouse, boxTypes) })
    },
    [batch, boxTypes, selectedWarehouse],
  )

  useEffect(() => {
    const timer = setTimeout(calculate, RECALC_DELAY_MS)
    return () => clearTimeout(timer)
  }, [calculate])

  const unplacedRows = result?.stats.byType.filter((t) => t.unplacedCount > 0) ?? []

  return (
    <section>
      <div className="page-toolbar">
        <h2>Размещение</h2>
        <button type="button" onClick={calculate}>
          Рассчитать
        </button>
      </div>

      {warehouses.length === 0 ? (
        <p className="empty-state">Сначала добавьте склад на вкладке «Склады».</p>
      ) : (
        <>
          <div className="form-field">
            <label htmlFor="planning-warehouse">Склад</label>
            <select
              id="planning-warehouse"
              value={selectedWarehouse?.id ?? ''}
              onChange={(e) => onBatchChange({ ...batch, warehouseId: e.target.value })}
            >
              <option value="" disabled>
                Выберите склад
              </option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>

          {boxTypes.length === 0 ? (
            <p className="empty-state">Сначала добавьте тип коробки на вкладке «Типы коробок».</p>
          ) : (
            <div className="batch-form">
              {boxTypes.map((boxType) => (
                <div className="form-field" key={boxType.id}>
                  <label htmlFor={`qty-${boxType.id}`}>{boxType.name}, шт.</label>
                  <input
                    id={`qty-${boxType.id}`}
                    inputMode="numeric"
                    value={quantityOf(batch, boxType.id)}
                    onChange={(e) => {
                      const quantity = Number(e.target.value)
                      onBatchChange(
                        withQuantity(batch, boxType.id, Number.isFinite(quantity) ? quantity : 0),
                      )
                    }}
                  />
                </div>
              ))}
            </div>
          )}

          {batchErrors.length > 0 && (
            <ul className="batch-errors">
              {batchErrors.map((message) => (
                <li key={message} className="field-error">
                  {message}
                </li>
              ))}
            </ul>
          )}

          {result && selectedWarehouse && (
            <>
              <div className="stat-cards">
                <div className="stat-card">
                  <span className="stat-value">{formatPercent(result.stats.fillRate)}</span>
                  <span className="stat-label">заполнение склада</span>
                </div>
                <div className="stat-card">
                  <span className="stat-value">{result.stats.placedCount}</span>
                  <span className="stat-label">коробок размещено</span>
                </div>
                <div className="stat-card">
                  <span className="stat-value">{result.stats.unplacedCount}</span>
                  <span className="stat-label">не поместилось</span>
                </div>
                <div className="stat-card">
                  <span className="stat-value">{result.stats.placedWeight}</span>
                  <span className="stat-label">кг размещено</span>
                </div>
              </div>

              {result.stats.byFloor.length > 1 && (
                <ul className="entity-list">
                  {result.stats.byFloor.map((floor) => (
                    <li key={floor.floorIndex} className="entity-row">
                      <span>Этаж {floor.floorIndex + 1}</span>
                      <span className="entity-meta">{formatPercent(floor.fillRate)}</span>
                    </li>
                  ))}
                </ul>
              )}

              <FloorPlan
                warehouse={selectedWarehouse}
                boxTypes={boxTypes}
                layout={result.layout}
                plan={result.plan}
              />

              {unplacedRows.length > 0 && (
                <table className="unplaced-table">
                  <thead>
                    <tr>
                      <th>Тип коробки</th>
                      <th>Количество</th>
                      <th>Причина</th>
                    </tr>
                  </thead>
                  <tbody>
                    {unplacedRows.map((row) => {
                      const boxType = boxTypes.find((b) => b.id === row.boxTypeId)
                      return (
                        <tr key={row.boxTypeId}>
                          <td>{boxType?.name ?? row.boxTypeId}</td>
                          <td>{row.unplacedCount}</td>
                          <td>{row.unplacedReason ? REASON_LABELS[row.unplacedReason] : ''}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </>
          )}
        </>
      )}
    </section>
  )
}
