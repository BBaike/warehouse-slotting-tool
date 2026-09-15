import { describe, expect, it } from 'vitest'
import { bayLabel, formatMeters, formatPercent, pluralize } from './format'

describe('pluralize', () => {
  const forms: [string, string, string] = ['ряд', 'ряда', 'рядов']

  it.each([
    [1, 'ряд'],
    [2, 'ряда'],
    [4, 'ряда'],
    [5, 'рядов'],
    [11, 'рядов'],
    [12, 'рядов'],
    [21, 'ряд'],
    [22, 'ряда'],
    [111, 'рядов'],
    [0, 'рядов'],
  ])('%i → %s', (count, expected) => {
    expect(pluralize(count, forms)).toBe(expected)
  })
})

describe('bayLabel', () => {
  it('uses single letters first, then two letters', () => {
    expect(bayLabel(0)).toBe('A')
    expect(bayLabel(25)).toBe('Z')
    expect(bayLabel(26)).toBe('AA')
    expect(bayLabel(27)).toBe('AB')
    expect(bayLabel(52)).toBe('BA')
  })
})

describe('number formatting', () => {
  it('converts centimetres to metres with a decimal comma', () => {
    expect(formatMeters(900)).toBe('9')
    expect(formatMeters(850)).toBe('8,5')
  })

  it('rounds percentages', () => {
    expect(formatPercent(0.554)).toBe('55 %')
    expect(formatPercent(1)).toBe('100 %')
  })
})
