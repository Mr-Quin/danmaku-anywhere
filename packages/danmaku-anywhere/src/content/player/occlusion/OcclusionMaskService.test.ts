import { describe, expect, it, vi } from 'vitest'
import { MockMaskProvider } from './MockMaskProvider'
import {
  OcclusionMaskService,
  type OcclusionStatus,
} from './OcclusionMaskService'

/**
 * Unit tests for the observable status/stats surface of OcclusionMaskService
 * (DA-554/DA-553 data side). Exercises the idle stats defaults, the
 * 'unavailable' gate when requestVideoFrameCallback is missing (classified
 * status + lastError), and that the debug-overlay flag is reflected in stats
 * and flipped via setRuntime. The segment loop itself is not driven here since
 * jsdom lacks createImageBitmap.
 */

function makeVideoWithoutRvfc(): HTMLVideoElement {
  return {
    requestVideoFrameCallback: undefined,
  } as unknown as HTMLVideoElement
}

describe('OcclusionMaskService stats', () => {
  it('reports idle defaults before start', () => {
    const service = new OcclusionMaskService(
      new MockMaskProvider(),
      () => undefined
    )
    expect(service.getStats()).toEqual({
      running: false,
      fps: null,
      lastError: null,
      debugOverlay: false,
    })
  })

  it('reflects the debug flag as debugOverlay and flips it via setRuntime', () => {
    const service = new OcclusionMaskService(
      new MockMaskProvider(),
      () => undefined,
      { debug: true }
    )
    expect(service.getStats().debugOverlay).toBe(true)
    service.setRuntime({ debug: false })
    expect(service.getStats().debugOverlay).toBe(false)
  })
})

describe('OcclusionMaskService status classification', () => {
  it('emits an unavailable status when requestVideoFrameCallback is missing', () => {
    const statuses: OcclusionStatus[] = []
    const service = new OcclusionMaskService(
      new MockMaskProvider(),
      () => undefined,
      { onStatus: (s) => statuses.push(s) }
    )

    service.start(makeVideoWithoutRvfc())

    expect(statuses).toHaveLength(1)
    expect(statuses[0].reason).toBe('unavailable')
    expect(service.getStats().running).toBe(false)
    expect(service.getStats().lastError).toBe(statuses[0].message)
  })

  it('still feeds the log sink alongside onStatus', () => {
    const log = vi.fn()
    const service = new OcclusionMaskService(
      new MockMaskProvider(),
      () => undefined,
      { log }
    )

    service.start(makeVideoWithoutRvfc())

    expect(log).toHaveBeenCalledWith(
      expect.stringContaining('requestVideoFrameCallback unavailable')
    )
  })
})
