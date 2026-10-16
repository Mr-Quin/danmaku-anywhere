import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DanmakuRenderer } from './DanmakuRenderer'

/**
 * Hiding or showing danmaku is renderer state, not just a call on the current
 * danmu manager: a hide before the renderer is created, or before it is
 * created again, still applies to the manager it creates. Mocks the danmu
 * library and records show and hide on each manager it creates.
 */

interface FakeManager {
  show: ReturnType<typeof vi.fn>
  hide: ReturnType<typeof vi.fn>
}

const danmu = vi.hoisted(() => ({
  managers: [] as FakeManager[],
}))

vi.mock('@mr-quin/danmu', () => ({
  create: () => {
    const manager = new Proxy({} as Record<string | symbol, unknown>, {
      get: (target, key) => {
        if (!(key in target)) {
          target[key] = vi.fn()
        }
        return target[key]
      },
    })
    danmu.managers.push(manager as unknown as FakeManager)
    return manager
  },
}))

const container = {} as HTMLElement
const video = { paused: true } as HTMLMediaElement

function lastManager() {
  return danmu.managers[danmu.managers.length - 1]
}

describe('DanmakuRenderer visibility', () => {
  let renderer: DanmakuRenderer

  beforeEach(() => {
    danmu.managers.length = 0
    renderer = new DanmakuRenderer(() => undefined)
  })

  it('creates a visible manager by default', () => {
    renderer.create(container, video, [])

    expect(lastManager().show).toHaveBeenCalled()
    expect(lastManager().hide).not.toHaveBeenCalled()
  })

  it('applies a hide made before the renderer was created', () => {
    renderer.hide()
    renderer.create(container, video, [])

    expect(lastManager().hide).toHaveBeenCalled()
    expect(lastManager().show).not.toHaveBeenCalled()
  })

  it('keeps a hide when the renderer is created again', () => {
    renderer.create(container, video, [])
    renderer.hide()
    renderer.create(container, video, [])

    expect(danmu.managers).toHaveLength(2)
    expect(lastManager().hide).toHaveBeenCalled()
    expect(lastManager().show).not.toHaveBeenCalled()
  })

  it('keeps a hide across a destroy and create', () => {
    renderer.create(container, video, [])
    renderer.hide()
    renderer.destroy()
    renderer.create(container, video, [])

    expect(lastManager().hide).toHaveBeenCalled()
  })

  it('applies a show made after a hide to the next manager', () => {
    renderer.hide()
    renderer.show()
    renderer.create(container, video, [])

    expect(lastManager().show).toHaveBeenCalled()
    expect(lastManager().hide).not.toHaveBeenCalled()
  })
})
