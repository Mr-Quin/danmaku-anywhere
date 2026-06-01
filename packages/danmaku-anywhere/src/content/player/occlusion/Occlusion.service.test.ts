import { describe, expect, it, vi } from 'vitest'
import type { ILogger } from '@/common/Logger'
import { modelEntrySchema } from '@/common/models/schema'
import { MockMaskProvider } from './MockMaskProvider'
import type { IMaskProviderFactory } from './maskProviderFactory'
import {
  type OcclusionConfig,
  OcclusionService,
  type OcclusionStatus,
} from './Occlusion.service'

const peopleModel = modelEntrySchema.parse({
  id: 'people',
  label: { en: 'People', zh: '真人' },
  runtime: 'mediapipe',
  delivery: 'bundled',
  inputSize: 256,
  requiresWebGpu: false,
})

/**
 * Unit tests for the observable status/stats surface of OcclusionService.
 * Exercises the idle stats defaults, the 'unavailable' gate when
 * requestVideoFrameCallback is missing (classified status + lastError), and that
 * the debug flag is reflected in stats and flipped via setDebug. The segment
 * loop itself is not driven here since jsdom lacks createImageBitmap.
 */

function makeLogger(debug = vi.fn()): ILogger {
  const logger = {
    debug,
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    sub: () => logger,
  } as unknown as ILogger
  return logger
}

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
    const service = new OcclusionService(factory, makeLogger())
    expect(service.getStats()).toEqual({
      running: false,
      fps: null,
      lastError: null,
      debugOverlay: false,
    })
  })

  it('reflects the debug flag as debugOverlay and flips it via setDebug', () => {
    const service = new OcclusionService(factory, makeLogger())
    service.configure(makeConfig({ debug: true }))
    expect(service.getStats().debugOverlay).toBe(true)
    service.setDebug(false)
    expect(service.getStats().debugOverlay).toBe(false)
  })
})

describe('OcclusionService status classification', () => {
  it('emits an unavailable status when requestVideoFrameCallback is missing', () => {
    const statuses: OcclusionStatus[] = []
    const service = new OcclusionService(factory, makeLogger())
    service.configure(makeConfig({ onStatus: (s) => statuses.push(s) }))

    service.start(makeVideoWithoutRvfc())

    expect(statuses).toHaveLength(1)
    expect(statuses[0].reason).toBe('unavailable')
    expect(service.getStats().running).toBe(false)
    expect(service.getStats().lastError).toBe(statuses[0].message)
  })
})
