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

import { CrossOriginCapture, isVideoOriginClean } from './crossOriginCapture'

type Listener = () => void

class FakeVideo {
  readyState = 0
  currentTime = 0
  currentSrc = ''
  src = ''
  playbackRate = 1
  paused = true
  crossOrigin: string | null = null
  muted = false
  playsInline = false
  preload = ''
  style: { cssText: string } = { cssText: '' }
  play: Mock = vi.fn(() => {
    this.paused = false
    return Promise.resolve()
  })
  pause: Mock = vi.fn(() => {
    this.paused = true
  })
  load = vi.fn()
  remove = vi.fn()
  removeAttribute = vi.fn()
  private readonly listeners = new Map<string, Set<Listener>>()

  addEventListener(type: string, fn: Listener): void {
    const set = this.listeners.get(type) ?? new Set<Listener>()
    set.add(fn)
    this.listeners.set(type, set)
  }

  removeEventListener(type: string, fn: Listener): void {
    this.listeners.get(type)?.delete(fn)
  }

  dispatch(type: string): void {
    for (const fn of this.listeners.get(type) ?? []) {
      fn()
    }
  }
}

function asVideo(fake: FakeVideo): HTMLVideoElement {
  return fake as unknown as HTMLVideoElement
}

let createdVideos: FakeVideo[]
let cloneInit: Partial<FakeVideo>
let canvasMode: 'clean' | 'security' | 'other'
let canvasCount: number

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
        if (canvasMode === 'other') {
          throw new DOMException('boom', 'InvalidStateError')
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
  canvasCount = 0
  addCorsRule.mockReset().mockResolvedValue({ data: 7 })
  removeCorsRule.mockReset().mockResolvedValue(undefined)
  vi.spyOn(document, 'createElement').mockImplementation(((tag: string) => {
    if (tag === 'video') {
      const video = Object.assign(new FakeVideo(), cloneInit)
      createdVideos.push(video)
      return asVideo(video)
    }
    if (tag === 'canvas') {
      canvasCount++
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

function makeOriginal(overrides: Partial<FakeVideo> = {}): FakeVideo {
  return Object.assign(new FakeVideo(), {
    currentSrc: 'http://example.com/v.webm',
    ...overrides,
  })
}

describe('isVideoOriginClean', () => {
  it('returns false without probing a canvas when no frame is decoded', () => {
    const result = isVideoOriginClean(asVideo(makeOriginal({ readyState: 1 })))
    expect(result).toBe(false)
    expect(canvasCount).toBe(0)
  })

  it('returns false when reading pixels throws SecurityError', () => {
    canvasMode = 'security'
    const result = isVideoOriginClean(asVideo(makeOriginal({ readyState: 2 })))
    expect(result).toBe(false)
  })

  it('returns true when pixels read back clean', () => {
    canvasMode = 'clean'
    const result = isVideoOriginClean(asVideo(makeOriginal({ readyState: 2 })))
    expect(result).toBe(true)
  })

  it('treats a non-SecurityError read failure as clean', () => {
    canvasMode = 'other'
    const result = isVideoOriginClean(asVideo(makeOriginal({ readyState: 2 })))
    expect(result).toBe(true)
  })
})

describe('CrossOriginCapture.setup', () => {
  it('returns null for a non-http(s) source without touching DNR', async () => {
    const original = makeOriginal({ currentSrc: 'blob:abc' })
    const capture = new CrossOriginCapture(asVideo(original))

    expect(await capture.setup()).toBeNull()
    expect(addCorsRule).not.toHaveBeenCalled()
    expect(createdVideos).toHaveLength(0)
  })

  it('returns null gracefully when the DNR rule RPC fails', async () => {
    addCorsRule.mockRejectedValueOnce(new Error('rpc down'))
    const capture = new CrossOriginCapture(asVideo(makeOriginal()))

    expect(await capture.setup()).toBeNull()
    expect(removeCorsRule).not.toHaveBeenCalled()
  })

  it('resolves the clone and aligns it to the live element once ready', async () => {
    const original = makeOriginal({ currentTime: 12, readyState: 2 })
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
    const capture = new CrossOriginCapture(asVideo(makeOriginal()))

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
    const capture = new CrossOriginCapture(asVideo(makeOriginal()))

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
    const capture = new CrossOriginCapture(asVideo(makeOriginal()))

    const setupPromise = capture.setup()
    await vi.advanceTimersByTimeAsync(0)
    await vi.advanceTimersByTimeAsync(8000)

    expect(await setupPromise).toBeNull()
    expect(removeCorsRule).toHaveBeenCalledWith({ ruleId: 7 })
  })

  it('aborts and removes the rule when disposed before the clone is created', async () => {
    const capture = new CrossOriginCapture(asVideo(makeOriginal()))

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
    const original = makeOriginal({ readyState: 2, playbackRate: 2 })
    const { capture, clone } = await setupReady(original)
    clone.playbackRate = 1

    capture.sync()

    expect(clone.playbackRate).toBe(2)
  })

  it('seeks the clone only when drift exceeds tolerance', async () => {
    const original = makeOriginal({ readyState: 2 })
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
    const original = makeOriginal({ readyState: 2 })
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
    const original = makeOriginal({ readyState: 2 })
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
