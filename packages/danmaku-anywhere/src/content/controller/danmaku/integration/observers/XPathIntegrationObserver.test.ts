import type { MockInstance } from 'vitest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { IntegrationPolicy } from '@/common/options/integrationPolicyStore/schema'
import { MediaInfo } from '@/content/controller/danmaku/integration/models/MediaInfo'
import type { MediaElements } from '@/content/controller/danmaku/integration/observers/MediaObserver'
import { XPathIntegrationObserver } from '@/content/controller/danmaku/integration/observers/XPathIntegrationObserver'

vi.mock(
  '@/content/controller/danmaku/integration/xPathPolicyOps/matchNodesByXPathPolicy',
  () => ({
    matchNodesByXPathPolicy: vi.fn(),
  })
)

vi.mock(
  '@/content/controller/danmaku/integration/xPathPolicyOps/extractMediaInfo',
  () => ({
    extractMediaInfo: vi.fn(),
  })
)

import { extractMediaInfo } from '@/content/controller/danmaku/integration/xPathPolicyOps/extractMediaInfo'
import { matchNodesByXPathPolicy } from '@/content/controller/danmaku/integration/xPathPolicyOps/matchNodesByXPathPolicy'

const mockedMatchNodes = matchNodesByXPathPolicy as unknown as MockInstance
const mockedExtractMediaInfo = extractMediaInfo as unknown as MockInstance

/**
 * Flush microtask queue so resolved promises propagate
 */
const flush = () => vi.advanceTimersByTimeAsync(0)

function makeMockPolicy(): IntegrationPolicy {
  return {
    version: 3,
    title: {
      selector: [{ value: '//h1', quick: false }],
      regex: [],
    },
    episode: {
      selector: [],
      regex: [],
    },
    season: {
      selector: [],
      regex: [],
    },
    episodeTitle: {
      selector: [],
      regex: [],
    },
    options: {},
  }
}

function makeMockElements(): MediaElements {
  const title = document.createElement('span')
  title.textContent = 'Test Anime'
  const episode = document.createElement('span')
  episode.textContent = '1'
  return {
    title,
    episode,
    season: null,
    episodeTitle: null,
  }
}

describe('XPathIntegrationObserver', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  describe('run()', () => {
    it('calls reset() then starts polling via setInterval', () => {
      const policy = makeMockPolicy()
      const observer = new XPathIntegrationObserver(policy)
      const resetSpy = vi.spyOn(observer, 'reset')

      mockedMatchNodes.mockReturnValue(null)

      observer.run()

      expect(resetSpy).toHaveBeenCalledTimes(1)
      observer.destroy()
    })

    it('polls matchNodesByXPathPolicy each interval tick', async () => {
      const policy = makeMockPolicy()
      const observer = new XPathIntegrationObserver(policy)

      mockedMatchNodes.mockReturnValue(null)

      observer.run()

      // First tick
      await vi.advanceTimersByTimeAsync(1000)
      expect(mockedMatchNodes).toHaveBeenCalledTimes(1)

      // Second tick
      await vi.advanceTimersByTimeAsync(1000)
      expect(mockedMatchNodes).toHaveBeenCalledTimes(2)

      // Third tick
      await vi.advanceTimersByTimeAsync(1000)
      expect(mockedMatchNodes).toHaveBeenCalledTimes(3)

      observer.destroy()
    })
  })

  describe('element discovery', () => {
    it('emits mediaElementsChange when matchNodesByXPathPolicy returns elements', async () => {
      const policy = makeMockPolicy()
      const observer = new XPathIntegrationObserver(policy)
      const mockElements = makeMockElements()
      const mediaElementsHandler = vi.fn()

      observer.on({ mediaElementsChange: mediaElementsHandler })

      mockedMatchNodes.mockReturnValue(null)
      mockedExtractMediaInfo.mockReturnValue({
        success: true,
        mediaInfo: new MediaInfo({ title: 'Test Anime', episode: 1 }),
      })

      observer.run()

      // First tick: not found yet
      await vi.advanceTimersByTimeAsync(1000)
      expect(mediaElementsHandler).not.toHaveBeenCalled()

      // Second tick: found
      mockedMatchNodes.mockReturnValue(mockElements)
      await vi.advanceTimersByTimeAsync(1000)
      await flush()

      expect(mediaElementsHandler).toHaveBeenCalledWith(mockElements)

      observer.destroy()
    })

    it('calls extractMediaInfo after elements are found and emits mediaChange on success', async () => {
      const policy = makeMockPolicy()
      const observer = new XPathIntegrationObserver(policy)
      const mockElements = makeMockElements()
      const mediaChangeHandler = vi.fn()
      const mediaInfo = new MediaInfo({ title: 'Test Anime', episode: 1 })

      observer.on({ mediaChange: mediaChangeHandler })

      mockedMatchNodes.mockReturnValue(mockElements)
      mockedExtractMediaInfo.mockReturnValue({
        success: true,
        mediaInfo,
      })

      observer.run()

      await vi.advanceTimersByTimeAsync(1000)
      await flush()

      expect(mockedExtractMediaInfo).toHaveBeenCalledWith(mockElements, policy)
      expect(mediaChangeHandler).toHaveBeenCalledWith(mediaInfo)

      observer.destroy()
    })

    it('emits error when extractMediaInfo fails', async () => {
      const policy = makeMockPolicy()
      const observer = new XPathIntegrationObserver(policy)
      const mockElements = makeMockElements()
      const errorHandler = vi.fn()

      observer.on({ error: errorHandler })

      mockedMatchNodes.mockReturnValue(mockElements)
      mockedExtractMediaInfo.mockReturnValue({
        success: false,
        error: 'Could not parse title',
      })

      observer.run()

      await vi.advanceTimersByTimeAsync(1000)
      await flush()

      expect(errorHandler).toHaveBeenCalledWith(
        new Error('Could not parse title')
      )

      observer.destroy()
    })
  })

  describe('reset()', () => {
    it('clears the polling interval so no further ticks fire', async () => {
      const policy = makeMockPolicy()
      const observer = new XPathIntegrationObserver(policy)

      mockedMatchNodes.mockReturnValue(null)

      observer.run()

      // Let one tick fire
      await vi.advanceTimersByTimeAsync(1000)
      const callsBeforeReset = mockedMatchNodes.mock.calls.length

      observer.reset()

      // After reset, further ticks should not call matchNodes
      await vi.advanceTimersByTimeAsync(3000)
      expect(mockedMatchNodes).toHaveBeenCalledTimes(callsBeforeReset)
    })

    it('disconnects MutationObservers and clears status and mediaInfo', async () => {
      const policy = makeMockPolicy()
      const observer = new XPathIntegrationObserver(policy)
      const mockElements = makeMockElements()

      mockedMatchNodes.mockReturnValue(mockElements)
      mockedExtractMediaInfo.mockReturnValue({
        success: true,
        mediaInfo: new MediaInfo({ title: 'Test Anime', episode: 1 }),
      })

      observer.run()

      await vi.advanceTimersByTimeAsync(1000)
      await flush()

      // After setup, mediaInfo should be set
      expect(observer['mediaInfo']).toBeDefined()

      observer.reset()

      expect(observer['status']).toBe('')
      expect(observer['mediaInfo']).toBeUndefined()
      expect(observer['observerMap'].size).toBe(0)
    })
  })

  describe('destroy()', () => {
    it('calls reset and clears subscriptions', () => {
      const policy = makeMockPolicy()
      const observer = new XPathIntegrationObserver(policy)
      const resetSpy = vi.spyOn(observer, 'reset')
      const handler = vi.fn()

      observer.on({ statusChange: handler })

      observer.destroy()

      expect(resetSpy).toHaveBeenCalled()

      // After destroy, emitting should not call handler
      observer.emit('statusChange', 'test')
      expect(handler).not.toHaveBeenCalled()
    })
  })

  describe('null policy', () => {
    it('does not crash when policy is null', () => {
      const observer = new XPathIntegrationObserver(null)

      // run() should not throw synchronously even with null policy
      expect(() => {
        observer.run()
      }).not.toThrow()

      observer.destroy()
    })
  })

  describe('status updates', () => {
    it('emits statusChange when polling starts', () => {
      const policy = makeMockPolicy()
      const observer = new XPathIntegrationObserver(policy)
      const statusHandler = vi.fn()

      observer.on({ statusChange: statusHandler })

      mockedMatchNodes.mockReturnValue(null)

      observer.run()

      expect(statusHandler).toHaveBeenCalledWith(
        'Looking for video elements...'
      )

      observer.destroy()
    })
  })
})
