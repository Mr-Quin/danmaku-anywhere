import { afterEach, describe, expect, it } from 'vitest'
import { findFirstVisibleNode } from './useEpisodeNavigation'

/**
 * Verifies the xpath-based selector resolution used by episode navigation:
 * first-match-wins, hidden elements are skipped, the quick flag determines
 * priority order, and an empty selector list returns null.
 */

afterEach(() => {
  document.body.innerHTML = ''
})

describe('findFirstVisibleNode', () => {
  it('returns null when given no selectors', () => {
    document.body.innerHTML = '<button id="x"></button>'

    expect(findFirstVisibleNode([])).toBeNull()
  })

  it('returns the first selector that resolves to a visible node', () => {
    document.body.innerHTML = `
      <button id="a"></button>
      <button id="b"></button>
    `

    const result = findFirstVisibleNode([
      { value: '//button[@id="a"]', quick: false },
      { value: '//button[@id="b"]', quick: false },
    ])

    expect(result?.id).toBe('a')
  })

  it('skips selectors that match hidden nodes and falls back to the next', () => {
    document.body.innerHTML = `
      <button id="hidden" style="display: none"></button>
      <button id="shown"></button>
    `

    const result = findFirstVisibleNode([
      { value: '//button[@id="hidden"]', quick: false },
      { value: '//button[@id="shown"]', quick: false },
    ])

    expect(result?.id).toBe('shown')
  })

  it('returns null when no selector matches', () => {
    document.body.innerHTML = '<button id="a"></button>'

    const result = findFirstVisibleNode([
      { value: '//button[@id="missing"]', quick: false },
    ])

    expect(result).toBeNull()
  })

  it('prioritises quick selectors over non-quick selectors', () => {
    document.body.innerHTML = `
      <button id="quick"></button>
      <button id="slow"></button>
    `

    const result = findFirstVisibleNode([
      { value: '//button[@id="slow"]', quick: false },
      { value: '//button[@id="quick"]', quick: true },
    ])

    expect(result?.id).toBe('quick')
  })
})
