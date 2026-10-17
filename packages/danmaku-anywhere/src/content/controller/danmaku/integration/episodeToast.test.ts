import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useToast } from '@/common/components/Toast/toastStore'
import { EpisodeRuns } from './episodeRuns'
import { EpisodeToast, toastStoreSink } from './episodeToast'

/**
 * EpisodeToast shows what the current episode run is doing. Progress only
 * shows once a run has worked for longer than the delay, so a fast match shows
 * nothing but its result, and every message uses one toast id so the result
 * replaces the progress in place. Only the current run can change the toast,
 * and showing a result does not end the run. Asserts the toast store.
 */

function openToasts() {
  return useToast
    .getState()
    .notifications.filter((n) => n.open)
    .map((n) => ({ severity: n.severity, message: n.message, key: n.key }))
}

function openMessages() {
  return openToasts().map((t) => t.message)
}

describe('EpisodeToast', () => {
  let runs: EpisodeRuns
  let toast: EpisodeToast

  beforeEach(() => {
    vi.useFakeTimers()
    useToast.setState({ notifications: [] })
    runs = new EpisodeRuns()
    toast = new EpisodeToast(toastStoreSink, 1500)
    toast.follow(runs)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows only the result for a fast match', () => {
    const run = runs.begin()
    toast.progress(run, 'Finding')
    vi.advanceTimersByTime(1000)
    toast.report(run, 'success', 'Mounted')
    vi.advanceTimersByTime(5000)

    expect(openMessages()).toEqual(['Mounted'])
  })

  it('shows progress after the delay and replaces it with the result', () => {
    const run = runs.begin()
    toast.progress(run, 'Finding')
    vi.advanceTimersByTime(1499)
    expect(openToasts()).toEqual([])

    vi.advanceTimersByTime(1)
    const [progress] = openToasts()
    expect(progress).toMatchObject({ severity: 'info', message: 'Finding' })
    const pending = useToast.getState().notifications[0]
    expect(pending.duration).toBeNull()
    expect(pending.loading).toBe(true)

    toast.report(run, 'error', 'Not found', { actionLabel: 'Search' })
    expect(openToasts()).toEqual([
      { severity: 'error', message: 'Not found', key: progress.key },
    ])
  })

  it('swaps visible progress straight away when the next run starts', () => {
    toast.progress(runs.begin(), 'Finding episode 1')
    vi.advanceTimersByTime(1500)
    toast.progress(runs.begin(), 'Finding episode 2')

    expect(openMessages()).toEqual(['Finding episode 2'])
  })

  it('drops progress when the session ends but keeps a finished result', () => {
    toast.progress(runs.begin(), 'Finding')
    vi.advanceTimersByTime(1500)
    runs.end()
    expect(openToasts()).toEqual([])

    const run = runs.begin()
    toast.progress(run, 'Finding')
    toast.report(run, 'success', 'Mounted')
    runs.end()
    expect(openMessages()).toEqual(['Mounted'])
  })

  it('never shows progress whose run ended before the delay', () => {
    toast.progress(runs.begin(), 'Finding')
    runs.end()
    vi.advanceTimersByTime(5000)

    expect(openToasts()).toEqual([])
  })

  it('never shows the pending progress of a replaced run', () => {
    toast.progress(runs.begin(), 'Finding episode 1')
    const second = runs.begin()
    vi.advanceTimersByTime(5000)
    expect(openToasts()).toEqual([])

    toast.report(second, 'error', 'Policy not found')
    expect(openMessages()).toEqual(['Policy not found'])
  })

  it('closes the toast when the outcome is shown elsewhere', () => {
    const run = runs.begin()
    toast.progress(run, 'Finding')
    vi.advanceTimersByTime(1500)
    toast.dismiss(run)

    expect(openToasts()).toEqual([])
  })

  it('leaves the run current after showing its result', () => {
    const run = runs.begin()
    toast.report(run, 'success', 'Mounted')
    expect(run.isCurrent()).toBe(true)

    toast.dismiss(run)
    expect(run.isCurrent()).toBe(true)
  })

  describe('a run that reports after a newer run started', () => {
    it.each([
      'success',
      'error',
      'warning',
    ] as const)('ignores a late %s', (severity) => {
      const first = runs.begin()
      toast.progress(first, 'Finding episode 1')
      vi.advanceTimersByTime(1500)
      runs.end()
      toast.progress(runs.begin(), 'Finding episode 2')
      vi.advanceTimersByTime(1500)

      toast.report(first, severity, 'Episode 1 result')

      expect(openToasts()).toEqual([
        expect.objectContaining({
          severity: 'info',
          message: 'Finding episode 2',
        }),
      ])
    })

    it('leaves the newer progress pending while it waits for the delay', () => {
      const first = runs.begin()
      runs.end()
      toast.progress(runs.begin(), 'Finding episode 2')

      toast.report(first, 'success', 'Mounted episode 1')
      expect(openToasts()).toEqual([])

      vi.advanceTimersByTime(1500)
      expect(openMessages()).toEqual(['Finding episode 2'])
    })

    it('cannot dismiss the newer progress or post its own', () => {
      const first = runs.begin()
      const second = runs.begin()
      toast.progress(second, 'Finding episode 2')
      vi.advanceTimersByTime(1500)

      toast.dismiss(first)
      toast.progress(first, 'Finding episode 1')
      vi.advanceTimersByTime(1500)
      expect(openMessages()).toEqual(['Finding episode 2'])

      toast.report(second, 'success', 'Mounted episode 2')
      expect(openMessages()).toEqual(['Mounted episode 2'])
    })

    it('does not bring back its result over the newer result', () => {
      const first = runs.begin()
      const second = runs.begin()
      toast.report(second, 'success', 'Mounted episode 2')

      toast.report(first, 'error', 'Failed episode 1')
      expect(openMessages()).toEqual(['Mounted episode 2'])
    })
  })

  it('drops pending progress once it stops following the runs', () => {
    const unfollowed = new EpisodeToast(toastStoreSink, 1500)
    const otherRuns = new EpisodeRuns()
    const stop = unfollowed.follow(otherRuns)
    const run = otherRuns.begin()
    unfollowed.progress(run, 'Finding')

    stop()
    vi.advanceTimersByTime(1500)
    expect(openToasts()).toEqual([])
  })
})
