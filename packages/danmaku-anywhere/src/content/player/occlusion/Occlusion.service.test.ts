import { describe, expect, it, vi } from 'vitest'
import { modelEntrySchema } from '@/common/models/schema'
import { silentLogger } from '@/tests/silentLogger'

const { read, reset } = vi.hoisted(() => ({
  read: vi.fn(),
  reset: vi.fn(),
}))

vi.mock('./frameSource', () => ({
  FrameSource: class {
    read = read
    reset = reset
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
 * read outcome is classified. A successful capture is not driven here since
 * jsdom lacks createImageBitmap.
 */

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
  } as unknown as HTMLVideoElement
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
      } as unknown as MaskProvider
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
  service.start(video as unknown as HTMLVideoElement)
  await flush()
  video.fireFrame()
  await flush()
}

describe('OcclusionService frame read outcomes', () => {
  it('disables with a taint status when the video is protected', async () => {
    read.mockResolvedValue({
      status: 'disabled',
      failure: { kind: 'protected', evidence: 'encrypted' },
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
    service.start(video as unknown as HTMLVideoElement)
    await flush()
    applyMask.mockClear()

    video.fireFrame()
    await flush()

    expect(statuses).toEqual([])
    expect(applyMask).not.toHaveBeenCalled()
    expect(service.getStats().running).toBe(true)
  })
})
