import type { Layout } from '../domain/layout'

interface LayoutPreviewProps {
  length: number
  width: number
  layout: Layout
  className?: string
}

/** Small, non-interactive top view of one storey: rows and taped aisles. */
export function LayoutPreview({ length, width, layout, className }: LayoutPreviewProps) {
  return (
    <svg
      className={className ? `layout-preview ${className}` : 'layout-preview'}
      viewBox={`0 0 ${length} ${width}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="Разметка этажа: ряды и проходы"
    >
      <rect className="plan-unused" width={length} height={width} />
      {layout.aisles.map((aisle, i) => (
        <g key={`aisle-${i}`}>
          <rect className="plan-aisle" x={aisle.x} y={aisle.y} width={aisle.width} height={aisle.height} />
          <line
            className="preview-tape"
            x1={0}
            x2={length}
            y1={aisle.y + aisle.height / 2}
            y2={aisle.y + aisle.height / 2}
            vectorEffect="non-scaling-stroke"
          />
        </g>
      ))}
      {layout.bays.map((bay, i) => (
        <rect
          key={`bay-${i}`}
          className="plan-bay"
          x={bay.x}
          y={bay.y}
          width={bay.width}
          height={bay.height}
          vectorEffect="non-scaling-stroke"
        />
      ))}
      <rect
        className="plan-outline"
        width={length}
        height={width}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}
