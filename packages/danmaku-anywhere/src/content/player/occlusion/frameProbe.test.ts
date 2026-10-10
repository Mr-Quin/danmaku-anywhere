import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { asVideo, makeVideo } from './fakeVideo'
import { probeReadability } from './frameProbe'

let canvasMode: 'clean' | 'security' | 'other' | 'no-context'
let canvasCount: number

function makeFakeCanvas(): unknown {
  return {
    width: 0,
    height: 0,
    getContext: () => {
      if (canvasMode === 'no-context') {
        return null
      }
      return {
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
      }
    },
  }
}

beforeEach(() => {
  canvasMode = 'clean'
  canvasCount = 0
  vi.spyOn(document, 'createElement').mockImplementation(((tag: string) => {
    if (tag === 'canvas') {
      canvasCount++
      return makeFakeCanvas()
    }
    throw new Error(`unexpected createElement(${tag})`)
  }) as typeof document.createElement)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('probeReadability', () => {
  it('reports undetermined without touching a canvas when no frame is decoded', () => {
    expect(probeReadability(asVideo(makeVideo({ readyState: 1 })))).toBe(
      'undetermined'
    )
    expect(canvasCount).toBe(0)
  })

  it('reports readable when pixels read back', () => {
    expect(probeReadability(asVideo(makeVideo({ readyState: 2 })))).toBe(
      'readable'
    )
  })

  it('reports tainted when reading pixels throws SecurityError', () => {
    canvasMode = 'security'
    expect(probeReadability(asVideo(makeVideo({ readyState: 2 })))).toBe(
      'tainted'
    )
  })

  it('reports readable when the canvas has no 2d context', () => {
    canvasMode = 'no-context'
    expect(probeReadability(asVideo(makeVideo({ readyState: 2 })))).toBe(
      'readable'
    )
  })

  it('reports readable when the pixel read fails for a non-security reason', () => {
    canvasMode = 'other'
    expect(probeReadability(asVideo(makeVideo({ readyState: 2 })))).toBe(
      'readable'
    )
  })
})
