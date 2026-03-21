import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { MountConfig } from '@/common/options/mountConfig/schema'
import { MediaInfo } from '@/content/controller/danmaku/integration/models/MediaInfo'

const mockFetchQuery = vi.fn()

vi.mock('@/common/queries/queryClient', () => ({
  queryClient: {
    fetchQuery: (...args: unknown[]) => mockFetchQuery(...args),
  },
}))

vi.mock('@/common/queries/queryKeys', () => ({
  genAIQueryKeys: {
    extractTitle: (data: string) => ['genAI', 'extractTitle', data],
  },
}))

const mockExtractTitle = vi.fn()

vi.mock('@/common/rpcClient/background/client', () => ({
  chromeRpcClient: {
    extractTitle: (...args: unknown[]) => mockExtractTitle(...args),
  },
}))

vi.mock('@/common/utils/utils', async (importOriginal) => {
  const original = await importOriginal<Record<string, unknown>>()
  return {
    ...original,
    sleep: vi.fn().mockResolvedValue(undefined),
  }
})

const mockConfig = {
  mode: 'ai' as const,
  ai: { providerId: 'test-provider' },
  patterns: [],
  mediaQuery: '',
  enabled: true,
  name: 'test',
} as unknown as MountConfig

function setupDom() {
  document.head.innerHTML = ''
  document.body.innerHTML = ''
  const title = document.createElement('title')
  title.textContent = 'Test Page Title'
  document.head.appendChild(title)
  const h1 = document.createElement('h1')
  h1.textContent = 'My Show Episode 1'
  document.body.appendChild(h1)
}

function clearDom() {
  document.head.innerHTML = ''
  document.body.innerHTML = ''
}

describe('AiIntegrationObserver', () => {
  beforeEach(() => {
    setupDom()
    vi.clearAllMocks()
  })

  afterEach(() => {
    clearDom()
  })

  async function createObserver(config: MountConfig | null = mockConfig) {
    const { AiIntegrationObserver } = await import('./AiIntegrationObserver')
    return new AiIntegrationObserver(config)
  }

  async function flushPromises() {
    // sleep is mocked to resolve immediately, so we just need to flush microtasks
    for (let i = 0; i < 10; i++) {
      await Promise.resolve()
    }
  }

  describe('run()', () => {
    it('calls reset() then starts AI flow', async () => {
      const observer = await createObserver()
      const resetSpy = vi.spyOn(observer, 'reset')

      mockFetchQuery.mockResolvedValue({
        data: { isShow: false },
      })

      observer.run()
      await flushPromises()

      expect(resetSpy).toHaveBeenCalledTimes(1)
    })

    it('emits statusChange events during the flow', async () => {
      const observer = await createObserver()
      const statusHandler = vi.fn()
      observer.on({ statusChange: statusHandler })

      mockFetchQuery.mockResolvedValue({
        data: { isShow: false },
      })

      observer.run()
      await flushPromises()

      expect(statusHandler).toHaveBeenCalledWith('Waiting for page load...')
      expect(statusHandler).toHaveBeenCalledWith(
        'Extracting video info using AI...'
      )
    })

    it('calls queryClient.fetchQuery with extractTitle after sleep', async () => {
      const observer = await createObserver()

      mockFetchQuery.mockResolvedValue({
        data: { isShow: false },
      })

      observer.run()
      await flushPromises()

      expect(mockFetchQuery).toHaveBeenCalledTimes(1)
      const callArgs = mockFetchQuery.mock.calls[0][0]
      expect(callArgs.queryKey[0]).toBe('genAI')
      expect(callArgs.queryKey[1]).toBe('extractTitle')
      expect(typeof callArgs.queryKey[2]).toBe('string')
    })

    it('passes config.ai options to extractTitle', async () => {
      const observer = await createObserver()

      mockFetchQuery.mockImplementation(async ({ queryFn }) => {
        await queryFn()
        return { data: { isShow: false } }
      })

      observer.run()
      await flushPromises()

      // The queryFn calls chromeRpcClient.extractTitle with the config
      expect(mockExtractTitle).toHaveBeenCalledWith(
        expect.objectContaining({
          options: { providerId: 'test-provider' },
        })
      )
    })

    it('uses DEFAULT_MOUNT_CONFIG_AI_CONFIG when config.ai is undefined', async () => {
      const configNoAi = {
        ...mockConfig,
        ai: undefined,
      } as unknown as MountConfig
      const observer = await createObserver(configNoAi)

      mockFetchQuery.mockImplementation(async ({ queryFn }) => {
        await queryFn()
        return { data: { isShow: false } }
      })

      observer.run()
      await flushPromises()

      expect(mockExtractTitle).toHaveBeenCalledWith(
        expect.objectContaining({
          options: expect.objectContaining({ providerId: expect.any(String) }),
        })
      )
    })
  })

  describe('isShow=false', () => {
    it('emits statusChange with "No show detected" and no mediaChange', async () => {
      const observer = await createObserver()
      const statusHandler = vi.fn()
      const mediaHandler = vi.fn()

      observer.on({ statusChange: statusHandler, mediaChange: mediaHandler })

      mockFetchQuery.mockResolvedValue({
        data: { isShow: false },
      })

      observer.run()
      await flushPromises()

      expect(statusHandler).toHaveBeenCalledWith('No show detected')
      expect(mediaHandler).not.toHaveBeenCalled()
    })
  })

  describe('isShow=true', () => {
    it('emits mediaChange with correct MediaInfo', async () => {
      const observer = await createObserver()
      const mediaHandler = vi.fn()
      const statusHandler = vi.fn()

      observer.on({ mediaChange: mediaHandler, statusChange: statusHandler })

      mockFetchQuery.mockResolvedValue({
        data: { isShow: true, title: 'Naruto', episode: 5 },
      })

      observer.run()
      await flushPromises()

      expect(mediaHandler).toHaveBeenCalledTimes(1)
      const mediaInfo = mediaHandler.mock.calls[0][0]
      expect(mediaInfo).toBeInstanceOf(MediaInfo)
      expect(mediaInfo.title).toBe('Naruto')
      expect(mediaInfo.episode).toBe(5)
    })

    it('emits statusChange with video info found message', async () => {
      const observer = await createObserver()
      const statusHandler = vi.fn()

      observer.on({ statusChange: statusHandler })

      mockFetchQuery.mockResolvedValue({
        data: { isShow: true, title: 'Naruto', episode: 5 },
      })

      observer.run()
      await flushPromises()

      expect(statusHandler).toHaveBeenCalledWith(
        expect.stringContaining('Video info found:')
      )
    })
  })

  describe('abort handling', () => {
    it('abort before RPC results in no mediaChange and no error', async () => {
      const { sleep } = await import('@/common/utils/utils')
      const sleepMock = vi.mocked(sleep)

      const observer = await createObserver()
      const mediaHandler = vi.fn()
      const errorHandler = vi.fn()

      observer.on({ mediaChange: mediaHandler, error: errorHandler })

      // Make sleep resolve, but abort during sleep
      sleepMock.mockImplementation(async () => {
        observer.reset()
      })

      observer.run()
      await flushPromises()

      expect(mockFetchQuery).not.toHaveBeenCalled()
      expect(mediaHandler).not.toHaveBeenCalled()
      expect(errorHandler).not.toHaveBeenCalled()
    })

    it('abort after RPC results in no mediaChange', async () => {
      const observer = await createObserver()
      const mediaHandler = vi.fn()

      observer.on({ mediaChange: mediaHandler })

      mockFetchQuery.mockImplementation(async () => {
        // Simulate abort happening after the query resolves
        observer.reset()
        return { data: { isShow: true, title: 'Naruto', episode: 1 } }
      })

      observer.run()
      await flushPromises()

      expect(mediaHandler).not.toHaveBeenCalled()
    })
  })

  describe('error handling', () => {
    it('emits error event when RPC throws an Error', async () => {
      const observer = await createObserver()
      const errorHandler = vi.fn()
      const statusHandler = vi.fn()

      observer.on({ error: errorHandler, statusChange: statusHandler })

      const testError = new Error('Network failure')
      mockFetchQuery.mockRejectedValue(testError)

      observer.run()
      await flushPromises()

      expect(errorHandler).toHaveBeenCalledWith(testError)
      expect(statusHandler).toHaveBeenCalledWith('Error extracting info')
    })

    it('does not emit error event for non-Error throws', async () => {
      const observer = await createObserver()
      const errorHandler = vi.fn()
      const statusHandler = vi.fn()

      observer.on({ error: errorHandler, statusChange: statusHandler })

      mockFetchQuery.mockRejectedValue('string error')

      observer.run()
      await flushPromises()

      expect(errorHandler).not.toHaveBeenCalled()
      expect(statusHandler).toHaveBeenCalledWith('Error extracting info')
    })
  })

  describe('reset()', () => {
    it('aborts all pending requests and clears state', async () => {
      const observer = await createObserver()

      mockFetchQuery.mockResolvedValue({
        data: { isShow: true, title: 'Test', episode: 1 },
      })

      observer.run()
      await flushPromises()

      observer.reset()

      // After reset, status and mediaInfo should be cleared
      // We can verify by checking that a subsequent statusChange fires
      const statusHandler = vi.fn()
      observer.on({ statusChange: statusHandler })

      // Status was cleared to '', so setting any new status should emit
      mockFetchQuery.mockResolvedValue({
        data: { isShow: false },
      })

      observer.run()
      await flushPromises()

      expect(statusHandler).toHaveBeenCalledWith('Waiting for page load...')
    })
  })

  describe('sequential run() calls', () => {
    it('abort previous in-flight requests when run() is called again', async () => {
      const { sleep } = await import('@/common/utils/utils')
      const sleepMock = vi.mocked(sleep)

      const observer = await createObserver()
      const mediaHandler = vi.fn()

      observer.on({ mediaChange: mediaHandler })

      // Make the first sleep block so second run() can abort it
      let resolveFirstSleep: () => void
      sleepMock.mockImplementationOnce(
        () =>
          new Promise<void>((resolve) => {
            resolveFirstSleep = resolve
          })
      )
      // Second run's sleep resolves immediately
      sleepMock.mockResolvedValueOnce(undefined)

      mockFetchQuery.mockResolvedValue({
        data: { isShow: true, title: 'Second Show', episode: 2 },
      })

      // First run - will block on sleep
      observer.run()
      await flushPromises()

      // Second run - reset() aborts first, then proceeds
      observer.run()
      await flushPromises()

      // Now resolve first sleep - but it should be aborted
      resolveFirstSleep!()
      await flushPromises()

      // Only the second run's result should produce mediaChange
      expect(mediaHandler).toHaveBeenCalledTimes(1)
      const mediaInfo = mediaHandler.mock.calls[0][0]
      expect(mediaInfo.title).toBe('Second Show')
      expect(mediaInfo.episode).toBe(2)
    })
  })

  describe('destroy()', () => {
    it('calls reset and clears subscriptions', async () => {
      const observer = await createObserver()
      const statusHandler = vi.fn()

      observer.on({ statusChange: statusHandler })
      observer.destroy()

      // After destroy, events should not be delivered
      mockFetchQuery.mockResolvedValue({
        data: { isShow: false },
      })

      observer.run()
      await flushPromises()

      // statusHandler should not be called because subscriptions were cleared
      expect(statusHandler).not.toHaveBeenCalled()
    })

    it('calls reset to abort pending operations', async () => {
      const observer = await createObserver()
      const resetSpy = vi.spyOn(observer, 'reset')

      observer.destroy()

      expect(resetSpy).toHaveBeenCalled()
    })
  })

  describe('null config', () => {
    it('uses default AI config when config is null', async () => {
      const observer = await createObserver(null)

      mockFetchQuery.mockImplementation(async ({ queryFn }) => {
        await queryFn()
        return { data: { isShow: false } }
      })

      observer.run()
      await flushPromises()

      expect(mockExtractTitle).toHaveBeenCalledWith(
        expect.objectContaining({
          options: expect.objectContaining({ providerId: expect.any(String) }),
        })
      )
    })
  })
})
