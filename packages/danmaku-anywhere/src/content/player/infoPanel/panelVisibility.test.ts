import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PanelVisibility } from './panelVisibility'

/**
 * Combines the player's idle state with a short intro whenever the panel gets
 * content. Asserts content shows for the intro even while idle, hides when the
 * intro ends without activity, stays while the pointer is active, and that
 * losing content ends the intro.
 */

describe('PanelVisibility', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows new content for the intro even while idle, then hides', () => {
    const onChange = vi.fn()
    const visibility = new PanelVisibility(false, onChange, 3000)

    visibility.setHasContent(true)
    expect(visibility.isVisible()).toBe(true)

    vi.advanceTimersByTime(2999)
    expect(visibility.isVisible()).toBe(true)
    vi.advanceTimersByTime(1)
    expect(visibility.isVisible()).toBe(false)
    expect(onChange.mock.calls).toEqual([[true], [false]])
  })

  it('stays visible past the intro while the pointer is active', () => {
    const visibility = new PanelVisibility(false, () => {}, 3000)

    visibility.setHasContent(true)
    visibility.setIdleActive(true)
    vi.advanceTimersByTime(5000)
    expect(visibility.isVisible()).toBe(true)

    visibility.setIdleActive(false)
    expect(visibility.isVisible()).toBe(false)
  })

  it('does not restart the intro while the content stays', () => {
    const visibility = new PanelVisibility(false, () => {}, 3000)

    visibility.setHasContent(true)
    vi.advanceTimersByTime(2000)
    visibility.setHasContent(true)
    vi.advanceTimersByTime(1000)
    expect(visibility.isVisible()).toBe(false)
  })

  it('plays the intro again when content comes back', () => {
    const visibility = new PanelVisibility(false, () => {}, 3000)

    visibility.setHasContent(true)
    visibility.setHasContent(false)
    expect(visibility.isVisible()).toBe(false)

    vi.advanceTimersByTime(5000)
    visibility.setHasContent(true)
    expect(visibility.isVisible()).toBe(true)
  })
})
