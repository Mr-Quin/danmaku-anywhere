import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { IntegrationPolicy } from '@/common/options/integrationPolicyStore/schema'
import type { MediaInfo } from '@/content/controller/danmaku/integration/models/MediaInfo'
import { XPathIntegrationObserver } from './XPathIntegrationObserver'

/**
 * The XPath observer polls for the policy's elements, then watches them and
 * reports the media they describe. Discovery that finishes after a reset or a
 * destroy installs no DOM observers and reports nothing. Mocks the XPath
 * matching and extraction and records emitted events.
 */

const ops = vi.hoisted(() => ({
  match: vi.fn(),
}))

vi.mock(
  '@/content/controller/danmaku/integration/xPathPolicyOps/matchNodesByXPathPolicy',
  () => ({ matchNodesByXPathPolicy: ops.match })
)

vi.mock(
  '@/content/controller/danmaku/integration/xPathPolicyOps/extractMediaInfo',
  async () => {
    const { MediaInfo } = await import(
      '@/content/controller/danmaku/integration/models/MediaInfo'
    )
    return {
      extractMediaInfo: () => ({
        success: true,
        mediaInfo: new MediaInfo({ title: 'Show A', episode: 1 }),
      }),
    }
  }
)

function record(observer: XPathIntegrationObserver) {
  const events: string[] = []
  observer.on({
    mediaElementsChange: () => {
      events.push('mediaElementsChange')
    },
    mediaChange: (media: MediaInfo) => {
      events.push(`mediaChange ${media.title}`)
    },
  })
  return events
}

describe('XPathIntegrationObserver', () => {
  let observer: XPathIntegrationObserver

  beforeEach(() => {
    vi.useFakeTimers()
    const title = document.createElement('span')
    title.textContent = 'Show A'
    document.body.replaceChildren(title)
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
  ])('reports nothing for discovery that finishes after a %s', async (_, stop) => {
    const events = record(observer)
    const observe = vi.spyOn(MutationObserver.prototype, 'observe')

    observer.run()
    vi.advanceTimersByTime(1000)
    stop(observer)
    await vi.advanceTimersByTimeAsync(0)

    expect(events).toEqual([])
    expect(observe).not.toHaveBeenCalled()
  })
})
