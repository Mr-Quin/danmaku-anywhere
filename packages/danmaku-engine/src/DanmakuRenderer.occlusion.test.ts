import type { Manager } from '@mr-quin/danmu'
import { describe, expect, it, vi } from 'vitest'
import { DanmakuRenderer } from './DanmakuRenderer'
import type { ParsedComment } from './parser'

/**
 * The renderer applies the occlusion mask to the danmu container and places it
 * for the configured danmaku area, so a container that covers only part of the
 * video still gets the person cut-out over the person. Uses a fake manager that
 * records container styles; the mask library itself is not under test.
 */

function fakeManager() {
  const styles: Record<string, string> = {}
  const manager = {
    updateOccludedUrl: vi.fn((url?: string) => {
      styles.maskImage = url ? `url("${url}")` : 'none'
      if (url) {
        styles.maskSize = 'cover'
      }
    }),
    container: {
      setStyle: (key: string, value: string) => {
        styles[key] = value
      },
    },
    setArea: vi.fn(),
    updateOptions: vi.fn(),
    setStyle: vi.fn(),
  }
  return { manager, styles }
}

function rendererWith(area: {
  xStart: number
  xEnd: number
  yStart: number
  yEnd: number
}) {
  const renderer = new DanmakuRenderer(() => undefined)
  renderer.updateConfig({ area })
  const { manager, styles } = fakeManager()
  renderer.manager = manager as unknown as Manager<ParsedComment>
  return { renderer, manager, styles }
}

describe('DanmakuRenderer occlusion mask', () => {
  it('places the mask for a container that covers the top half of the video', () => {
    const { renderer, styles } = rendererWith({
      xStart: 0,
      xEnd: 100,
      yStart: 0,
      yEnd: 50,
    })

    renderer.setOcclusionMaskUrl('data:image/png;base64,AAAA')

    expect(styles.maskSize).toBe('100% 200%')
    expect(styles.maskPosition).toBe('0% 0%')
  })

  it('shifts the mask for a container offset into the video', () => {
    const { renderer, styles } = rendererWith({
      xStart: 20,
      xEnd: 80,
      yStart: 50,
      yEnd: 100,
    })

    renderer.setOcclusionMaskUrl('data:image/png;base64,AAAA')

    expect(styles.maskSize).toBe('166.6667% 200%')
    expect(styles.maskPosition).toBe('50% 100%')
  })

  it('re-places the current mask when the area changes', () => {
    const { renderer, styles } = rendererWith({
      xStart: 0,
      xEnd: 100,
      yStart: 0,
      yEnd: 100,
    })
    renderer.setOcclusionMaskUrl('data:image/png;base64,AAAA')
    expect(styles.maskSize).toBe('100% 100%')

    renderer.updateConfig({
      area: { xStart: 0, xEnd: 100, yStart: 0, yEnd: 50 },
    })

    expect(styles.maskSize).toBe('100% 200%')
  })

  it('clears the mask without placing it', () => {
    const { renderer, manager } = rendererWith({
      xStart: 0,
      xEnd: 100,
      yStart: 0,
      yEnd: 50,
    })

    renderer.setOcclusionMaskUrl(undefined)

    expect(manager.updateOccludedUrl).toHaveBeenCalledWith(undefined)
  })
})
