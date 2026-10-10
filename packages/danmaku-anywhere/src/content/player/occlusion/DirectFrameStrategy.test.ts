import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DirectFrameStrategy } from './DirectFrameStrategy'
import { asVideo, makeVideo } from './fakeVideo'

let canvasCount: number

beforeEach(() => {
  canvasCount = 0
  vi.spyOn(document, 'createElement').mockImplementation(((tag: string) => {
    if (tag === 'canvas') {
      canvasCount++
      return {} as HTMLCanvasElement
    }
    throw new Error(`unexpected createElement(${tag})`)
  }) as typeof document.createElement)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('DirectFrameStrategy', () => {
  it('reads the live element at its current media time', async () => {
    const video = makeVideo({ readyState: 2, currentTime: 7.5 })
    const strategy = new DirectFrameStrategy(asVideo(video))

    expect(await strategy.acquire()).toEqual({
      status: 'frame',
      frame: { element: asVideo(video), mediaTime: 7.5 },
    })
  })

  it('reports pending while no frame is decoded', async () => {
    const strategy = new DirectFrameStrategy(asVideo(makeVideo()))

    expect(await strategy.acquire()).toEqual({ status: 'pending' })
  })

  it('reads frames without probing the canvas again', async () => {
    const strategy = new DirectFrameStrategy(
      asVideo(makeVideo({ readyState: 2 }))
    )

    await strategy.acquire()
    await strategy.acquire()

    expect(canvasCount).toBe(0)
  })

  it('leaves the live element alone when disposed', () => {
    const video = makeVideo({ readyState: 2, paused: false })
    const strategy = new DirectFrameStrategy(asVideo(video))

    strategy.dispose()

    expect(video.remove).not.toHaveBeenCalled()
    expect(video.removeAttribute).not.toHaveBeenCalled()
    expect(video.pause).not.toHaveBeenCalled()
  })
})
