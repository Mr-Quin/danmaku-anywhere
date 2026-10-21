import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { IntegrationPolicy } from '@/common/options/integrationPolicyStore/schema'
import { MediaInfo } from '@/content/controller/danmaku/integration/models/MediaInfo'
import { XPathIntegrationObserver } from './XPathIntegrationObserver'

/**
 * The XPath observer polls for the policy's elements, then watches them and
 * reports the media they describe. Starting over reports the media as cleared.
 * Discovery that finishes after a reset or a destroy installs no DOM observers
 * and reports nothing else, and a failed extraction lets the same media be
 * reported again once it recovers. Mocks the XPath matching and extraction and
 * records emitted events.
 */

const ops = vi.hoisted(() => ({
  match: vi.fn(),
  extract: vi.fn(),
}))

vi.mock(
  '@/content/controller/danmaku/integration/xPathPolicyOps/matchNodesByXPathPolicy',
  () => ({ matchNodesByXPathPolicy: ops.match })
)

vi.mock(
  '@/content/controller/danmaku/integration/xPathPolicyOps/extractMediaInfo',
  () => ({ extractMediaInfo: ops.extract })
)

function extracted(title: string) {
  return { success: true, mediaInfo: new MediaInfo({ title, episode: 1 }) }
}

function record(observer: XPathIntegrationObserver) {
  const events: string[] = []
  observer.on({
    mediaElementsChange: () => {
      events.push('mediaElementsChange')
    },
    mediaChange: (media: MediaInfo) => {
      events.push(`mediaChange ${media.title}`)
    },
    mediaCleared: () => {
      events.push('mediaCleared')
    },
    error: (error) => {
      events.push(`error ${error.message}`)
    },
  })
  return events
}

describe('XPathIntegrationObserver', () => {
  let observer: XPathIntegrationObserver
  let title: HTMLElement

  beforeEach(() => {
    vi.useFakeTimers()
    title = document.createElement('span')
    title.textContent = 'Show A'
    document.body.replaceChildren(title)
    ops.extract.mockReset().mockReturnValue(extracted('Show A'))
    ops.match.mockReset().mockReturnValue({
      title,
      episode: null,
      season: null,
      episodeTitle: null,
    })
    observer = new XPathIntegrationObserver({} as IntegrationPolicy)
  })

  afterEach(() => {
    observer.destroy()
    vi.useRealTimers()
  })

  it('reports the media once the elements are found', async () => {
    const events = record(observer)

    observer.run()
    await vi.advanceTimersByTimeAsync(1000)

    expect(events).toEqual(['mediaElementsChange', 'mediaChange Show A'])
  })

  it.each([
    ['reset', (o: XPathIntegrationObserver) => o.reset()],
    ['destroy', (o: XPathIntegrationObserver) => o.destroy()],
  ])('reports only the cleared media for discovery that finishes after a %s', async (_, stop) => {
    const events = record(observer)
    const observe = vi.spyOn(MutationObserver.prototype, 'observe')

    observer.run()
    vi.advanceTimersByTime(1000)
    stop(observer)
    await vi.advanceTimersByTimeAsync(0)

    expect(events).toEqual(['mediaCleared'])
    expect(observe).not.toHaveBeenCalled()
  })

  it('reports the media again once a failed extraction recovers', async () => {
    const events = record(observer)
    observer.run()
    await vi.advanceTimersByTimeAsync(1000)

    ops.extract.mockReturnValueOnce({ success: false, error: 'No title' })
    title.textContent = 'Loading'
    await vi.advanceTimersByTimeAsync(0)
    title.textContent = 'Show A'
    await vi.advanceTimersByTimeAsync(0)

    expect(events).toEqual([
      'mediaElementsChange',
      'mediaChange Show A',
      'error No title',
      'mediaChange Show A',
    ])
  })

  it('reports cleared media when it starts over after the title is removed', async () => {
    const events = record(observer)
    observer.run()
    await vi.advanceTimersByTimeAsync(1000)

    title.remove()
    await vi.advanceTimersByTimeAsync(0)

    expect(events).toEqual([
      'mediaElementsChange',
      'mediaChange Show A',
      'mediaCleared',
    ])
  })

  it('reports an error instead of polling when there is no policy', async () => {
    const withoutPolicy = new XPathIntegrationObserver(null)
    const events = record(withoutPolicy)

    withoutPolicy.run()
    await vi.advanceTimersByTimeAsync(5000)

    expect(events).toEqual(['error Policy not found'])
    expect(ops.match).not.toHaveBeenCalled()
    withoutPolicy.destroy()
  })
})
