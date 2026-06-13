import { describe, expect, it } from 'vitest'
import { isOverRect } from './PlayerIdle.service'

describe('isOverRect', () => {
  const rect = { left: 100, top: 50, right: 500, bottom: 350 }

  it('counts a pointer inside the rect', () => {
    expect(
      isOverRect(
        new MouseEvent('mousemove', { clientX: 300, clientY: 200 }),
        rect
      )
    ).toBe(true)
  })

  it('ignores a pointer outside the rect', () => {
    expect(
      isOverRect(
        new MouseEvent('mousemove', { clientX: 600, clientY: 200 }),
        rect
      )
    ).toBe(false)
  })

  it('counts a pointer on the edge of the rect', () => {
    expect(
      isOverRect(
        new MouseEvent('mousemove', { clientX: 100, clientY: 50 }),
        rect
      )
    ).toBe(true)
  })

  it('ignores events without pointer coordinates', () => {
    expect(isOverRect(new Event('keydown'), rect)).toBe(false)
  })
})
