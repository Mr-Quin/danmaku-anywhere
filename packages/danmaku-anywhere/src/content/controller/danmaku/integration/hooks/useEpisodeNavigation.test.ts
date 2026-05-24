import { afterEach, describe, expect, it, vi } from 'vitest'
import { findFirstVisibleNode, shouldAutoAdvance } from './useEpisodeNavigation'

/**
 * Exercises the pure helpers backing the episode-navigation hook:
 * xpath-based first-visible resolution (visibility filter, quick-priority,
 * empty / no-match handling) and the auto-advance gate predicate
 * (enabled flag, canGoNext flag, duration threshold).
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

  it('skips selectors that match disabled buttons', () => {
    document.body.innerHTML = `
      <button id="off" disabled></button>
      <button id="on"></button>
    `

    const result = findFirstVisibleNode([
      { value: '//button[@id="off"]', quick: false },
      { value: '//button[@id="on"]', quick: false },
    ])

    expect(result?.id).toBe('on')
  })

  it('skips selectors that match opacity-zero nodes', () => {
    document.body.innerHTML = `
      <button id="invisible" style="opacity: 0"></button>
      <button id="visible"></button>
    `

    const result = findFirstVisibleNode([
      { value: '//button[@id="invisible"]', quick: false },
      { value: '//button[@id="visible"]', quick: false },
    ])

    expect(result?.id).toBe('visible')
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

  it('clicks the resolved node when invoked', () => {
    document.body.innerHTML = '<button id="x"></button>'
    const button = document.querySelector<HTMLButtonElement>('#x')!
    const onClick = vi.fn()
    button.addEventListener('click', onClick)

    findFirstVisibleNode([
      { value: '//button[@id="x"]', quick: false },
    ])?.click()

    expect(onClick).toHaveBeenCalledTimes(1)
  })
})

describe('shouldAutoAdvance', () => {
  it('returns false when auto-advance is disabled', () => {
    expect(shouldAutoAdvance(false, true, 1000, 30)).toBe(false)
  })

  it('returns false when there is no next episode to navigate to', () => {
    expect(shouldAutoAdvance(true, false, 1000, 30)).toBe(false)
  })

  it('returns false when duration is below the threshold', () => {
    expect(shouldAutoAdvance(true, true, 30, 30)).toBe(false)
    expect(shouldAutoAdvance(true, true, 29, 30)).toBe(false)
  })

  it('returns true when enabled, canGoNext, and duration exceeds threshold', () => {
    expect(shouldAutoAdvance(true, true, 31, 30)).toBe(true)
  })

  it('honours a custom minimum duration', () => {
    expect(shouldAutoAdvance(true, true, 100, 120)).toBe(false)
    expect(shouldAutoAdvance(true, true, 200, 120)).toBe(true)
  })
})
