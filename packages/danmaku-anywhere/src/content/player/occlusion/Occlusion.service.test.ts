import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { modelEntrySchema } from '@/common/models/schema'
import { silentLogger } from '@/tests/silentLogger'

const { read, reset, compose, support } = vi.hoisted(() => ({
  read: vi.fn(),
  reset: vi.fn(),
  compose: vi.fn(),
  support: { occlusion: true },
}))

vi.mock('./frameSource', () => ({
  FrameSource: class {
    read = read
    reset = reset
  },
}))

vi.mock('./MaskCompositor', () => ({
  MaskCompositor: class {
    compose = compose
  },
}))

vi.mock('@/common/constants', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/common/constants')>()),
  get IS_OCCLUSION_SUPPORTED() {
    return support.occlusion
  },
}))

import { MockMaskProvider } from './MockMaskProvider'
import type { IMaskProviderFactory } from './maskProviderFactory'
import { OcclusionService } from './Occlusion.service'
import type { OcclusionConfig, OcclusionStatus } from './Occlusion.types'
import type { MaskProvider } from './types'

const peopleModel = modelEntrySchema.parse({
  id: 'people',
  label: { en: 'People', zh: '真人' },
  runtime: 'mediapipe',
  delivery: 'bundled',
  inputSize: 256,
  requiresWebGpu: false,
})

const animeModel = modelEntrySchema.parse({
  id: 'anime',
  label: { en: 'Anime', zh: '动漫' },
  runtime: 'mediapipe',
  delivery: 'bundled',
  inputSize: 512,
  requiresWebGpu: false,
})

/**
 * Unit tests for the observable status/stats surface of OcclusionService.
 * Exercises the idle stats defaults, the 'unavailable' gate when
 * requestVideoFrameCallback is missing (classified status + lastError), that the
 * debug flag is reflected in stats and flipped via setDebug, and how a frame
 * read outcome is classified, including encrypted media as DRM and any other
 * taint as cross-origin. Drives the segment loop with a stubbed capture and
 * compositor to cover failure counting: a frame settled by a reset is not a
 * failure, and repeated failures stop the loop with a status. A browser without
 * occlusion support never starts.
 */

beforeEach(() => {
  support.occlusion = true
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
  vi.stubGlobal(
    'createImageBitmap',
    vi.fn(async () => ({ close: vi.fn() }))
  )
})

afterEach(() => {
  read.mockReset()
  compose.mockReset()
})

const factory: IMaskProviderFactory = (descriptor) =>
  new MockMaskProvider(descriptor)

function makeConfig(overrides: Partial<OcclusionConfig> = {}): OcclusionConfig {
  return {
    descriptor: peopleModel,
    captureSize: 256,
    capturePreserveAspect: false,
    minIntervalMs: 80,
    outputMaxSide: 320,
    threshold: 0.5,
    edgeSoftness: 0,
    debug: false,
    applyMask: () => undefined,
    ...overrides,
  }
}

function makeVideoWithoutRvfc(): HTMLVideoElement {
  return {
    requestVideoFrameCallback: undefined,
  } as unknown as HTMLVideoElement // lint-specs-allow-cast: partial fake of a stable external DOM interface
}

describe('OcclusionService stats', () => {
  it('reports idle defaults before configure/start', () => {
    const service = new OcclusionService(factory, silentLogger)
    expect(service.getStats()).toEqual({
      running: false,
      fps: null,
      lastError: null,
      debugOverlay: false,
    })
  })

  it('reflects the debug flag as debugOverlay and flips it via setDebug', () => {
    const service = new OcclusionService(factory, silentLogger)
    service.configure(makeConfig({ debug: true }))
    expect(service.getStats().debugOverlay).toBe(true)
    service.setDebug(false)
    expect(service.getStats().debugOverlay).toBe(false)
  })
})

describe('OcclusionService provider lifecycle', () => {
  it('rebuilds the provider only when the model descriptor changes', () => {
    const disposes: Array<() => void> = []
    const spyFactory: IMaskProviderFactory = () => {
      const dispose = vi.fn()
      disposes.push(dispose)
      return {
        init: vi.fn().mockResolvedValue(undefined),
        segment: vi.fn().mockResolvedValue(null),
        dispose,
      } satisfies MaskProvider
    }
    const service = new OcclusionService(spyFactory, silentLogger)

    service.configure(makeConfig({ descriptor: peopleModel }))
    service.configure(makeConfig({ descriptor: peopleModel }))
    expect(disposes).toHaveLength(1)

    service.configure(makeConfig({ descriptor: animeModel }))
    expect(disposes).toHaveLength(2)
    expect(disposes[0]).toHaveBeenCalledTimes(1)
  })
})

describe('OcclusionService status classification', () => {
  it('emits an unavailable status when requestVideoFrameCallback is missing', () => {
    const statuses: OcclusionStatus[] = []
    const service = new OcclusionService(factory, silentLogger)
    service.configure(makeConfig({ onStatus: (s) => statuses.push(s) }))

    service.start(makeVideoWithoutRvfc())

    expect(statuses).toHaveLength(1)
    expect(statuses[0].reason).toBe('unavailable')
    expect(service.getStats().running).toBe(false)
    expect(service.getStats().lastError).toBe(statuses[0].message)
  })
})

class FakeFrameVideo {
  paused = false
  readyState = 2
  private callback: (() => void) | null = null

  requestVideoFrameCallback(fn: () => void): number {
    this.callback = fn
    return 1
  }

  cancelVideoFrameCallback(): void {
    this.callback = null
  }

  fireFrame(): void {
    const fn = this.callback
    this.callback = null
    fn?.()
  }
}

const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0))

async function runOneFrame(
  service: OcclusionService,
  video: FakeFrameVideo
): Promise<void> {
  service.start(video as unknown as HTMLVideoElement) // lint-specs-allow-cast: partial fake of a stable external DOM interface
  await flush()
  video.fireFrame()
  await flush()
}

describe('OcclusionService frame read outcomes', () => {
  it('disables with a drm status when the video is encrypted', async () => {
    read.mockResolvedValue({
      status: 'disabled',
      failure: { kind: 'protected', evidence: 'encrypted' },
    })
    const statuses: OcclusionStatus[] = []
    const service = new OcclusionService(factory, silentLogger)
    service.configure(makeConfig({ onStatus: (s) => statuses.push(s) }))

    await runOneFrame(service, new FakeFrameVideo())

    expect(statuses.map((s) => s.reason)).toEqual(['drm'])
    expect(service.getStats().running).toBe(false)
  })

  it('disables with a cross-origin taint status when the clone stays tainted', async () => {
    read.mockResolvedValue({
      status: 'disabled',
      failure: { kind: 'protected', evidence: 'clone-tainted' },
    })
    const statuses: OcclusionStatus[] = []
    const service = new OcclusionService(factory, silentLogger)
    service.configure(makeConfig({ onStatus: (s) => statuses.push(s) }))

    await runOneFrame(service, new FakeFrameVideo())

    expect(statuses.map((s) => s.reason)).toEqual(['taint'])
    expect(service.getStats().running).toBe(false)
  })

  it('disables with an unreadable status when frames cannot be recovered', async () => {
    read.mockResolvedValue({
      status: 'disabled',
      failure: { kind: 'unavailable', evidence: 'clone-failed' },
    })
    const statuses: OcclusionStatus[] = []
    const service = new OcclusionService(factory, silentLogger)
    service.configure(makeConfig({ onStatus: (s) => statuses.push(s) }))

    await runOneFrame(service, new FakeFrameVideo())

    expect(statuses.map((s) => s.reason)).toEqual(['unreadable'])
    expect(service.getStats().running).toBe(false)
  })

  it('keeps the applied mask and the loop alive while a frame is pending', async () => {
    read.mockResolvedValue({ status: 'pending' })
    const statuses: OcclusionStatus[] = []
    const applyMask = vi.fn()
    const service = new OcclusionService(factory, silentLogger)
    service.configure(
      makeConfig({ applyMask, onStatus: (s) => statuses.push(s) })
    )

    const video = new FakeFrameVideo()
    service.start(video as unknown as HTMLVideoElement) // lint-specs-allow-cast: partial fake of a stable external DOM interface
    await flush()
    applyMask.mockClear()

    video.fireFrame()
    await flush()

    expect(statuses).toEqual([])
    expect(applyMask).not.toHaveBeenCalled()
    expect(service.getStats().running).toBe(true)
  })
})

describe('OcclusionService browser support', () => {
  it('does not start where occlusion is unsupported, even when enabled', async () => {
    support.occlusion = false
    const statuses: OcclusionStatus[] = []
    const onRunningChange = vi.fn()
    const service = new OcclusionService(factory, silentLogger)
    service.configure(
      makeConfig({ onStatus: (s) => statuses.push(s), onRunningChange })
    )
    const video = new FakeFrameVideo()
    const requestFrame = vi.spyOn(video, 'requestVideoFrameCallback')

    service.start(video as unknown as HTMLVideoElement) // lint-specs-allow-cast: partial fake of a stable external DOM interface
    await flush()

    expect(service.getStats().running).toBe(false)
    expect(onRunningChange).not.toHaveBeenCalled()
    expect(requestFrame).not.toHaveBeenCalled()
    expect(statuses).toEqual([])
  })
})

describe('OcclusionService segment failures', () => {
  const composed = {
    url: 'data:image/png;base64,',
    mask: { data: new Uint8ClampedArray(4), width: 1, height: 1 },
  }
  const okResult = {
    category: new Uint8Array(1),
    maskSize: { width: 1, height: 1 },
  }

  function startLoop(provider: MaskProvider) {
    const statuses: OcclusionStatus[] = []
    const applyMask = vi.fn()
    const video = new FakeFrameVideo()
    read.mockResolvedValue({
      status: 'frame',
      frame: { element: video, mediaTime: 0 },
    })
    compose.mockReturnValue(composed)
    const service = new OcclusionService(() => provider, silentLogger)
    service.configure(
      makeConfig({
        minIntervalMs: 0,
        applyMask,
        onStatus: (s) => statuses.push(s),
      })
    )
    service.start(video as unknown as HTMLVideoElement) // lint-specs-allow-cast: partial fake of a stable external DOM interface
    return { service, video, statuses, applyMask }
  }

  async function frames(video: FakeFrameVideo, count: number) {
    for (let i = 0; i < count; i++) {
      await flush()
      video.fireFrame()
      await flush()
    }
  }

  it('does not count the in-flight frame that a reset settles as a failure', async () => {
    let calls = 0
    let settle: ((result: null) => void) | undefined
    const provider: MaskProvider = {
      init: () => Promise.resolve(),
      segment: () => {
        calls++
        if (calls < 5) {
          return Promise.resolve(null)
        }
        return new Promise((resolve) => {
          settle = resolve
        })
      },
      dispose: () => settle?.(null),
    }
    const { service, video, statuses } = startLoop(provider)
    await frames(video, 5)
    expect(settle).toBeDefined()

    service.reset()
    await flush()

    expect(statuses).toEqual([])
    expect(service.getStats().lastError).toBeNull()
  })

  it.each([
    ['returns no result', () => Promise.resolve(null)],
    ['throws', () => Promise.reject(new Error('segmenter failed'))],
  ])('stops with a segment status once the segmenter %s on five frames in a row', async (_, segment) => {
    const provider: MaskProvider = {
      init: () => Promise.resolve(),
      segment,
    }
    const { service, video, statuses } = startLoop(provider)

    await frames(video, 4)
    expect(statuses).toEqual([])
    expect(service.getStats().running).toBe(true)

    await frames(video, 1)
    expect(statuses.map((s) => s.reason)).toEqual(['segment'])
    expect(service.getStats().running).toBe(false)

    const requestFrame = vi.spyOn(video, 'requestVideoFrameCallback')
    await frames(video, 2)
    expect(requestFrame).not.toHaveBeenCalled()
  })

  it('keeps running when a good frame breaks a run of failures', async () => {
    const results = [null, null, null, null, okResult, null, null, null, null]
    const provider: MaskProvider = {
      init: () => Promise.resolve(),
      segment: () => Promise.resolve(results.shift() ?? null),
    }
    const { service, video, statuses, applyMask } = startLoop(provider)

    await frames(video, 9)

    expect(statuses).toEqual([])
    expect(applyMask).toHaveBeenCalledWith(composed.url)
    expect(service.getStats().running).toBe(true)
  })
})
