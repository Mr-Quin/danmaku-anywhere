import type { Season } from '@danmaku-anywhere/danmaku-converter'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, StrictMode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useToast } from '@/common/components/Toast/toastStore'
import '@/common/localization/i18n'
import type { GenericEpisode } from '@danmaku-anywhere/danmaku-converter'
import type { IntegrationPolicy } from '@/common/options/integrationPolicyStore/schema'
import type { MountConfig } from '@/common/options/mountConfig/schema'
import { queryClient as sharedQueryClient } from '@/common/queries/queryClient'
import { useLoadDanmaku } from '@/content/controller/common/hooks/useLoadDanmaku'
import { useUnmountDanmaku } from '@/content/controller/common/hooks/useUnmountDanmaku'
import { MediaInfo } from '@/content/controller/danmaku/integration/models/MediaInfo'
import { MediaObserver } from '@/content/controller/danmaku/integration/observers/MediaObserver'
import { ObserverFactory } from '@/content/controller/danmaku/integration/observers/ObserverFactory'
import { PopupTab, usePopup } from '@/content/controller/store/popupStore'
import { useStore } from '@/content/controller/store/store'
import { useIntegrationPolicy } from './useIntegrationPolicy'

/**
 * Automatic matching runs once per episode the observer reports. When the
 * observer is replaced, the video is replaced or goes away, a newer episode
 * arrives, or the integration unmounts, work still in flight for the earlier
 * episode must not mount, stay mounted in the player, change the store, open
 * or continue the selector, or touch the episode toast. Drives the hook with a
 * fake observer (or the real AI observer) and controllable match, fetch, mount
 * and unmount calls, and asserts the toast, popup and controller stores and the
 * player commands sent.
 */

vi.unmock('@/common/localization/i18n')

const page = vi.hoisted(() => ({
  config: { mode: 'xpath' } as { mode: string },
}))

const rpc = vi.hoisted(() => ({
  episodeMatch: vi.fn(),
  episodeFetch: vi.fn(),
  extractTitle: vi.fn(),
  mount: vi.fn(),
  unmount: vi.fn(),
}))

vi.mock('@/common/rpcClient/background/client', () => ({
  chromeRpcClient: {
    episodeMatch: rpc.episodeMatch,
    episodeFetch: rpc.episodeFetch,
    extractTitle: rpc.extractTitle,
    remoteLog: () => Promise.resolve(),
  },
  playerRpcClient: {
    player: {
      'relay:command:mount': rpc.mount,
      'relay:command:unmount': rpc.unmount,
      'relay:command:show': () => Promise.resolve({ data: undefined }),
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

vi.mock('@/content/controller/common/hooks/useDescribeSourceError', () => ({
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

function fetched(title: string, keptStored?: object) {
  return { data: { episode: sourceEpisode(title), keptStored } }
}

function matched(episode: object) {
  return { data: { status: 'success', data: episode, metadata: {} } }
}

function ambiguous(...titles: string[]) {
  return {
    data: {
      status: 'disambiguation',
      data: titles.map((title, index) => ({ id: 9 + index, title })),
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

function progressFor(title: string) {
  return {
    severity: 'info',
    message: `Finding danmaku for ${title} Episode 1…`,
  }
}

function mountedState() {
  const { danmaku, frame } = useStore.getState()
  return {
    isMounted: danmaku.isMounted,
    titles: danmaku.episodes?.map((e) => e.title),
    frameMounted: frame.allFrames.get(0)?.mounted,
  }
}

const NOTHING_MOUNTED = {
  isMounted: false,
  titles: undefined,
  frameMounted: false,
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

const user: {
  mountChosen?: (episodes: GenericEpisode[]) => Promise<void>
  unmount?: () => Promise<boolean>
} = {}

function Integration() {
  useIntegrationPolicy()
  user.mountChosen = useLoadDanmaku().mountChosen
  user.unmount = useUnmountDanmaku().mutateAsync
  return null
}

const createObserver = ObserverFactory.create.bind(ObserverFactory)
const initialStore = useStore.getState()
const initialPopup = usePopup.getState()

let root: Root | undefined
let queryClient: QueryClient
let observers: FakeObserver[]
let strict = false

function render() {
  const tree = (
    <QueryClientProvider client={queryClient}>
      <Integration />
    </QueryClientProvider>
  )
  act(() => {
    root?.render(strict ? <StrictMode>{tree}</StrictMode> : tree)
  })
}

function start({ mode = 'xpath', strictMode = false } = {}) {
  page.config = { mode }
  strict = strictMode
  root = createRoot(document.createElement('div'))
  render()
}

function replaceObserver() {
  page.config = { ...page.config }
  render()
}

function currentObserver() {
  return observers[observers.length - 1]
}

function showEpisode(title: string) {
  act(() => {
    currentObserver().emit('mediaChange', media(title))
  })
}

function reportParsing(parsing: boolean) {
  act(() => {
    currentObserver().emit('parsingChange', parsing)
  })
}

function clearMedia() {
  act(() => {
    currentObserver().emit('mediaCleared')
  })
}

function reportError(message: string) {
  act(() => {
    currentObserver().emit('error', new Error(message))
  })
}

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] })
  useStore.setState(initialStore, true)
  usePopup.setState(initialPopup, true)
  useToast.setState({ notifications: [] })
  sharedQueryClient.clear()
  useStore.getState().frame.addFrame({ frameId: 0, url: 'https://a.test/' })
  useStore.getState().frame.setActiveFrame(0)
  useStore.getState().frame.updateFrame(0, {
    hasVideo: true,
    videoChangeCount: 1,
  })

  rpc.episodeMatch.mockReset()
  rpc.episodeFetch.mockReset()
  rpc.extractTitle.mockReset()
  rpc.mount.mockReset().mockResolvedValue({ data: true })
  rpc.unmount.mockReset().mockResolvedValue({ data: true })

  observers = []
  vi.spyOn(ObserverFactory, 'create').mockImplementation(
    (config: MountConfig, policy: IntegrationPolicy | null) => {
      if (config.mode === 'ai') {
        return createObserver(config, policy)
      }
      const observer = new FakeObserver()
      observers.push(observer)
      return observer
    }
  )

  queryClient = new QueryClient()
})

afterEach(() => {
  act(() => {
    root?.unmount()
  })
  root = undefined
  vi.useRealTimers()
})

describe('useIntegrationPolicy', () => {
  it('mounts the matched episode and reports it', async () => {
    start()
    rpc.episodeMatch.mockResolvedValueOnce(matched(sourceEpisode('Show A')))
    rpc.episodeFetch.mockResolvedValueOnce(fetched('Show A'))

    showEpisode('Show A')
    await settle()

    expect(mountedState()).toEqual({
      isMounted: true,
      titles: ['Episode 1'],
      frameMounted: true,
    })
    expect(openToasts()).toEqual([
      {
        severity: 'success',
        message: 'Mounted Show A - Episode 1: 5 comments',
      },
    ])
  })

  it('takes back a local mount that finishes after the observer is replaced', async () => {
    start()
    const mountA = deferred<{ data: boolean }>()
    rpc.mount.mockReturnValueOnce(mountA.promise)
    rpc.episodeMatch.mockResolvedValueOnce(matched(localEpisode('Show A')))
    showEpisode('Show A')
    await settle()
    expect(rpc.mount).toHaveBeenCalledTimes(1)

    replaceObserver()
    const matchB = deferred<unknown>()
    rpc.episodeMatch.mockReturnValueOnce(matchB.promise)
    showEpisode('Show B')
    await waitForProgressDelay()

    mountA.resolve({ data: true })
    await settle()
    expect(rpc.unmount).toHaveBeenCalledTimes(1)
    expect(mountedState()).toEqual(NOTHING_MOUNTED)
    expect(openToasts()).toEqual([progressFor('Show B')])

    matchB.resolve(matched(localEpisode('Show B')))
    await settle()
    expect(mountedState()).toEqual({
      isMounted: true,
      titles: ['Show B'],
      frameMounted: true,
    })
    expect(openToasts()).toEqual([
      { severity: 'success', message: 'Mounted Show B Episode 1: 3 comments' },
    ])
  })

  it('takes back a mount that finishes after the integration unmounts', async () => {
    start()
    const mountA = deferred<{ data: boolean }>()
    rpc.mount.mockReturnValueOnce(mountA.promise)
    rpc.episodeMatch.mockResolvedValueOnce(matched(localEpisode('Show A')))
    showEpisode('Show A')
    await settle()

    act(() => {
      root?.unmount()
    })
    root = undefined
    mountA.resolve({ data: true })
    await settle()
    await waitForProgressDelay()

    expect(rpc.unmount).toHaveBeenCalledTimes(1)
    expect(mountedState()).toEqual(NOTHING_MOUNTED)
    expect(openToasts()).toEqual([])
  })

  it('drops a match that finishes after the video is replaced', async () => {
    start()
    const matchA = deferred<unknown>()
    rpc.episodeMatch.mockReturnValueOnce(matchA.promise)
    showEpisode('Show A')

    setVideo(true, 2)
    matchA.resolve(matched(localEpisode('Show A')))
    await settle()

    expect(rpc.mount).not.toHaveBeenCalled()
    expect(mountedState()).toEqual(NOTHING_MOUNTED)
    await waitForProgressDelay()
    expect(openToasts()).toEqual([])
  })

  it('drops late work the same way under StrictMode', async () => {
    start({ strictMode: true })
    const matchA = deferred<unknown>()
    rpc.episodeMatch.mockReturnValueOnce(matchA.promise)
    showEpisode('Show A')

    setVideo(true, 2)
    matchA.resolve(matched(localEpisode('Show A')))
    await settle()
    expect(rpc.mount).not.toHaveBeenCalled()

    rpc.episodeMatch.mockResolvedValueOnce(matched(localEpisode('Show B')))
    showEpisode('Show B')
    await settle()

    expect(rpc.mount).toHaveBeenCalledTimes(1)
    expect(mountedState().titles).toEqual(['Show B'])
    expect(openToasts()).toEqual([
      { severity: 'success', message: 'Mounted Show B Episode 1: 3 comments' },
    ])
  })

  it.each([
    [
      'resolves',
      (fetch: Deferred<unknown>) => fetch.resolve(fetched('Show A')),
    ],
    [
      'resolves with fewer comments than stored',
      (fetch: Deferred<unknown>) =>
        fetch.resolve(fetched('Show A', { fetchedCount: 1, storedCount: 5 })),
    ],
    ['fails', (fetch: Deferred<unknown>) => fetch.reject(new Error('timeout'))],
  ])('ignores a fetch that %s after the video went away', async (_, finish) => {
    start()
    const fetchA = deferred<unknown>()
    rpc.episodeFetch.mockReturnValueOnce(fetchA.promise)
    rpc.episodeMatch.mockResolvedValueOnce(matched(sourceEpisode('Show A')))
    showEpisode('Show A')
    await settle()
    expect(rpc.episodeFetch).toHaveBeenCalledTimes(1)

    setVideo(false, 1)
    setVideo(true, 2)
    const matchB = deferred<unknown>()
    rpc.episodeMatch.mockReturnValueOnce(matchB.promise)
    showEpisode('Show B')
    await waitForProgressDelay()

    finish(fetchA)
    await settle()
    expect(rpc.mount).not.toHaveBeenCalled()
    expect(mountedState()).toEqual(NOTHING_MOUNTED)
    expect(openToasts()).toEqual([progressFor('Show B')])
  })

  it('keeps the newer mount when the unmount before it finishes late', async () => {
    start()
    rpc.episodeMatch.mockResolvedValueOnce(matched(localEpisode('Show A')))
    showEpisode('Show A')
    await settle()
    expect(mountedState().titles).toEqual(['Show A'])

    const unmountA = deferred<{ data: boolean }>()
    rpc.unmount.mockReturnValueOnce(unmountA.promise)
    rpc.episodeMatch.mockResolvedValueOnce(matched(localEpisode('Show B')))
    showEpisode('Show B')
    await settle()
    unmountA.resolve({ data: true })
    await settle()

    expect(mountedState()).toEqual({
      isMounted: true,
      titles: ['Show B'],
      frameMounted: true,
    })
  })

  describe('season selection', () => {
    it('applies a season picked for the current episode and closes itself', async () => {
      start()
      rpc.episodeMatch.mockResolvedValueOnce(
        ambiguous('Show A', 'Show A Movie')
      )
      showEpisode('Show A')
      await settle()

      const { selection, isOpen, tab } = usePopup.getState()
      expect({ isOpen, tab, label: selection?.label }).toEqual({
        isOpen: true,
        tab: PopupTab.Selector,
        label: 'Show A Episode 1',
      })

      rpc.episodeMatch.mockResolvedValueOnce(matched(sourceEpisode('Show A')))
      rpc.episodeFetch.mockResolvedValueOnce(fetched('Show A'))
      await act(async () => {
        await selection?.apply(selection.seasons[0])
      })

      expect(rpc.episodeMatch).toHaveBeenLastCalledWith(
        expect.objectContaining({ title: 'Show A', seasonId: 9 })
      )
      expect(mountedState().titles).toEqual(['Episode 1'])
      expect(usePopup.getState()).toMatchObject({
        isOpen: false,
        selection: undefined,
      })
    })

    it('withdraws the offer and ignores its apply once the page moves on', async () => {
      start()
      rpc.episodeMatch.mockResolvedValueOnce(
        ambiguous('Show A', 'Show A Movie')
      )
      showEpisode('Show A')
      await settle()
      const offered = usePopup.getState().selection
      expect(offered).toBeDefined()

      const matchB = deferred<unknown>()
      rpc.episodeMatch.mockReturnValueOnce(matchB.promise)
      showEpisode('Show B')
      await waitForProgressDelay()
      expect(usePopup.getState().selection).toBeUndefined()

      await act(async () => {
        await offered?.apply(offered.seasons[0] as Season)
      })
      expect(rpc.episodeMatch).toHaveBeenCalledTimes(2)
      expect(rpc.episodeFetch).not.toHaveBeenCalled()
      expect(openToasts()).toEqual([progressFor('Show B')])
    })

    it('drops an apply whose match finishes after the page moved on', async () => {
      start()
      rpc.episodeMatch.mockResolvedValueOnce(
        ambiguous('Show A', 'Show A Movie')
      )
      showEpisode('Show A')
      await settle()
      const offered = usePopup.getState().selection
      expect(offered).toBeDefined()
      act(() => {
        usePopup.getState().setTab(PopupTab.Search)
      })

      const matchApplied = deferred<unknown>()
      rpc.episodeMatch.mockReturnValueOnce(matchApplied.promise)
      let applying: Promise<void> | undefined
      act(() => {
        applying = offered?.apply(offered.seasons[0] as Season)
      })
      setVideo(true, 2)
      matchApplied.resolve(matched(sourceEpisode('Show A')))
      await act(async () => {
        await applying
      })

      expect(rpc.episodeFetch).not.toHaveBeenCalled()
      expect(usePopup.getState()).toMatchObject({
        isOpen: true,
        tab: PopupTab.Search,
      })
    })

    it('stays available after the popup is closed and applies once at a time', async () => {
      start()
      rpc.episodeMatch.mockResolvedValueOnce(
        ambiguous('Show A', 'Show A Movie')
      )
      showEpisode('Show A')
      await settle()
      const offered = usePopup.getState().selection
      act(() => {
        usePopup.getState().toggleOpen(false)
        usePopup.getState().toggleOpen(true)
      })
      expect(usePopup.getState().selection).toBe(offered)

      const matchApplied = deferred<unknown>()
      rpc.episodeMatch.mockReturnValueOnce(matchApplied.promise)
      let first: Promise<void> | undefined
      let second: Promise<void> | undefined
      act(() => {
        first = offered?.apply(offered.seasons[0] as Season)
        second = offered?.apply(offered.seasons[1] as Season)
      })
      matchApplied.resolve(matched(localEpisode('Show A')))
      rpc.episodeFetch.mockResolvedValueOnce(fetched('Show A'))
      await act(async () => {
        await Promise.all([first, second])
      })

      expect(rpc.episodeMatch).toHaveBeenCalledTimes(2)
      expect(mountedState().titles).toEqual(['Show A'])
    })

    it('stays up when the picked season has no such episode', async () => {
      start()
      rpc.episodeMatch.mockResolvedValueOnce(
        ambiguous('Show A', 'Show A Movie')
      )
      showEpisode('Show A')
      await settle()
      const offered = usePopup.getState().selection

      rpc.episodeMatch.mockResolvedValueOnce({
        data: { status: 'notFound', data: null, cause: 'none' },
      })
      await act(async () => {
        await offered?.apply(offered.seasons[1] as Season)
      })

      expect(usePopup.getState()).toMatchObject({
        selection: offered,
        isOpen: true,
        tab: PopupTab.Selector,
      })
      expect(openToasts()).toEqual([
        { severity: 'error', message: 'No episode found for Show A Movie' },
      ])
    })

    it('gives each offer its own id', async () => {
      start()
      rpc.episodeMatch.mockResolvedValueOnce(
        ambiguous('Show A', 'Show A Movie')
      )
      showEpisode('Show A')
      await settle()
      const first = usePopup.getState().selection

      rpc.episodeMatch.mockResolvedValueOnce(
        ambiguous('Show B', 'Show B Movie')
      )
      showEpisode('Show B')
      await settle()
      const second = usePopup.getState().selection

      expect(second?.id).toBeDefined()
      expect(second?.id).not.toBe(first?.id)
    })

    it('does not open the selector for an episode the page moved on from', async () => {
      start()
      const matchA = deferred<unknown>()
      rpc.episodeMatch.mockReturnValueOnce(matchA.promise)
      showEpisode('Show A')
      rpc.episodeMatch.mockReturnValueOnce(deferred<unknown>().promise)
      showEpisode('Show B')
      await waitForProgressDelay()

      matchA.resolve(ambiguous('Show A Movie'))
      await settle()
      expect(usePopup.getState()).toMatchObject({
        isOpen: false,
        selection: undefined,
      })
      expect(openToasts()).toEqual([progressFor('Show B')])
    })
  })

  it('lets an episode in flight finish after a passing observer error', async () => {
    start()
    const matchA = deferred<unknown>()
    rpc.episodeMatch.mockReturnValueOnce(matchA.promise)
    showEpisode('Show A')
    await waitForProgressDelay()

    reportError('No title')
    expect(openToasts()).toEqual([{ severity: 'error', message: 'No title' }])

    matchA.resolve(matched(localEpisode('Show A')))
    await settle()
    expect(mountedState().titles).toEqual(['Show A'])
    expect(openToasts()).toEqual([
      { severity: 'success', message: 'Mounted Show A Episode 1: 3 comments' },
    ])
  })

  it('shows an observer error when nothing is in flight', () => {
    start()
    reportError('Policy not found')

    expect(openToasts()).toEqual([
      { severity: 'error', message: 'Policy not found' },
    ])
  })

  it('drops a match in flight when the observer clears its media', async () => {
    start()
    const matchA = deferred<unknown>()
    rpc.episodeMatch.mockReturnValueOnce(matchA.promise)
    showEpisode('Show A')

    clearMedia()
    matchA.resolve(matched(localEpisode('Show A')))
    await settle()

    expect(rpc.mount).not.toHaveBeenCalled()
  })

  it('stops matching in flight when the user unmounts', async () => {
    start()
    rpc.episodeMatch.mockResolvedValueOnce(matched(localEpisode('Show A')))
    showEpisode('Show A')
    await settle()
    const matchB = deferred<unknown>()
    rpc.episodeMatch.mockReturnValueOnce(matchB.promise)
    showEpisode('Show B')
    await waitForProgressDelay()

    await act(async () => {
      await user.unmount?.()
    })
    matchB.resolve(matched(localEpisode('Show B')))
    await settle()

    expect(rpc.mount).toHaveBeenCalledTimes(1)
    expect(mountedState()).toEqual(NOTHING_MOUNTED)
    expect(openToasts()).toEqual([
      { severity: 'info', message: 'Danmaku Unmounted' },
    ])
  })

  it('unmounts the frame showing the danmaku when the next episode arrives in another frame', async () => {
    start()
    act(() => {
      useStore.getState().frame.addFrame({ frameId: 1, url: 'https://b.test/' })
      useStore.getState().frame.updateFrame(1, {
        hasVideo: true,
        videoChangeCount: 1,
      })
    })
    const mountPicked = deferred<{ data: boolean }>()
    rpc.mount.mockReturnValueOnce(mountPicked.promise)
    let picking: Promise<void> | undefined
    act(() => {
      picking = user.mountChosen?.([localEpisode('Picked') as never])
    })
    await settle()
    expect(rpc.mount).toHaveBeenCalledWith(
      expect.objectContaining({ frameId: 0 })
    )
    act(() => {
      useStore.getState().frame.setActiveFrame(1)
    })
    mountPicked.resolve({ data: true })
    await act(async () => {
      await picking
    })
    expect(useStore.getState().danmaku.mountedFrameId).toBe(0)

    rpc.episodeMatch.mockResolvedValueOnce(matched(localEpisode('Show B')))
    showEpisode('Show B')
    await settle()

    expect(rpc.unmount).toHaveBeenCalledWith({ frameId: 0 })
    const { frame, danmaku } = useStore.getState()
    expect(frame.allFrames.get(0)?.mounted).toBe(false)
    expect(frame.allFrames.get(1)?.mounted).toBe(true)
    expect(danmaku.mountedFrameId).toBe(1)
  })

  it('gives way to danmaku the user picks while matching is in flight', async () => {
    start()
    const matchA = deferred<unknown>()
    rpc.episodeMatch.mockReturnValueOnce(matchA.promise)
    showEpisode('Show A')
    await waitForProgressDelay()

    await act(async () => {
      await user.mountChosen?.([localEpisode('Picked') as never])
    })
    matchA.resolve(matched(localEpisode('Show A')))
    await settle()

    expect(rpc.mount).toHaveBeenCalledTimes(1)
    expect(mountedState().titles).toEqual(['Picked'])
    expect(openToasts()).toEqual([
      { severity: 'success', message: 'Mounted Picked: 3 comments' },
    ])
  })

  it('clears AI parsing progress when parsing ends without a show', async () => {
    start()
    reportParsing(true)
    await waitForProgressDelay()
    expect(openToasts()).toEqual([
      { severity: 'info', message: 'Using AI to parse show information' },
    ])

    reportParsing(false)
    expect(openToasts()).toEqual([])
  })

  it('shows nothing for an AI parse that fails after the video is replaced', async () => {
    const parseA = deferred<unknown>()
    rpc.extractTitle.mockReturnValueOnce(parseA.promise)
    start({ mode: 'ai' })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000)
    })
    expect(rpc.extractTitle).toHaveBeenCalledTimes(1)

    setVideo(true, 2)
    parseA.reject(new Error('quota exceeded'))
    await settle()

    expect(openToasts()).toEqual([])
    expect(useStore.getState().integration.errorMessage).toBeUndefined()

    rpc.extractTitle.mockResolvedValueOnce({
      data: { isShow: true, title: 'Show B', episode: 1 },
    })
    rpc.episodeMatch.mockResolvedValueOnce(matched(localEpisode('Show B')))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000)
    })
    await settle()
    expect(mountedState().titles).toEqual(['Show B'])
    expect(openToasts()).toEqual([
      { severity: 'success', message: 'Mounted Show B Episode 1: 3 comments' },
    ])
  })
})
