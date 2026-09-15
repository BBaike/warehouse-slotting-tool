import { useCallback, useEffect, useState } from 'react'
import type { Batch, BoxType, Warehouse } from '../domain/types'
import { validateBatch } from '../domain/validation'
import { buildLayout, type Layout } from '../domain/layout'
import { planPlacement, type PlacementPlan, type UnplacedReason } from '../domain/packing/planner'
import { computeStats, type Stats } from '../domain/stats'
import { FloorPlan } from '../components/FloorPlan'
import { EmptyState } from '../components/EmptyState'
import { formatMeters, formatNumber, formatPercent, formatSquareMeters } from '../components/format'

interface PlanningPageProps {
  warehouses: Warehouse[]
  boxTypes: BoxType[]
  batch: Batch
  onBatchChange: (batch: Batch) => void
  onOpenWarehouses: () => void
  onOpenBoxTypes: () => void
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

interface Calculation {
  errors: string[]
  result: { layout: Layout; plan: PlacementPlan; stats: Stats } | null
}

function runCalculation(batch: Batch, boxTypes: BoxType[], warehouse: Warehouse | null): Calculation {
  const errors = validateBatch(batch).map((e) => e.message)
  if (errors.length > 0 || warehouse === null) return { errors, result: null }
  const layout = buildLayout(warehouse)
  const plan = planPlacement(warehouse, boxTypes, batch)
  return { errors, result: { layout, plan, stats: computeStats(layout, plan, warehouse, boxTypes) } }
}

export function PlanningPage({
  warehouses,
  boxTypes,
  batch,
  onBatchChange,
  onOpenWarehouses,
  onOpenBoxTypes,
}: PlanningPageProps) {
  const selectedWarehouse = warehouses.find((w) => w.id === batch.warehouseId) ?? null
  // The first calculation runs synchronously so the plan is visible on the first paint;
  // later edits are debounced.
  const [{ errors: batchErrors, result }, setCalculation] = useState(() =>
    runCalculation(batch, boxTypes, selectedWarehouse),
  )

  const calculate = useCallback(
    () => setCalculation(runCalculation(batch, boxTypes, selectedWarehouse)),
    [batch, boxTypes, selectedWarehouse],
  )

  useEffect(() => {
    const timer = setTimeout(calculate, RECALC_DELAY_MS)
    return () => clearTimeout(timer)
  }, [calculate])

  if (warehouses.length === 0) {
    return (
      <section className="page">
        <EmptyState
          title="Не на чем размещать"
          text="Сначала добавьте склад — потом сюда можно будет положить партию коробок."
          action="Перейти к складам"
          onAction={onOpenWarehouses}
        />
      </section>
    )
  }

  const stats = result?.stats ?? null
  const typeStatsById = new Map(stats?.byType.map((t) => [t.boxTypeId, t]) ?? [])
  const unplacedRows = stats?.byType.filter((t) => t.unplacedCount > 0) ?? []
  const requestedCount = batch.items.reduce((sum, item) => sum + (item.quantity > 0 ? item.quantity : 0), 0)

  return (
    <section className="planning">
      <aside className="planning-side">
        <div className="panel">
          <h2 className="panel-title">Партия</h2>

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
            {selectedWarehouse && (
              <p className="field-hint">
                {formatMeters(selectedWarehouse.length)} × {formatMeters(selectedWarehouse.width)} м ·{' '}
                этажей: {selectedWarehouse.floors} · высота этажа {selectedWarehouse.clearance} см
              </p>
            )}
          </div>

          {boxTypes.length === 0 ? (
            <div className="inline-empty">
              <p className="muted">Типов коробок пока нет.</p>
              <button type="button" className="button" onClick={onOpenBoxTypes}>
                Добавить тип коробки
              </button>
            </div>
          ) : (
            <ul className="batch-list">
              {boxTypes.map((boxType) => {
                const requested = quantityOf(batch, boxType.id)
                const typeStats = typeStatsById.get(boxType.id)
                return (
                  <li key={boxType.id} className="batch-row">
                    <span className="swatch swatch-large" style={{ background: boxType.color }} />
                    <label htmlFor={`qty-${boxType.id}`} className="batch-row-label">
                      <span className="batch-row-name">{boxType.name}</span>
                      <span className="batch-row-meta">
                        {boxType.length}×{boxType.width}×{boxType.height} см
                        {typeStats && requested > 0 && (
                          <>
                            {' · '}
                            {typeStats.unplacedCount > 0 ? (
                              <span className="text-danger">не влезло {typeStats.unplacedCount}</span>
                            ) : (
                              <span className="text-ok">все на месте</span>
                            )}
                          </>
                        )}
                      </span>
                    </label>
                    <div className="input-with-suffix input-quantity">
                      <input
                        id={`qty-${boxType.id}`}
                        inputMode="numeric"
                        value={requested}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => {
                          const quantity = Number(e.target.value)
                          onBatchChange(
                            withQuantity(batch, boxType.id, Number.isFinite(quantity) ? quantity : 0),
                          )
                        }}
                      />
                      <span className="input-suffix" aria-hidden="true">
                        шт.
                      </span>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}

          {batchErrors.length > 0 && (
            <ul className="batch-errors" role="alert">
              {batchErrors.map((message) => (
                <li key={message} className="field-error">
                  {message}
                </li>
              ))}
            </ul>
          )}

          <div className="batch-footer">
            <span className="muted">
              Всего: <strong className="text-strong">{formatNumber(requestedCount)}</strong> шт.
            </span>
            <button type="button" className="button button-primary" onClick={calculate}>
              Рассчитать
            </button>
          </div>
        </div>

        {stats && (
          <div className="panel" aria-live="polite">
            <h2 className="panel-title">Результат</h2>
            <div className="fill-figure">
              <span className="fill-value">{formatPercent(stats.fillRate)}</span>
              <span className="muted">
                рядов заполнено
                <br />
                {formatSquareMeters(stats.placedArea)} из {formatSquareMeters(stats.totalArea)} м²
              </span>
            </div>
            <span className="gauge" aria-hidden="true">
              <span style={{ width: `${Math.min(stats.fillRate, 1) * 100}%` }} />
            </span>

            <dl className="figures">
              <div>
                <dt>размещено</dt>
                <dd>{formatNumber(stats.placedCount)}</dd>
              </div>
              <div className={stats.unplacedCount > 0 ? 'figure-danger' : undefined}>
                <dt>не влезло</dt>
                <dd>{formatNumber(stats.unplacedCount)}</dd>
              </div>
              <div>
                <dt>вес, кг</dt>
                <dd>{formatNumber(stats.placedWeight)}</dd>
              </div>
            </dl>

            {unplacedRows.length > 0 && (
              <div className="unplaced">
                <h3>Не поместилось</h3>
                <ul>
                  {unplacedRows.map((row) => {
                    const boxType = boxTypes.find((b) => b.id === row.boxTypeId)
                    return (
                      <li key={row.boxTypeId}>
                        <span className="swatch" style={{ background: boxType?.color }} />
                        <span className="unplaced-name">
                          {boxType?.name ?? row.boxTypeId}
                          <span className="muted">
                            {row.unplacedReason ? REASON_LABELS[row.unplacedReason] : ''}
                          </span>
                        </span>
                        <strong>{formatNumber(row.unplacedCount)} шт.</strong>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}
          </div>
        )}
      </aside>

      <div className="planning-main panel">
        {result && selectedWarehouse ? (
          <FloorPlan
            warehouse={selectedWarehouse}
            boxTypes={boxTypes}
            layout={result.layout}
            plan={result.plan}
            floorStats={result.stats.byFloor}
          />
        ) : (
          <EmptyState
            title={selectedWarehouse ? 'Схема появится после расчёта' : 'Выберите склад'}
            text={
              selectedWarehouse
                ? 'Исправьте партию слева — схема пересчитается автоматически.'
                : 'Выберите склад слева и укажите, сколько коробок каждого типа нужно разместить.'
            }
          />
        )}
      </div>
    </section>
  )
}
