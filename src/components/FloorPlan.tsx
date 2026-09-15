import { useRef, useState, type MouseEvent as ReactMouseEvent } from 'react'
import type { BoxType, Warehouse } from '../domain/types'
import type { Layout } from '../domain/layout'
import type { PlacedBox, PlacementPlan } from '../domain/packing/planner'

interface FloorPlanProps {
  warehouse: Warehouse
  boxTypes: BoxType[]
  layout: Layout
  plan: PlacementPlan
}

interface TooltipState {
  boxTypeName: string
  width: number
  height: number
  rotated: boolean
  left: number
  top: number
}

const AISLE_HATCH_ID = 'floor-plan-aisle-hatch'

export function FloorPlan({ warehouse, boxTypes, layout, plan }: FloorPlanProps) {
  const [floorIndex, setFloorIndex] = useState(0)
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)
  const canvasRef = useRef<HTMLDivElement>(null)

  const typeById = new Map(boxTypes.map((t) => [t.id, t]))
  const placedTypeIds = new Set(plan.placed.map((p) => p.boxTypeId))
  const legendTypes = boxTypes.filter((t) => placedTypeIds.has(t.id))
  const boxesOnFloor = plan.placed.filter((p) => p.floorIndex === floorIndex)

  const showTooltip = (box: PlacedBox, event: ReactMouseEvent<SVGRectElement>) => {
    const type = typeById.get(box.boxTypeId)
    const canvas = canvasRef.current
    if (!type || !canvas) return
    const canvasRect = canvas.getBoundingClientRect()
    setTooltip({
      boxTypeName: type.name,
      width: box.width,
      height: box.height,
      rotated: box.rotated,
      left: event.clientX - canvasRect.left,
      top: event.clientY - canvasRect.top,
    })
  }

  return (
    <div className="floor-plan">
      {warehouse.floors > 1 && (
        <div className="tabs">
          {Array.from({ length: warehouse.floors }, (_, i) => (
            <button
              key={i}
              type="button"
              className={i === floorIndex ? 'tab tab-active' : 'tab'}
              onClick={() => setFloorIndex(i)}
            >
              Этаж {i + 1}
            </button>
          ))}
        </div>
      )}

      <div className="floor-plan-canvas" ref={canvasRef}>
        <svg
          className="floor-plan-svg"
          viewBox={`0 0 ${warehouse.length} ${warehouse.width}`}
          onMouseLeave={() => setTooltip(null)}
        >
          <defs>
            <pattern
              id={AISLE_HATCH_ID}
              width={16}
              height={16}
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(45)"
            >
              <rect width={16} height={16} fill="var(--bg)" />
              <line x1={0} y1={0} x2={0} y2={16} stroke="var(--border)" strokeWidth={6} />
            </pattern>
          </defs>

          {layout.aisles.map((aisle, i) => (
            <rect
              key={`aisle-${i}`}
              x={aisle.x}
              y={aisle.y}
              width={aisle.width}
              height={aisle.height}
              fill={`url(#${AISLE_HATCH_ID})`}
            />
          ))}

          {layout.bays.map((bay, i) => (
            <rect
              key={`bay-${i}`}
              x={bay.x}
              y={bay.y}
              width={bay.width}
              height={bay.height}
              fill="none"
              stroke="var(--border)"
              strokeWidth={2}
            />
          ))}

          {boxesOnFloor.map((box, i) => (
            <rect
              key={`${box.bayIndex}-${i}`}
              x={box.x}
              y={box.y}
              width={box.width}
              height={box.height}
              fill={typeById.get(box.boxTypeId)?.color ?? '#999'}
              stroke="var(--bg)"
              strokeWidth={1}
              onMouseEnter={(e) => showTooltip(box, e)}
              onMouseMove={(e) => showTooltip(box, e)}
            />
          ))}
        </svg>

        {tooltip && (
          <div className="floor-plan-tooltip" style={{ left: tooltip.left, top: tooltip.top }}>
            {tooltip.boxTypeName} · {tooltip.width}×{tooltip.height} см
            {tooltip.rotated ? ' · повёрнута' : ''}
          </div>
        )}
      </div>

      {legendTypes.length > 0 && (
        <ul className="floor-plan-legend">
          {legendTypes.map((type) => (
            <li key={type.id}>
              <span className="color-swatch" style={{ background: type.color }} />
              {type.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
