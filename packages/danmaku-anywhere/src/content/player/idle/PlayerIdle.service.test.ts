import { describe, expect, it } from 'vitest'
import { isOverVideo } from './PlayerIdle.service'

function videoAt(rect: Partial<DOMRect>): HTMLVideoElement {
  const video = document.createElement('video')
  video.getBoundingClientRect = () =>
    ({ left: 100, top: 50, right: 500, bottom: 350, ...rect }) as DOMRect
  return video
}

describe('isOverVideo', () => {
  const video = videoAt({})

  it('counts a pointer inside the video rect', () => {
    expect(
      isOverVideo(
        new MouseEvent('mousemove', { clientX: 300, clientY: 200 }),
        video
      )
    ).toBe(true)
  })

  it('ignores a pointer outside the video rect', () => {
    expect(
      isOverVideo(
        new MouseEvent('mousemove', { clientX: 600, clientY: 200 }),
        video
      )
    ).toBe(false)
  })

  it('counts a pointer on the edge of the rect', () => {
    expect(
      isOverVideo(
        new MouseEvent('mousemove', { clientX: 100, clientY: 50 }),
        video
      )
    ).toBe(true)
  })

  it('ignores events without pointer coordinates', () => {
    expect(isOverVideo(new Event('keydown'), video)).toBe(false)
  })
})
