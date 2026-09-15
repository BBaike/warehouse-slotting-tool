import { useRef, useState, type MouseEvent as ReactMouseEvent } from 'react'
import type { BoxType, Warehouse } from '../domain/types'
import type { Layout } from '../domain/layout'
import type { PlacedBox, PlacementPlan } from '../domain/packing/planner'
import type { FloorStats } from '../domain/stats'
import { bayLabel, formatMeters, formatPercent, pluralize } from './format'

interface FloorPlanProps {
  warehouse: Warehouse
  boxTypes: BoxType[]
  layout: Layout
  plan: PlacementPlan
  floorStats: FloorStats[]
}

interface Hover {
  index: number
  left: number
  top: number
}

const TAPE_PATTERN_ID = 'floor-plan-tape'
const UNUSED_PATTERN_ID = 'floor-plan-unused'

export function FloorPlan({ warehouse, boxTypes, layout, plan, floorStats }: FloorPlanProps) {
  const [selectedFloor, setSelectedFloor] = useState(0)
  const [hover, setHover] = useState<Hover | null>(null)
  const canvasRef = useRef<HTMLDivElement>(null)

  const { length, width } = warehouse
  const floorIndex = Math.min(selectedFloor, warehouse.floors - 1)
  const typeById = new Map(boxTypes.map((t) => [t.id, t]))
  const boxesOnFloor = plan.placed.filter((p) => p.floorIndex === floorIndex)

  const countByType = new Map<string, number>()
  for (const box of boxesOnFloor) {
    countByType.set(box.boxTypeId, (countByType.get(box.boxTypeId) ?? 0) + 1)
  }
  const legendTypes = boxTypes.filter((t) => countByType.has(t.id))

  // Label sizes are expressed in floor centimetres, so scale them with the plan.
  const unit = Math.max(length, width) / 60
  const gutter = unit * 3.4
  const tape = Math.max(unit * 0.45, 1)
  const usedWidth = Math.max(0, ...[...layout.bays, ...layout.aisles].map((r) => r.y + r.height))

  const hoveredBox = hover ? boxesOnFloor[hover.index] : undefined
  const hoveredType = hoveredBox ? typeById.get(hoveredBox.boxTypeId) : undefined

  const trackPointer = (index: number, event: ReactMouseEvent<SVGRectElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    setHover({ index, left: event.clientX - rect.left, top: event.clientY - rect.top })
  }

  return (
    <div className="floor-plan">
      <div className="floor-plan-head">
        <div>
          <h2>Схема этажа</h2>
          <p className="muted">
            {formatMeters(length)} × {formatMeters(width)} м · {layout.bays.length}{' '}
            {pluralize(layout.bays.length, ['ряд', 'ряда', 'рядов'])} на этаж
          </p>
        </div>

        <div className="floor-tabs" role="tablist" aria-label="Этажи">
          {floorStats.map((floor) => {
            const active = floor.floorIndex === floorIndex
            return (
              <button
                key={floor.floorIndex}
                type="button"
                role="tab"
                aria-selected={active}
                className={active ? 'floor-tab floor-tab-active' : 'floor-tab'}
                onClick={() => {
                  setSelectedFloor(floor.floorIndex)
                  setHover(null)
                }}
              >
                <span className="floor-tab-name">Этаж {floor.floorIndex + 1}</span>
                <span className="floor-tab-value">{formatPercent(floor.fillRate)}</span>
                <span className="gauge gauge-thin" aria-hidden="true">
                  <span style={{ width: `${Math.min(floor.fillRate, 1) * 100}%` }} />
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="floor-plan-canvas" ref={canvasRef}>
        <svg
          className="floor-plan-svg"
          viewBox={`${-gutter} 0 ${length + gutter} ${width}`}
          role="img"
          aria-label={`Этаж ${floorIndex + 1}: ${boxesOnFloor.length} коробок`}
          onMouseLeave={() => setHover(null)}
        >
          <defs>
            <pattern
              id={TAPE_PATTERN_ID}
              width={tape * 2}
              height={tape * 2}
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(45)"
            >
              <rect width={tape * 2} height={tape * 2} className="plan-tape-dark" />
              <rect width={tape} height={tape * 2} className="plan-tape-light" />
            </pattern>
            <pattern
              id={UNUSED_PATTERN_ID}
              width={unit}
              height={unit}
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(45)"
            >
              <rect width={unit} height={unit} className="plan-unused" />
              <rect width={unit * 0.12} height={unit} className="plan-unused-line" />
            </pattern>
          </defs>

          <rect width={length} height={width} fill={`url(#${UNUSED_PATTERN_ID})`} />
          {width - usedWidth >= unit * 1.6 && (
            <text
              className="plan-caption"
              x={length / 2}
              y={(usedWidth + width) / 2}
              fontSize={Math.min(unit * 1.1, (width - usedWidth) * 0.4)}
            >
              не используется
            </text>
          )}

          {layout.aisles.map((aisle, i) => (
            <g key={`aisle-${i}`}>
              <rect className="plan-aisle" x={aisle.x} y={aisle.y} width={aisle.width} height={aisle.height} />
              <rect x={aisle.x} y={aisle.y} width={aisle.width} height={tape} fill={`url(#${TAPE_PATTERN_ID})`} />
              <rect
                x={aisle.x}
                y={aisle.y + aisle.height - tape}
                width={aisle.width}
                height={tape}
                fill={`url(#${TAPE_PATTERN_ID})`}
              />
              <text
                className="plan-caption"
                x={aisle.x + aisle.width / 2}
                y={aisle.y + aisle.height / 2}
                fontSize={Math.min(unit * 1.1, aisle.height * 0.3)}
              >
                проход
              </text>
            </g>
          ))}

          {layout.bays.map((bay, i) => {
            const plateHeight = Math.min(unit * 2.4, bay.height * 0.8)
            return (
              <g key={`bay-${i}`}>
                <rect
                  className="plan-bay"
                  x={bay.x}
                  y={bay.y}
                  width={bay.width}
                  height={bay.height}
                  vectorEffect="non-scaling-stroke"
                />
                <rect
                  className="plan-plate"
                  x={-gutter + unit * 0.5}
                  y={bay.y + (bay.height - plateHeight) / 2}
                  width={gutter - unit}
                  height={plateHeight}
                  rx={unit * 0.2}
                />
                <text
                  className="plan-plate-text"
                  x={-gutter / 2}
                  y={bay.y + bay.height / 2}
                  fontSize={plateHeight * 0.62}
                >
                  {bayLabel(i)}
                </text>
              </g>
            )
          })}

          {boxesOnFloor.map((box, i) => (
            <rect
              key={`${box.bayIndex}-${i}`}
              className="plan-box"
              x={box.x}
              y={box.y}
              width={box.width}
              height={box.height}
              fill={typeById.get(box.boxTypeId)?.color ?? '#999'}
              vectorEffect="non-scaling-stroke"
              onMouseEnter={(e) => trackPointer(i, e)}
              onMouseMove={(e) => trackPointer(i, e)}
            />
          ))}

          {hoveredBox && (
            <rect
              className="plan-box-highlight"
              x={hoveredBox.x}
              y={hoveredBox.y}
              width={hoveredBox.width}
              height={hoveredBox.height}
              vectorEffect="non-scaling-stroke"
            />
          )}

          <rect className="plan-outline" width={length} height={width} vectorEffect="non-scaling-stroke" />
        </svg>

        {hover && hoveredBox && hoveredType && (
          <BoxTooltip box={hoveredBox} type={hoveredType} left={hover.left} top={hover.top} />
        )}
      </div>

      <ul className="floor-plan-legend">
        {legendTypes.length > 0 && <li className="muted">На этаже:</li>}
        {legendTypes.map((type) => (
          <li key={type.id}>
            <span className="swatch" style={{ background: type.color }} />
            {type.name}
            <span className="muted">{countByType.get(type.id)} шт.</span>
          </li>
        ))}
        <li>
          <span className="swatch swatch-tape" />
          проход
        </li>
        {boxesOnFloor.length === 0 && <li className="muted">На этом этаже коробок нет</li>}
      </ul>
    </div>
  )
}

interface BoxTooltipProps {
  box: PlacedBox
  type: BoxType
  left: number
  top: number
}

function BoxTooltip({ box, type, left, top }: BoxTooltipProps) {
  return (
    <div className="floor-plan-tooltip" style={{ left, top }}>
      <span className="swatch" style={{ background: type.color }} />
      <strong>{type.name}</strong>
      <span>
        ряд {bayLabel(box.bayIndex)} · {box.width}×{box.height} см
        {box.rotated ? ' · повёрнута' : ''}
      </span>
    </div>
  )
}
