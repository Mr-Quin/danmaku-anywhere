import { describe, expect, it, vi } from 'vitest'
import { EpisodeRuns } from './episodeRuns'

/**
 * EpisodeRuns hands out one run per episode the integration works on. Starting
 * a run or ending the session aborts the run before it, and nothing else does.
 * Asserts each run's signal, whether it is current, and the change notifications.
 */

describe('EpisodeRuns', () => {
  it('keeps a run current until a newer run starts', () => {
    const runs = new EpisodeRuns()
    const first = runs.begin()
    expect(first.isCurrent()).toBe(true)
    expect(first.signal.aborted).toBe(false)

    const second = runs.begin()
    expect(first.isCurrent()).toBe(false)
    expect(first.signal.aborted).toBe(true)
    expect(second.isCurrent()).toBe(true)
    expect(first.isCurrent()).toBe(false)
    expect(second.isCurrent()).toBe(true)
  })

  it('aborts the current run when the session ends', () => {
    const runs = new EpisodeRuns()
    const run = runs.begin()
    runs.end()

    expect(run.isCurrent()).toBe(false)
    expect(run.signal.aborted).toBe(true)
  })

  it('tells listeners which run is current after each change', () => {
    const runs = new EpisodeRuns()
    const listener = vi.fn()
    runs.subscribe(listener)

    const run = runs.begin()
    runs.end()
    runs.end()

    expect(listener.mock.calls).toEqual([[run], [undefined]])
  })

  it('aborts the previous run before telling listeners about the next', () => {
    const runs = new EpisodeRuns()
    const first = runs.begin()
    let abortedWhenNotified: boolean | undefined
    runs.subscribe(() => {
      abortedWhenNotified = first.signal.aborted
    })

    runs.begin()
    expect(abortedWhenNotified).toBe(true)
  })

  it('stops notifying after unsubscribe', () => {
    const runs = new EpisodeRuns()
    const listener = vi.fn()
    const unsubscribe = runs.subscribe(listener)
    unsubscribe()

    runs.begin()
    expect(listener).not.toHaveBeenCalled()
  })
})
