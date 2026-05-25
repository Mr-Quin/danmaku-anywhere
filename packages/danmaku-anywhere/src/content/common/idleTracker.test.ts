import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createIdleTracker } from './idleTracker'

/**
 * Exercises the vanilla idle tracker shared by the density chart and info
 * panel. Verifies activity dispatches subscriber callbacks, the idle timer
 * flips state after the configured timeout, repeated activity resets the
 * timer, and destroy detaches listeners and clears subscribers.
 */
describe('createIdleTracker', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  function activity(target: HTMLElement) {
    target.dispatchEvent(new MouseEvent('mousemove', { bubbles: true }))
  }

  it('starts active and flips to idle after the timeout', () => {
    const target = document.createElement('div')
    const tracker = createIdleTracker(target, { idleMs: 1000 })
    const listener = vi.fn()
    tracker.subscribe(listener)

    expect(tracker.getActive()).toBe(true)
    vi.advanceTimersByTime(1000)
    expect(tracker.getActive()).toBe(false)
    expect(listener).toHaveBeenCalledWith(false)

    tracker.destroy()
  })

  it('resets the idle timer on activity', () => {
    const target = document.createElement('div')
    const tracker = createIdleTracker(target, { idleMs: 1000 })
    tracker.subscribe(() => {})

    vi.advanceTimersByTime(1000)
    expect(tracker.getActive()).toBe(false)

    activity(target)
    expect(tracker.getActive()).toBe(true)
    vi.advanceTimersByTime(500)
    expect(tracker.getActive()).toBe(true)
    vi.advanceTimersByTime(500)
    expect(tracker.getActive()).toBe(false)

    tracker.destroy()
  })

  it('notifies all subscribers on state transitions and stops on unsubscribe', () => {
    const target = document.createElement('div')
    const tracker = createIdleTracker(target, { idleMs: 1000 })
    const a = vi.fn()
    const b = vi.fn()
    const unsubA = tracker.subscribe(a)
    tracker.subscribe(b)

    vi.advanceTimersByTime(1000)
    expect(a).toHaveBeenCalledWith(false)
    expect(b).toHaveBeenCalledWith(false)

    unsubA()
    activity(target)
    expect(b).toHaveBeenLastCalledWith(true)
    expect(a).toHaveBeenCalledTimes(1)

    tracker.destroy()
  })

  it('detaches event listeners and clears subscribers on destroy', () => {
    const target = document.createElement('div')
    const tracker = createIdleTracker(target, { idleMs: 1000 })
    const listener = vi.fn()
    tracker.subscribe(listener)

    vi.advanceTimersByTime(1000)
    listener.mockClear()

    tracker.destroy()
    activity(target)
    vi.advanceTimersByTime(5000)
    expect(listener).not.toHaveBeenCalled()
  })
})
