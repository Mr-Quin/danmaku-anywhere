import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useToast } from '@/common/components/Toast/toastStore'
import { EpisodeToast, toastStoreSink } from './episodeToast'

/**
 * EpisodeToast holds back the progress toast until matching has taken longer
 * than the delay, so a fast match only shows its result. Every message uses one
 * toast id, so the result replaces the progress in place, and a new episode or
 * a navigation never leaves stale progress up. Each start() returns an
 * operation, and only the newest operation that is still running can change
 * the toast. Asserts the toast store.
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
  let toast: EpisodeToast

  beforeEach(() => {
    vi.useFakeTimers()
    useToast.setState({ notifications: [] })
    toast = new EpisodeToast(toastStoreSink, 1500)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows only the result for a fast match', () => {
    const operation = toast.start('Finding')
    vi.advanceTimersByTime(1000)
    operation.succeed('Mounted')
    vi.advanceTimersByTime(5000)

    expect(openMessages()).toEqual(['Mounted'])
  })

  it('shows progress after the delay and replaces it with the result', () => {
    const operation = toast.start('Finding')
    vi.advanceTimersByTime(1499)
    expect(openToasts()).toEqual([])

    vi.advanceTimersByTime(1)
    const [progress] = openToasts()
    expect(progress).toMatchObject({ severity: 'info', message: 'Finding' })
    const pending = useToast.getState().notifications[0]
    expect(pending.duration).toBeNull()
    expect(pending.loading).toBe(true)

    operation.fail('Not found', { actionLabel: 'Search' })
    expect(openToasts()).toEqual([
      { severity: 'error', message: 'Not found', key: progress.key },
    ])
  })

  it('swaps visible progress straight away when the next episode starts', () => {
    toast.start('Finding episode 1')
    vi.advanceTimersByTime(1500)
    toast.start('Finding episode 2')

    expect(openMessages()).toEqual(['Finding episode 2'])
  })

  it('drops progress on cancel but keeps a finished result', () => {
    toast.start('Finding')
    vi.advanceTimersByTime(1500)
    toast.cancel()
    expect(openToasts()).toEqual([])

    const operation = toast.start('Finding')
    operation.succeed('Mounted')
    toast.cancel()
    operation.cancel()
    expect(openMessages()).toEqual(['Mounted'])
  })

  it('never shows progress that was cancelled before the delay', () => {
    toast.start('Finding').cancel()
    vi.advanceTimersByTime(5000)

    expect(openToasts()).toEqual([])
  })

  it('closes the toast when the outcome is shown elsewhere', () => {
    const operation = toast.start('Finding')
    vi.advanceTimersByTime(1500)
    operation.dismiss()

    expect(openToasts()).toEqual([])
  })

  it('shows a result straight away for an operation without progress', () => {
    toast.start('Finding')
    vi.advanceTimersByTime(1500)
    toast.start().fail('Policy not found')
    vi.advanceTimersByTime(5000)

    expect(openMessages()).toEqual(['Policy not found'])
  })

  it('reports an operation as current until it finishes or is replaced', () => {
    const first = toast.start('Finding episode 1')
    expect(first.isCurrent()).toBe(true)

    const second = toast.start('Finding episode 2')
    expect(first.isCurrent()).toBe(false)
    expect(second.isCurrent()).toBe(true)

    second.succeed('Mounted')
    expect(second.isCurrent()).toBe(false)

    const third = toast.start('Finding episode 3')
    toast.cancel()
    expect(third.isCurrent()).toBe(false)
  })

  describe('an operation that finishes after a newer one started', () => {
    it.each([
      ['succeed', 'Mounted episode 1'],
      ['fail', 'Failed episode 1'],
      ['warn', 'Warned episode 1'],
    ] as const)('ignores %s after a cancel', (method, message) => {
      const first = toast.start('Finding episode 1')
      vi.advanceTimersByTime(1500)
      toast.cancel()
      toast.start('Finding episode 2')
      vi.advanceTimersByTime(1500)

      first[method](message)

      expect(openToasts()).toEqual([
        expect.objectContaining({
          severity: 'info',
          message: 'Finding episode 2',
        }),
      ])
    })

    it('leaves the newer progress pending while it waits for the delay', () => {
      const first = toast.start('Finding episode 1')
      toast.cancel()
      toast.start('Finding episode 2')

      first.succeed('Mounted episode 1')
      expect(openToasts()).toEqual([])

      vi.advanceTimersByTime(1500)
      expect(openMessages()).toEqual(['Finding episode 2'])
    })

    it('cannot dismiss or cancel the newer progress', () => {
      const first = toast.start('Finding episode 1')
      const second = toast.start('Finding episode 2')
      vi.advanceTimersByTime(1500)

      first.dismiss()
      first.cancel()
      expect(openMessages()).toEqual(['Finding episode 2'])

      second.succeed('Mounted episode 2')
      expect(openMessages()).toEqual(['Mounted episode 2'])
    })

    it('does not bring back its result over the newer result', () => {
      const first = toast.start('Finding episode 1')
      const second = toast.start('Finding episode 2')
      second.succeed('Mounted episode 2')

      first.fail('Failed episode 1')
      expect(openMessages()).toEqual(['Mounted episode 2'])
    })
  })
})
