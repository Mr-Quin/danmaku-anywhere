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
  CrossOriginCapture,
  FrameSource,
  isVideoOriginClean,
} from './frameSource'

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
    await vi.advanceTimersByTimeAsync(30_000)

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

describe('FrameSource', () => {
  const notStale = () => false

  function fakeClone(): { capture: CloneCapture; cloneEl: HTMLVideoElement } {
    const cloneEl = asVideo(makeOriginal({ readyState: 2 }))
    const capture: CloneCapture = {
      setup: vi.fn().mockResolvedValue(cloneEl),
      sync: vi.fn(),
      dispose: vi.fn(),
    }
    return { capture, cloneEl }
  }

  let clock = 0

  function makeSource(deps: {
    isOriginClean: (v: HTMLVideoElement) => boolean
    createCapture: () => CloneCapture
  }): FrameSource {
    clock = 0
    return new FrameSource(() => undefined, {
      isOriginClean: deps.isOriginClean,
      createCapture: deps.createCapture,
      now: () => clock,
    })
  }

  // Recovery runs in the background, so a read only reports its outcome on a
  // later call; this drains the pending setup and reads again.
  async function readAfterRecovery(
    source: FrameSource,
    video: HTMLVideoElement,
    isStale: () => boolean = notStale
  ) {
    await source.read(video, isStale)
    await Promise.resolve()
    await Promise.resolve()
    return source.read(video, isStale)
  }

  it('captures nothing while the element has no decoded frame yet', async () => {
    const video = asVideo(makeOriginal({ readyState: 0, currentSrc: '' }))
    const createCapture = vi.fn()
    const source = makeSource({ isOriginClean: () => false, createCapture })

    expect(await source.read(video, notStale)).toBeNull()
    expect(createCapture).not.toHaveBeenCalled()
  })

  it('returns the live element when the origin is clean, without a clone', async () => {
    const video = asVideo(makeOriginal({ readyState: 2 }))
    const createCapture = vi.fn()
    const source = makeSource({ isOriginClean: () => true, createCapture })

    expect(await source.read(video, notStale)).toBe(video)
    expect(createCapture).not.toHaveBeenCalled()
  })

  it('recovers a tainted video via a clean clone', async () => {
    const video = asVideo(makeOriginal({ readyState: 2 }))
    const { capture, cloneEl } = fakeClone()
    const source = makeSource({
      isOriginClean: (v) => v === cloneEl,
      createCapture: () => capture,
    })

    expect(await readAfterRecovery(source, video)).toBe(cloneEl)
    expect(capture.sync).toHaveBeenCalled()
  })

  it('captures nothing while the recovery is still in flight', async () => {
    const video = asVideo(makeOriginal({ readyState: 2 }))
    const cloneEl = asVideo(makeOriginal({ readyState: 2 }))
    let finishSetup: (clone: HTMLVideoElement) => void = () => undefined
    const capture: CloneCapture = {
      setup: vi.fn(
        () =>
          new Promise<HTMLVideoElement>((resolve) => {
            finishSetup = resolve
          })
      ),
      sync: vi.fn(),
      dispose: vi.fn(),
    }
    const createCapture = vi.fn(() => capture)
    const source = makeSource({
      isOriginClean: (v) => v === cloneEl,
      createCapture,
    })

    expect(await source.read(video, notStale)).toBeNull()
    expect(await source.read(video, notStale)).toBeNull()
    expect(createCapture).toHaveBeenCalledTimes(1)

    finishSetup(cloneEl)
    await Promise.resolve()
    expect(await source.read(video, notStale)).toBe(cloneEl)
  })

  it('retries instead of reporting taint when the clone has no decoded frame', async () => {
    const video = asVideo(makeOriginal({ readyState: 2 }))
    const capture: CloneCapture = {
      setup: vi
        .fn()
        .mockResolvedValue(asVideo(makeOriginal({ readyState: 1 }))),
      sync: vi.fn(),
      dispose: vi.fn(),
    }
    const source = makeSource({
      isOriginClean: () => false,
      createCapture: () => capture,
    })

    expect(await readAfterRecovery(source, video)).toBeNull()
    expect(capture.dispose).toHaveBeenCalled()
  })

  it('reports taint and disposes the clone when a loaded clone is still tainted', async () => {
    const video = asVideo(makeOriginal({ readyState: 2 }))
    const { capture } = fakeClone()
    const source = makeSource({
      isOriginClean: () => false,
      createCapture: () => capture,
    })

    expect(await readAfterRecovery(source, video)).toBe('taint')
    expect(capture.dispose).toHaveBeenCalled()
  })

  it('reports taint without a clone for encrypted media', async () => {
    const video = asVideo(makeOriginal({ readyState: 2 }))
    Object.assign(video, { mediaKeys: {} })
    const createCapture = vi.fn()
    const source = makeSource({ isOriginClean: () => false, createCapture })

    expect(await source.read(video, notStale)).toBe('taint')
    expect(createCapture).not.toHaveBeenCalled()
  })

  it('treats a rejected setup as a failed attempt instead of parking', async () => {
    const video = asVideo(makeOriginal({ readyState: 2 }))
    const cloneEl = asVideo(makeOriginal({ readyState: 2 }))
    const rejecting: CloneCapture = {
      setup: vi.fn().mockRejectedValue(new Error('rpc down')),
      sync: vi.fn(),
      dispose: vi.fn(),
    }
    const succeeding: CloneCapture = {
      setup: vi.fn().mockResolvedValue(cloneEl),
      sync: vi.fn(),
      dispose: vi.fn(),
    }
    const captures = [rejecting, succeeding]
    const source = makeSource({
      isOriginClean: (v) => v === cloneEl,
      createCapture: () => captures.shift() as CloneCapture,
    })

    expect(await readAfterRecovery(source, video)).toBeNull()
    clock += 2_000
    expect(await readAfterRecovery(source, video)).toBe(cloneEl)
  })

  it('disposes a recovery that is still in flight when reset', async () => {
    const video = asVideo(makeOriginal({ readyState: 2 }))
    const capture: CloneCapture = {
      setup: vi.fn(() => new Promise<HTMLVideoElement>(() => undefined)),
      sync: vi.fn(),
      dispose: vi.fn(),
    }
    const source = makeSource({
      isOriginClean: () => false,
      createCapture: () => capture,
    })

    await source.read(video, notStale)
    source.reset()

    expect(capture.dispose).toHaveBeenCalled()
  })

  it('captures nothing while the installed clone is seeking', async () => {
    const video = asVideo(makeOriginal({ readyState: 2 }))
    const clone = makeOriginal({ readyState: 2 })
    const cloneEl = asVideo(clone)
    const capture: CloneCapture = {
      setup: vi.fn().mockResolvedValue(cloneEl),
      sync: vi.fn(() => {
        clone.readyState = 1
      }),
      dispose: vi.fn(),
    }
    const source = makeSource({
      isOriginClean: (v) => v === cloneEl,
      createCapture: () => capture,
    })

    expect(await readAfterRecovery(source, video)).toBeNull()

    capture.sync = vi.fn(() => {
      clone.readyState = 2
    })
    expect(await source.read(video, notStale)).toBe(cloneEl)
  })

  it('reports taint without a clone when the source cannot be cloned', async () => {
    const video = asVideo(
      makeOriginal({ currentSrc: 'blob:https://host/abc', readyState: 2 })
    )
    const createCapture = vi.fn()
    const source = makeSource({
      isOriginClean: () => false,
      createCapture,
    })

    expect(await source.read(video, notStale)).toBe('taint')
    expect(createCapture).not.toHaveBeenCalled()
  })

  it('retries after a backoff when clone setup yields nothing', async () => {
    const video = asVideo(makeOriginal({ readyState: 2 }))
    const cloneEl = asVideo(makeOriginal({ readyState: 2 }))
    const failing: CloneCapture = {
      setup: vi.fn().mockResolvedValue(null),
      sync: vi.fn(),
      dispose: vi.fn(),
    }
    const succeeding: CloneCapture = {
      setup: vi.fn().mockResolvedValue(cloneEl),
      sync: vi.fn(),
      dispose: vi.fn(),
    }
    const captures = [failing, succeeding]
    const source = makeSource({
      isOriginClean: (v) => v === cloneEl,
      createCapture: () => captures.shift() as CloneCapture,
    })

    expect(await readAfterRecovery(source, video)).toBeNull()
    expect(await source.read(video, notStale)).toBeNull()

    clock += 2_000
    expect(await readAfterRecovery(source, video)).toBe(cloneEl)
  })

  it('reports the video unreadable once the retries run out', async () => {
    const video = asVideo(makeOriginal({ readyState: 2 }))
    const source = makeSource({
      isOriginClean: () => false,
      createCapture: () => ({
        setup: vi.fn().mockResolvedValue(null),
        sync: vi.fn(),
        dispose: vi.fn(),
      }),
    })

    let result = await readAfterRecovery(source, video)
    for (let attempt = 0; attempt < 2; attempt++) {
      expect(result).toBeNull()
      clock += 60_000
      result = await readAfterRecovery(source, video)
    }
    expect(result).toBe('unreadable')
  })

  it('caches the resolved element and syncs the clone on each read', async () => {
    const video = asVideo(makeOriginal({ readyState: 2 }))
    const { capture, cloneEl } = fakeClone()
    const createCapture = vi.fn(() => capture)
    const source = makeSource({
      isOriginClean: (v) => v === cloneEl,
      createCapture,
    })

    await readAfterRecovery(source, video)
    await source.read(video, notStale)

    expect(createCapture).toHaveBeenCalledTimes(1)
    expect(capture.sync).toHaveBeenCalledTimes(2)
  })

  it('re-resolves and disposes the old clone when the src changes', async () => {
    const original = makeOriginal({
      currentSrc: 'http://a/v.webm',
      readyState: 2,
    })
    const video = asVideo(original)
    const first = fakeClone()
    const second = fakeClone()
    const captures = [first.capture, second.capture]
    const clones = [first.cloneEl, second.cloneEl]
    const source = makeSource({
      isOriginClean: (v) => clones.includes(v),
      createCapture: () => captures.shift() as CloneCapture,
    })

    await readAfterRecovery(source, video)
    original.currentSrc = 'http://b/v.webm'
    expect(await readAfterRecovery(source, video)).toBe(second.cloneEl)
    expect(first.capture.dispose).toHaveBeenCalled()
  })

  it('aborts and disposes the clone when the read goes stale mid-setup', async () => {
    const video = asVideo(makeOriginal({ readyState: 2 }))
    const { capture } = fakeClone()
    const source = makeSource({
      isOriginClean: () => false,
      createCapture: () => capture,
    })

    expect(await readAfterRecovery(source, video, () => true)).toBeNull()
    expect(capture.dispose).toHaveBeenCalled()
  })

  it('disposes the live clone on reset', async () => {
    const video = asVideo(makeOriginal({ readyState: 2 }))
    const { capture, cloneEl } = fakeClone()
    const source = makeSource({
      isOriginClean: (v) => v === cloneEl,
      createCapture: () => capture,
    })

    await readAfterRecovery(source, video)
    source.reset()

    expect(capture.dispose).toHaveBeenCalled()
  })
})
