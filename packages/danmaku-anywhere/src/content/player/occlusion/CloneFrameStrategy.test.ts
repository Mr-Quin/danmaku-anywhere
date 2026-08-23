import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  type Mock,
  vi,
} from 'vitest'

const { addCorsRule, removeCorsRule } = vi.hoisted(() => ({
  addCorsRule: vi.fn(),
  removeCorsRule: vi.fn(),
}))

vi.mock('@/common/rpcClient/background/client', () => ({
  chromeRpcClient: {
    occlusionAddCorsRule: addCorsRule,
    occlusionRemoveCorsRule: removeCorsRule,
  },
}))

import {
  type CloneCapture,
  CloneFrameStrategy,
  CrossOriginCapture,
} from './CloneFrameStrategy'
import { asVideo, FakeVideo, makeVideo } from './fakeVideo'

let createdVideos: FakeVideo[]
let cloneInit: Partial<FakeVideo>
let canvasMode: 'clean' | 'security'

function makeFakeCanvas(): unknown {
  return {
    width: 0,
    height: 0,
    getContext: () => ({
      drawImage: () => undefined,
      getImageData: () => {
        if (canvasMode === 'security') {
          throw new DOMException('tainted', 'SecurityError')
        }
        return { data: new Uint8ClampedArray(4) }
      },
    }),
  }
}

beforeEach(() => {
  createdVideos = []
  cloneInit = {}
  canvasMode = 'clean'
  addCorsRule.mockReset().mockResolvedValue({ data: 7 })
  removeCorsRule.mockReset().mockResolvedValue(undefined)
  vi.spyOn(document, 'createElement').mockImplementation(((tag: string) => {
    if (tag === 'video') {
      const video = Object.assign(new FakeVideo(), cloneInit)
      createdVideos.push(video)
      return asVideo(video)
    }
    if (tag === 'canvas') {
      return makeFakeCanvas()
    }
    throw new Error(`unexpected createElement(${tag})`)
  }) as typeof document.createElement)
  vi.spyOn(document.body, 'appendChild').mockImplementation((node) => node)
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
})

const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0))

describe('CrossOriginCapture.setup', () => {
  it('returns null gracefully when the DNR rule RPC fails', async () => {
    addCorsRule.mockRejectedValueOnce(new Error('rpc down'))
    const capture = new CrossOriginCapture(asVideo(makeVideo()))

    expect(await capture.setup()).toBeNull()
    expect(removeCorsRule).not.toHaveBeenCalled()
  })

  it('resolves the clone and aligns it to the live element once ready', async () => {
    const original = makeVideo({ currentTime: 12, readyState: 2 })
    cloneInit = { readyState: 2 }
    const capture = new CrossOriginCapture(asVideo(original))

    const clone = await capture.setup()

    expect(clone).toBe(asVideo(createdVideos[0]))
    expect(addCorsRule).toHaveBeenCalledWith({ url: original.currentSrc })
    expect(createdVideos[0].src).toBe(original.currentSrc)
    expect(createdVideos[0].crossOrigin).toBe('anonymous')
    expect(createdVideos[0].currentTime).toBe(12)
    expect(createdVideos[0].play).toHaveBeenCalled()
  })

  it('resolves only after a decoded frame, not mid-seek', async () => {
    cloneInit = { readyState: 0 }
    const capture = new CrossOriginCapture(asVideo(makeVideo()))

    const setupPromise = capture.setup()
    let settled = false
    void setupPromise.then(() => {
      settled = true
    })
    await flush()
    const clone = createdVideos[0]

    clone.readyState = 1
    clone.dispatch('loadeddata')
    await flush()
    expect(settled).toBe(false)

    clone.readyState = 2
    clone.dispatch('seeked')
    expect(await setupPromise).toBe(asVideo(clone))
  })

  it('returns null and removes the rule when the clone errors', async () => {
    cloneInit = { readyState: 0 }
    const capture = new CrossOriginCapture(asVideo(makeVideo()))

    const setupPromise = capture.setup()
    await flush()
    const clone = createdVideos[0]
    clone.dispatch('error')

    expect(await setupPromise).toBeNull()
    expect(clone.remove).toHaveBeenCalled()
    expect(removeCorsRule).toHaveBeenCalledWith({ ruleId: 7 })
  })

  it('returns null when the clone never becomes ready before the timeout', async () => {
    vi.useFakeTimers()
    cloneInit = { readyState: 0 }
    const capture = new CrossOriginCapture(asVideo(makeVideo()))

    const setupPromise = capture.setup()
    await vi.advanceTimersByTimeAsync(0)
    await vi.advanceTimersByTimeAsync(30_000)

    expect(await setupPromise).toBeNull()
    expect(removeCorsRule).toHaveBeenCalledWith({ ruleId: 7 })
  })

  it('aborts and removes the rule when disposed before the clone is created', async () => {
    const capture = new CrossOriginCapture(asVideo(makeVideo()))

    const setupPromise = capture.setup()
    capture.dispose()

    expect(await setupPromise).toBeNull()
    expect(createdVideos).toHaveLength(0)
    expect(removeCorsRule).toHaveBeenCalledWith({ ruleId: 7 })
  })
})

describe('CrossOriginCapture.sync', () => {
  async function setupReady(
    original: FakeVideo
  ): Promise<{ capture: CrossOriginCapture; clone: FakeVideo }> {
    cloneInit = { readyState: 2 }
    const capture = new CrossOriginCapture(asVideo(original))
    await capture.setup()
    return { capture, clone: createdVideos[0] }
  }

  it('matches the clone playback rate to the original', async () => {
    const original = makeVideo({ readyState: 2, playbackRate: 2 })
    const { capture, clone } = await setupReady(original)
    clone.playbackRate = 1

    capture.sync()

    expect(clone.playbackRate).toBe(2)
  })

  it('seeks the clone only when drift exceeds tolerance', async () => {
    const original = makeVideo({ readyState: 2 })
    const { capture, clone } = await setupReady(original)

    original.currentTime = 10
    clone.currentTime = 9.95
    capture.sync()
    expect(clone.currentTime).toBe(9.95)

    clone.currentTime = 5
    capture.sync()
    expect(clone.currentTime).toBe(10)
  })

  it('mirrors pause and play state from the original', async () => {
    const original = makeVideo({ readyState: 2 })
    const { capture, clone } = await setupReady(original)

    original.paused = true
    clone.paused = false
    capture.sync()
    expect(clone.pause).toHaveBeenCalled()

    original.paused = false
    clone.paused = true
    clone.play.mockClear()
    capture.sync()
    expect(clone.play).toHaveBeenCalled()
  })
})

describe('CrossOriginCapture.dispose', () => {
  it('tears the clone down once and is idempotent', async () => {
    const original = makeVideo({ readyState: 2 })
    cloneInit = { readyState: 2 }
    const capture = new CrossOriginCapture(asVideo(original))
    await capture.setup()
    const clone = createdVideos[0]

    capture.dispose()
    capture.dispose()

    expect(clone.remove).toHaveBeenCalledTimes(1)
    expect(removeCorsRule).toHaveBeenCalledTimes(1)
  })
})

describe('CloneFrameStrategy', () => {
  function makeCapture(setup: Mock): {
    capture: CloneCapture
    sync: Mock
    dispose: Mock
  } {
    const sync = vi.fn()
    const dispose = vi.fn()
    return { capture: { setup, sync, dispose }, sync, dispose }
  }

  function makeStrategy(capture: CloneCapture): CloneFrameStrategy {
    return new CloneFrameStrategy(asVideo(makeVideo({ readyState: 2 })), () => {
      return capture
    })
  }

  it('reports pending while the clone is being set up, without setting up twice', async () => {
    const setup = vi.fn(() => new Promise<HTMLVideoElement>(() => undefined))
    const { capture } = makeCapture(setup)
    const strategy = makeStrategy(capture)

    expect(await strategy.acquire()).toEqual({ status: 'pending' })
    expect(await strategy.acquire()).toEqual({ status: 'pending' })
    expect(setup).toHaveBeenCalledTimes(1)
  })

  it('reads frames from a readable clone once it is ready', async () => {
    const clone = makeVideo({ readyState: 2, currentTime: 42 })
    const { capture, sync } = makeCapture(
      vi.fn().mockResolvedValue(asVideo(clone))
    )
    const strategy = makeStrategy(capture)

    await strategy.acquire()
    await flush()

    expect(await strategy.acquire()).toEqual({
      status: 'frame',
      frame: { element: asVideo(clone), mediaTime: 42 },
    })
    expect(sync).toHaveBeenCalled()
  })

  it('waits out a seek started by the sync instead of failing', async () => {
    const clone = makeVideo({ readyState: 2 })
    const { capture, sync } = makeCapture(
      vi.fn().mockResolvedValue(asVideo(clone))
    )
    sync.mockImplementation(() => {
      clone.readyState = 1
    })
    const strategy = makeStrategy(capture)

    await strategy.acquire()
    await flush()
    expect(await strategy.acquire()).toEqual({ status: 'pending' })

    sync.mockImplementation(() => {
      clone.readyState = 2
    })
    expect(await strategy.acquire()).toMatchObject({ status: 'frame' })
  })

  it('reports the video protected when the clone is still tainted', async () => {
    canvasMode = 'security'
    const clone = makeVideo({ readyState: 2 })
    const { capture, dispose } = makeCapture(
      vi.fn().mockResolvedValue(asVideo(clone))
    )
    const strategy = makeStrategy(capture)

    await strategy.acquire()
    await flush()

    expect(await strategy.acquire()).toEqual({
      status: 'failed',
      failure: { kind: 'protected', evidence: 'clone-tainted' },
    })
    expect(dispose).toHaveBeenCalled()
  })

  it('reports the clone unavailable when it has no decoded frame', async () => {
    const clone = makeVideo({ readyState: 1 })
    const { capture, dispose } = makeCapture(
      vi.fn().mockResolvedValue(asVideo(clone))
    )
    const strategy = makeStrategy(capture)

    await strategy.acquire()
    await flush()

    expect(await strategy.acquire()).toEqual({
      status: 'failed',
      failure: { kind: 'unavailable', evidence: 'clone-failed' },
    })
    expect(dispose).toHaveBeenCalled()
  })

  it('reports the clone unavailable when setup yields nothing', async () => {
    const { capture } = makeCapture(vi.fn().mockResolvedValue(null))
    const strategy = makeStrategy(capture)

    await strategy.acquire()
    await flush()

    expect(await strategy.acquire()).toEqual({
      status: 'failed',
      failure: { kind: 'unavailable', evidence: 'clone-failed' },
    })
  })

  it('reports the clone unavailable when setup rejects', async () => {
    const { capture } = makeCapture(
      vi.fn().mockRejectedValue(new Error('rpc down'))
    )
    const strategy = makeStrategy(capture)

    await strategy.acquire()
    await flush()

    expect(await strategy.acquire()).toEqual({
      status: 'failed',
      failure: { kind: 'unavailable', evidence: 'clone-failed' },
    })
  })

  it('tears down a clone that arrives after dispose instead of installing it', async () => {
    let finishSetup: (clone: HTMLVideoElement) => void = () => undefined
    const setup = vi.fn(
      () =>
        new Promise<HTMLVideoElement>((resolve) => {
          finishSetup = resolve
        })
    )
    const { capture, dispose } = makeCapture(setup)
    const strategy = makeStrategy(capture)

    await strategy.acquire()
    strategy.dispose()
    expect(dispose).toHaveBeenCalledTimes(1)

    finishSetup(asVideo(makeVideo({ readyState: 2 })))
    await flush()

    expect(dispose).toHaveBeenCalledTimes(2)
  })

  it('disposes once when disposed twice', async () => {
    const clone = makeVideo({ readyState: 2 })
    const { capture, dispose } = makeCapture(
      vi.fn().mockResolvedValue(asVideo(clone))
    )
    const strategy = makeStrategy(capture)

    await strategy.acquire()
    await flush()
    strategy.dispose()
    strategy.dispose()

    expect(dispose).toHaveBeenCalledTimes(1)
  })
})
