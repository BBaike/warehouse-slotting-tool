// Russian-locale formatting helpers shared by the pages.

const numberFormat = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 })

export function formatNumber(value: number): string {
  return numberFormat.format(value)
}

export function formatPercent(fraction: number): string {
  return `${Math.round(fraction * 100)} %`
}

/** Centimetres → metres, e.g. `850` → `8,5`. */
export function formatMeters(cm: number): string {
  return numberFormat.format(cm / 100)
}

/** Square centimetres → square metres. */
export function formatSquareMeters(cm2: number): string {
  return numberFormat.format(cm2 / 10_000)
}

/** Rack-style row label: A…Z, then AA, AB, … */
export function bayLabel(index: number): string {
  const letter = (i: number) => String.fromCharCode(65 + i)
  return index < 26 ? letter(index) : letter(Math.floor(index / 26) - 1) + letter(index % 26)
}

/** Russian plural form for a count: `pluralize(4, ['ряд', 'ряда', 'рядов'])` → `ряда`. */
export function pluralize(count: number, forms: [string, string, string]): string {
  const mod10 = count % 10
  const mod100 = count % 100
  if (mod10 === 1 && mod100 !== 11) return forms[0]
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms[1]
  return forms[2]
}
