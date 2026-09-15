interface BoxFootprintProps {
  length: number
  width: number
  color: string
  /** Side of the square frame, px. The footprint keeps its proportions inside it. */
  size: number
  /** Print the dimensions under the footprint. */
  showLabel?: boolean
}

/** Top view of a box, drawn to proportion within a fixed square. */
export function BoxFootprint({ length, width, color, size, showLabel = false }: BoxFootprintProps) {
  const scale = (size * (showLabel ? 0.72 : 0.84)) / Math.max(length, width)
  const w = length * scale
  const h = width * scale

  return (
    <svg className="box-footprint" width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <rect
        x={(size - w) / 2}
        y={(size - h) / 2}
        width={w}
        height={h}
        rx={2}
        fill={color}
      />
      {showLabel && (
        <text className="box-footprint-label" x={size / 2} y={(size + h) / 2 + size * 0.08}>
          {length}×{width} см
        </text>
      )}
    </svg>
  )
}
