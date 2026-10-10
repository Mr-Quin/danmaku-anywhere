import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CloneFrameStrategy } from './CloneFrameStrategy'
import { DirectFrameStrategy } from './DirectFrameStrategy'
import { asVideo, type FakeVideo, makeVideo } from './fakeVideo'
import { frameStrategyFactory } from './frameStrategyFactory'

let tainted: boolean

beforeEach(() => {
  tainted = true
  vi.spyOn(document, 'createElement').mockImplementation(((tag: string) => {
    if (tag === 'canvas') {
      return {
        width: 0,
        height: 0,
        getContext: () => ({
          drawImage: () => undefined,
          getImageData: () => {
            if (tainted) {
              throw new DOMException('tainted', 'SecurityError')
            }
            return { data: new Uint8ClampedArray(4) }
          },
        }),
      }
    }
    throw new Error(`unexpected createElement(${tag})`)
  }) as typeof document.createElement)
})

afterEach(() => {
  vi.restoreAllMocks()
})

function classify(overrides: Partial<FakeVideo> = {}, extras: object = {}) {
  const video = Object.assign(
    makeVideo({ readyState: 2, ...overrides }),
    extras
  )
  return frameStrategyFactory()(asVideo(video))
}

describe('frameStrategyFactory', () => {
  it('defers classification while no frame is decoded', () => {
    expect(classify({ readyState: 1 })).toEqual({ kind: 'pending' })
  })

  it('defers classification while the video has no source', () => {
    tainted = false
    expect(classify({ currentSrc: '' })).toEqual({ kind: 'pending' })
  })

  it('reads a readable video directly', () => {
    tainted = false
    const plan = classify()

    expect(plan.kind).toBe('strategy')
    expect(plan).toHaveProperty('strategy', expect.any(DirectFrameStrategy))
  })

  it('treats encrypted media as protected before considering a clone', () => {
    expect(classify({}, { mediaKeys: {} })).toEqual({
      kind: 'failed',
      failure: { kind: 'protected', evidence: 'encrypted' },
    })
  })

  it('treats a tainted same-origin source as protected', () => {
    expect(classify({ currentSrc: `${location.origin}/media/v.webm` })).toEqual(
      {
        kind: 'failed',
        failure: { kind: 'protected', evidence: 'same-origin' },
      }
    )
  })

  it('resolves a relative source against the page origin', () => {
    expect(classify({ currentSrc: '/media/v.webm' })).toEqual({
      kind: 'failed',
      failure: { kind: 'protected', evidence: 'same-origin' },
    })
  })

  it('treats a tainted blob source as protected', () => {
    expect(
      classify({ currentSrc: 'blob:https://cdn.example.com/abc' })
    ).toEqual({
      kind: 'failed',
      failure: { kind: 'protected', evidence: 'non-http' },
    })
  })

  it('treats a tainted data source as protected', () => {
    expect(classify({ currentSrc: 'data:video/mp4;base64,AAAA' })).toEqual({
      kind: 'failed',
      failure: { kind: 'protected', evidence: 'non-http' },
    })
  })

  it('does not read an unparseable source as same-origin', () => {
    const plan = classify({ currentSrc: 'http://[' })

    expect(plan).not.toEqual({
      kind: 'failed',
      failure: { kind: 'protected', evidence: 'same-origin' },
    })
  })

  it('clones a tainted cross-origin http source', () => {
    const plan = classify({ currentSrc: 'https://cdn.example.com/v.webm' })

    expect(plan.kind).toBe('strategy')
    expect(plan).toHaveProperty('strategy', expect.any(CloneFrameStrategy))
  })
})
