import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { queryClient } from '@/common/queries/queryClient'
import type { MediaInfo } from '@/content/controller/danmaku/integration/models/MediaInfo'
import { AiIntegrationObserver } from './AiIntegrationObserver'

/**
 * The AI observer waits for the page to settle, asks the background to extract
 * the show, and reports the start and end of parsing as events. A parse that a
 * reset or a newer run has abandoned reports nothing, even when its request
 * fails afterwards. Mocks the extract-title RPC and records emitted events.
 */

const rpc = vi.hoisted(() => ({
  extractTitle: vi.fn(),
}))

vi.mock('@/common/rpcClient/background/client', () => ({
  chromeRpcClient: {
    extractTitle: rpc.extractTitle,
    remoteLog: () => Promise.resolve(),
  },
}))

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

function record(observer: AiIntegrationObserver) {
  const events: unknown[][] = []
  observer.on({
    parsingChange: (parsing) => {
      events.push(['parsingChange', parsing])
    },
    mediaChange: (media: MediaInfo) => {
      events.push(['mediaChange', media.title])
    },
    error: (error) => {
      events.push(['error', error.message])
    },
  })
  return events
}

async function settle() {
  await vi.advanceTimersByTimeAsync(0)
}

describe('AiIntegrationObserver', () => {
  let observer: AiIntegrationObserver

  beforeEach(() => {
    vi.useFakeTimers()
    queryClient.clear()
    rpc.extractTitle.mockReset()
    observer = new AiIntegrationObserver(null)
  })

  afterEach(() => {
    observer.destroy()
    vi.useRealTimers()
  })

  it('reports the parsed show between the start and end of parsing', async () => {
    rpc.extractTitle.mockResolvedValue({
      data: { isShow: true, title: 'Show A', episode: 2 },
    })
    const events = record(observer)

    observer.run()
    await vi.advanceTimersByTimeAsync(2000)

    expect(events).toEqual([
      ['parsingChange', true],
      ['mediaChange', 'Show A'],
      ['parsingChange', false],
    ])
  })

  it('ends parsing without media when the page is not a show', async () => {
    rpc.extractTitle.mockResolvedValue({ data: { isShow: false } })
    const events = record(observer)

    observer.run()
    await vi.advanceTimersByTimeAsync(2000)

    expect(events).toEqual([
      ['parsingChange', true],
      ['parsingChange', false],
    ])
  })

  it('reports nothing for a parse that fails after a reset', async () => {
    const parseA = deferred<unknown>()
    rpc.extractTitle.mockReturnValueOnce(parseA.promise)
    const events = record(observer)

    observer.run()
    await vi.advanceTimersByTimeAsync(2000)
    expect(rpc.extractTitle).toHaveBeenCalledTimes(1)

    observer.reset()
    observer.run()
    parseA.reject(new Error('quota exceeded'))
    await settle()

    expect(events).toEqual([['parsingChange', true]])
  })

  it('reports nothing for a parse that succeeds after a reset', async () => {
    const parseA = deferred<unknown>()
    rpc.extractTitle.mockReturnValueOnce(parseA.promise)
    const events = record(observer)

    observer.run()
    await vi.advanceTimersByTimeAsync(2000)
    observer.reset()
    parseA.resolve({ data: { isShow: true, title: 'Show A', episode: 1 } })
    await settle()

    expect(events).toEqual([['parsingChange', true]])
  })
})
