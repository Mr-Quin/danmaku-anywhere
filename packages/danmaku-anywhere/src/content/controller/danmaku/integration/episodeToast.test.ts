import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useToast } from '@/common/components/Toast/toastStore'
import { EpisodeToast, toastStoreSink } from './episodeToast'

/**
 * EpisodeToast holds back the progress toast until matching has taken longer
 * than the delay, so a fast match only shows its result. Every message uses one
 * toast id, so the result replaces the progress in place, and a new episode or
 * a navigation never leaves stale progress up. Asserts the toast store.
 */

function openToasts() {
  return useToast
    .getState()
    .notifications.filter((n) => n.open)
    .map((n) => ({ severity: n.severity, message: n.message, key: n.key }))
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
    toast.start('Finding')
    vi.advanceTimersByTime(1000)
    toast.succeed('Mounted')
    vi.advanceTimersByTime(5000)

    expect(openToasts().map((t) => t.message)).toEqual(['Mounted'])
  })

  it('shows progress after the delay and replaces it with the result', () => {
    toast.start('Finding')
    vi.advanceTimersByTime(1499)
    expect(openToasts()).toEqual([])

    vi.advanceTimersByTime(1)
    const [progress] = openToasts()
    expect(progress).toMatchObject({ severity: 'info', message: 'Finding' })
    const pending = useToast.getState().notifications[0]
    expect(pending.duration).toBeNull()
    expect(pending.loading).toBe(true)

    toast.fail('Not found', { actionLabel: 'Search' })
    expect(openToasts()).toEqual([
      { severity: 'error', message: 'Not found', key: progress.key },
    ])
  })

  it('swaps visible progress straight away when the next episode starts', () => {
    toast.start('Finding episode 1')
    vi.advanceTimersByTime(1500)
    toast.start('Finding episode 2')

    expect(openToasts().map((t) => t.message)).toEqual(['Finding episode 2'])
  })

  it('drops progress on cancel but keeps a finished result', () => {
    toast.start('Finding')
    vi.advanceTimersByTime(1500)
    toast.cancel()
    expect(openToasts()).toEqual([])

    toast.start('Finding')
    toast.succeed('Mounted')
    toast.cancel()
    expect(openToasts().map((t) => t.message)).toEqual(['Mounted'])
  })

  it('never shows progress that was cancelled before the delay', () => {
    toast.start('Finding')
    toast.cancel()
    vi.advanceTimersByTime(5000)

    expect(openToasts()).toEqual([])
  })

  it('closes the toast when the outcome is shown elsewhere', () => {
    toast.start('Finding')
    vi.advanceTimersByTime(1500)
    toast.dismiss()

    expect(openToasts()).toEqual([])
  })
})
