import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useToast } from '@/common/components/Toast/toastStore'
import '@/common/localization/i18n'
import { MediaInfo } from '@/content/controller/danmaku/integration/models/MediaInfo'
import { MediaObserver } from '@/content/controller/danmaku/integration/observers/MediaObserver'
import { ObserverFactory } from '@/content/controller/danmaku/integration/observers/ObserverFactory'
import { usePopup } from '@/content/controller/store/popupStore'
import { useStore } from '@/content/controller/store/store'
import { useIntegrationPolicy } from './useIntegrationPolicy'

/**
 * Automatic matching runs one operation per episode the observer reports. When
 * the observer is replaced, the video goes away, or a newer episode arrives,
 * work still in flight for the earlier episode must not mount, open the
 * selector or touch the episode toast. Drives the hook with a fake observer and
 * controllable episode match, fetch and mount calls, and asserts the toast and
 * popup stores.
 */

vi.unmock('@/common/localization/i18n')

const page = vi.hoisted(() => ({
  config: { mode: 'xpath' } as object,
}))

const rpc = vi.hoisted(() => ({
  episodeMatch: vi.fn(),
  episodeFetch: vi.fn(),
  mount: vi.fn(),
  unmount: vi.fn(),
}))

vi.mock('@/common/rpcClient/background/client', () => ({
  chromeRpcClient: {
    episodeMatch: rpc.episodeMatch,
    episodeFetch: rpc.episodeFetch,
    remoteLog: () => Promise.resolve(),
  },
  playerRpcClient: {
    player: {
      'relay:command:mount': rpc.mount,
      'relay:command:unmount': rpc.unmount,
      'relay:command:show': vi.fn(),
    },
  },
}))

vi.mock('@/common/telemetry/getTrackingService', () => ({
  getTrackingService: () => ({ track: vi.fn() }),
}))

vi.mock('@/common/options/mountConfig/isPermissive', () => ({
  isConfigPermissive: () => false,
}))

vi.mock('@/content/controller/common/context/useActiveConfig', () => ({
  useActiveConfig: () => page.config,
}))

vi.mock('@/content/controller/common/context/useActiveIntegration', () => ({
  useActiveIntegration: () => null,
}))

vi.mock('./useSyncIntegrationManualMode', () => ({
  useSyncIntegrationManualMode: () => false,
}))

vi.mock('./useWarnIncompleteConfig', () => ({
  useWarnIncompleteConfig: () => false,
}))

vi.mock('./useDescribeSourceError', () => ({
  useDescribeSourceError: () => {
    return ({
      error,
      describeFailure,
    }: {
      error: unknown
      describeFailure: (reason: string) => string
    }) => {
      return { message: describeFailure(String(error)) }
    }
  },
}))

class FakeObserver extends MediaObserver {
  constructor() {
    super()
  }

  setup = vi.fn()

  run = vi.fn()

  reset = vi.fn()
}

interface Deferred<T> {
  promise: Promise<T>
  resolve: (value: T) => void
  reject: (error: unknown) => void
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

function localEpisode(title: string) {
  return { id: 1, title, comments: [], commentCount: 3 }
}

function sourceEpisode(title: string) {
  return {
    id: 2,
    seasonId: 7,
    title: 'Episode 1',
    comments: [],
    commentCount: 5,
    season: {
      id: 7,
      title,
      providerConfigId: 'dandanplay',
      manifestId: 'dandanplay',
    },
  }
}

function fetched(title: string) {
  return { data: { episode: sourceEpisode(title) } }
}

function matched(episode: object) {
  return { data: { status: 'success', data: episode, metadata: {} } }
}

function ambiguous() {
  return {
    data: {
      status: 'disambiguation',
      data: [{ id: 9, title: 'Show A Movie' }],
      metadata: {},
    },
  }
}

function media(title: string) {
  return new MediaInfo({ title, episode: 1 })
}

function openToasts() {
  return useToast
    .getState()
    .notifications.filter((n) => n.open)
    .map((n) => ({ severity: n.severity, message: n.message }))
}

function setVideo(hasVideo: boolean, videoChangeCount: number) {
  act(() => {
    useStore.getState().frame.updateFrame(0, { hasVideo, videoChangeCount })
  })
}

async function settle() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0)
    await new Promise((resolve) => setImmediate(resolve))
  })
}

async function waitForProgressDelay() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1500)
  })
}

function IntegrationPolicy() {
  useIntegrationPolicy()
  return null
}

const initialStore = useStore.getState()
const initialPopup = usePopup.getState()

let root: Root | undefined
let queryClient: QueryClient
let observers: FakeObserver[]

function render() {
  act(() => {
    root?.render(
      <QueryClientProvider client={queryClient}>
        <IntegrationPolicy />
      </QueryClientProvider>
    )
  })
}

function replaceObserver() {
  page.config = { mode: 'xpath' }
  render()
}

function showEpisode(observer: FakeObserver, title: string) {
  act(() => {
    observer.emit('mediaChange', media(title))
  })
}

function reportStatus(observer: FakeObserver, status: string) {
  act(() => {
    observer.emit('statusChange', status)
  })
}

function reportError(observer: FakeObserver, message: string) {
  act(() => {
    observer.emit('error', new Error(message))
  })
}

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] })
  useStore.setState(initialStore, true)
  usePopup.setState(initialPopup, true)
  useToast.setState({ notifications: [] })
  useStore.getState().frame.addFrame({ frameId: 0, url: 'https://a.test/' })
  useStore.getState().frame.setActiveFrame(0)
  useStore.getState().frame.updateFrame(0, {
    hasVideo: true,
    videoChangeCount: 1,
  })

  rpc.episodeMatch.mockReset()
  rpc.episodeFetch.mockReset()
  rpc.mount.mockReset().mockResolvedValue({ data: true })
  rpc.unmount.mockReset().mockResolvedValue({ data: true })

  observers = []
  vi.spyOn(ObserverFactory, 'create').mockImplementation(() => {
    const observer = new FakeObserver()
    observers.push(observer)
    return observer
  })

  page.config = { mode: 'xpath' }
  queryClient = new QueryClient()
  root = createRoot(document.createElement('div'))
  render()
})

afterEach(() => {
  act(() => {
    root?.unmount()
  })
  root = undefined
  vi.useRealTimers()
})

describe('useIntegrationPolicy', () => {
  it('drops a local mount that finishes after the observer is replaced', async () => {
    const mountA = deferred<{ data: boolean }>()
    rpc.mount.mockReturnValueOnce(mountA.promise)
    rpc.episodeMatch.mockResolvedValueOnce(matched(localEpisode('Show A')))
    showEpisode(observers[0], 'Show A')
    await settle()
    expect(rpc.mount).toHaveBeenCalledTimes(1)

    replaceObserver()
    expect(observers).toHaveLength(2)
    const matchB = deferred<unknown>()
    rpc.episodeMatch.mockReturnValueOnce(matchB.promise)
    showEpisode(observers[1], 'Show B')
    await waitForProgressDelay()
    const progressB = {
      severity: 'info',
      message: 'Finding danmaku for Show B Episode 1…',
    }
    expect(openToasts()).toEqual([progressB])

    mountA.resolve({ data: true })
    await settle()
    expect(openToasts()).toEqual([progressB])

    matchB.resolve(matched(localEpisode('Show B')))
    await settle()
    expect(openToasts()).toEqual([
      { severity: 'success', message: 'Mounted Show B Episode 1: 3 comments' },
    ])
  })

  it.each([
    [
      'resolves',
      (fetch: Deferred<unknown>) => fetch.resolve(fetched('Show A')),
    ],
    ['fails', (fetch: Deferred<unknown>) => fetch.reject(new Error('timeout'))],
  ])('ignores a fetch that %s after the video went away', async (_, finish) => {
    const fetchA = deferred<unknown>()
    rpc.episodeFetch.mockReturnValueOnce(fetchA.promise)
    rpc.episodeMatch.mockResolvedValueOnce(matched(sourceEpisode('Show A')))
    showEpisode(observers[0], 'Show A')
    await settle()
    expect(rpc.episodeFetch).toHaveBeenCalledTimes(1)

    setVideo(false, 1)
    setVideo(true, 2)
    const matchB = deferred<unknown>()
    rpc.episodeMatch.mockReturnValueOnce(matchB.promise)
    showEpisode(observers[0], 'Show B')
    await waitForProgressDelay()

    finish(fetchA)
    await settle()
    expect(rpc.mount).not.toHaveBeenCalled()
    expect(openToasts()).toEqual([
      { severity: 'info', message: 'Finding danmaku for Show B Episode 1…' },
    ])
  })

  it('does not open the selector for an episode the page moved on from', async () => {
    const matchA = deferred<unknown>()
    rpc.episodeMatch.mockReturnValueOnce(matchA.promise)
    showEpisode(observers[0], 'Show A')
    rpc.episodeMatch.mockReturnValueOnce(deferred<unknown>().promise)
    showEpisode(observers[0], 'Show B')
    await waitForProgressDelay()

    matchA.resolve(ambiguous())
    await settle()
    expect(usePopup.getState().isOpen).toBe(false)
    expect(openToasts()).toEqual([
      { severity: 'info', message: 'Finding danmaku for Show B Episode 1…' },
    ])
  })

  it('keeps an observer error over the episode it interrupted', async () => {
    const matchA = deferred<unknown>()
    rpc.episodeMatch.mockReturnValueOnce(matchA.promise)
    showEpisode(observers[0], 'Show A')
    await waitForProgressDelay()

    reportError(observers[0], 'Policy not found')
    expect(openToasts()).toEqual([
      { severity: 'error', message: 'Policy not found' },
    ])

    matchA.resolve(matched(localEpisode('Show A')))
    await settle()
    expect(rpc.mount).not.toHaveBeenCalled()
    expect(openToasts()).toEqual([
      { severity: 'error', message: 'Policy not found' },
    ])
  })

  it('clears AI parsing progress when no show is found', async () => {
    reportStatus(observers[0], 'Extracting video info using AI...')
    await waitForProgressDelay()
    expect(openToasts()).toEqual([
      { severity: 'info', message: 'Using AI to parse show information' },
    ])

    reportStatus(observers[0], 'No show detected')
    expect(openToasts()).toEqual([])
  })
})
