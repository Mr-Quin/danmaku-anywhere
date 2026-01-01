import { describe, expect, it } from 'vitest'

import {
  applyCustomCss,
  normalizeCssProperty,
  parseCustomCss,
} from './customCss'

describe('parseCustomCss', () => {
  it('parses css text into rules', () => {
    const result = parseCustomCss('color: red; font-size: 20px;')

    expect(result).toEqual([
      ['color', 'red'],
      ['font-size', '20px'],
    ])
  })

  it('ignores empty or invalid declarations', () => {
    const result = parseCustomCss('color: red;; invalid; padding:')

    expect(result).toEqual([['color', 'red']])
  })
})

describe('applyCustomCss', () => {
  it('applies rules with precedence', () => {
    const style = {
      opacity: '0.8',
      setProperty(property: string, value: string) {
        ;(this as Record<string, string>)[property] = value
      },
    } as unknown as CSSStyleDeclaration

    const node = { style } as unknown as HTMLElement

    applyCustomCss(node, [
      ['opacity', '0.5'],
      ['color', 'blue'],
    ])

    expect(style.opacity).toBe('0.5')
    expect((style as Record<string, string>).color).toBe('blue')
  })
})

describe('normalizeCssProperty', () => {
  it('converts kebab-case to camelCase', () => {
    expect(normalizeCssProperty('font-size')).toBe('fontSize')
    expect(normalizeCssProperty('pointer-events')).toBe('pointerEvents')
  })
})
