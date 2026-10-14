import type { Manager } from '@mr-quin/danmu'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Decision } from '../collapse/types'
import { DEFAULT_DANMAKU_OPTIONS } from '../options'
import type { ParsedComment } from '../parser'
import { type BindContext, bindVideo } from './bindVideo'

/**
 * After a seek on a paused video the engine unfreezes danmu so the comments at
 * the new time render, then freezes again so they hold still. danmu drops a
 * push whose deferred frames have not run when freeze flips, and on a busy
 * machine that can take well over 200 ms. The refreeze waits until the danmaku
 * created for every push from the seek has started moving or been destroyed.
 * Drives the plugin with a fake video and a fake danmu manager that creates and
 * commits danmaku when the test says.
 */

type Hook = (danmaku: object) => void

interface FakeManager {
  frozen: boolean
  playing: boolean
  accepts: boolean
  pushes: number
  freeze: ReturnType<typeof vi.fn>
  plugins: Record<string, unknown>[]
}

function fakeManager(): FakeManager & Record<string, unknown> {
  const state: FakeManager & Record<string, unknown> = {
    frozen: true,
    playing: false,
    accepts: true,
    pushes: 0,
    plugins: [],
    freeze: vi.fn(() => {
      state.frozen = true
      state.playing = false
    }),
    unfreeze: () => {
      state.frozen = false
      state.playing = true
    },
    isFreeze: () => state.frozen,
    isPlaying: () => state.playing,
    startPlaying: () => {
      state.playing = true
    },
    stopPlaying: () => {
      state.playing = false
    },
    clear: () => undefined,
    unshift: () => {
      if (state.accepts) {
        state.pushes++
      }
      return state.accepts
    },
    pushFlexibleDanmaku: () => true,
    use: (plugin: Record<string, unknown>) => {
      state.plugins.push(plugin)
      return plugin
    },
    trackCount: 4,
  }
  return state
}

function hook(manager: FakeManager, name: string): Hook {
  const plugin = manager.plugins.find((p) => name in p)
  if (!plugin) {
    throw new Error(`No plugin handles ${name}`)
  }
  return plugin[name] as Hook
}

function comment(time: number): ParsedComment {
  return {
    time,
    mode: 'rtl',
    text: `at ${time}`,
    color: '#ffffff',
    style: {},
  } as unknown as ParsedComment
}

function context(count: number): BindContext {
  return {
    decisions: Array.from(
      { length: count },
      () => ({ kind: 'normal' }) as Decision
    ),
    bumpEvents: [],
    bumpsByHead: new Map(),
    heads: [],
    onHeadEmit: () => null,
    onSetCount: () => undefined,
  }
}

function fakeVideo(paused: boolean) {
  return Object.assign(new EventTarget(), { paused, currentTime: 0 })
}

const FRAME_MS = 16

describe('bindVideo after a seek on a paused video', () => {
  let manager: ReturnType<typeof fakeManager>
  let video: ReturnType<typeof fakeVideo>

  function bind(comments: ParsedComment[], paused = true) {
    video = fakeVideo(paused)
    manager = fakeManager()
    bindVideo(
      video as unknown as HTMLMediaElement,
      comments,
      () => DEFAULT_DANMAKU_OPTIONS,
      context(comments.length)
    )(manager as unknown as Manager<ParsedComment>)
  }

  // danmu creates the danmaku for each accepted push when it renders it.
  function created(count: number) {
    const danmaku = Array.from({ length: count }, (_, id) => ({ id }))
    for (const each of danmaku) {
      hook(manager, '$createNode')(each)
    }
    return danmaku
  }

  function seekTo(time: number) {
    video.currentTime = time
    video.dispatchEvent(new Event('seeking'))
  }

  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubGlobal(
      'document',
      Object.assign(new EventTarget(), { visibilityState: 'visible' })
    )
    vi.stubGlobal('requestAnimationFrame', (callback: () => void) => {
      return setTimeout(callback, FRAME_MS)
    })
    vi.stubGlobal('cancelAnimationFrame', (id: number) => {
      clearTimeout(id)
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('keeps comments whose push commits more than 200 ms after the seek', () => {
    bind([comment(9), comment(9.5)])
    seekTo(10)
    expect(manager.pushes).toBe(2)

    vi.advanceTimersByTime(600)
    expect(manager.freeze).not.toHaveBeenCalled()

    const [first, second] = created(2)
    const moving = hook(manager, '$beforeMove')
    moving(first)
    vi.advanceTimersByTime(FRAME_MS)
    expect(manager.freeze).not.toHaveBeenCalled()

    moving(second)
    vi.advanceTimersByTime(FRAME_MS)
    expect(manager.freeze).toHaveBeenCalledTimes(1)
  })

  it('counts a destroyed push as done', () => {
    bind([comment(9)])
    seekTo(10)

    const [danmaku] = created(1)
    hook(manager, '$destroyed')(danmaku)
    vi.advanceTimersByTime(FRAME_MS)

    expect(manager.freeze).toHaveBeenCalledTimes(1)
  })

  it('does not count danmaku from before the seek', () => {
    bind([comment(9)])
    const earlier = { id: 'earlier' }
    hook(manager, '$createNode')(earlier)
    seekTo(10)

    hook(manager, '$destroyed')(earlier)
    vi.advanceTimersByTime(FRAME_MS)

    expect(manager.freeze).not.toHaveBeenCalled()
  })

  it('counts each danmaku once', () => {
    bind([comment(9), comment(9.5)])
    seekTo(10)

    const [first] = created(2)
    hook(manager, '$beforeMove')(first)
    hook(manager, '$destroyed')(first)
    vi.advanceTimersByTime(FRAME_MS)

    expect(manager.freeze).not.toHaveBeenCalled()
  })

  it('freezes on the next frame when the seek pushed nothing', () => {
    bind([comment(30)])
    seekTo(10)
    vi.advanceTimersByTime(FRAME_MS)

    expect(manager.freeze).toHaveBeenCalledTimes(1)
  })

  it('does not wait for a push the library refused', () => {
    bind([comment(9)])
    manager.accepts = false
    seekTo(10)
    vi.advanceTimersByTime(FRAME_MS)

    expect(manager.freeze).toHaveBeenCalledTimes(1)
  })

  it('still freezes when a push never renders', () => {
    bind([comment(9)])
    seekTo(10)

    vi.advanceTimersByTime(1999)
    expect(manager.freeze).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1 + FRAME_MS)
    expect(manager.freeze).toHaveBeenCalledTimes(1)
  })

  it('does not freeze a video that is playing again by the time pushes commit', () => {
    bind([comment(9)])
    seekTo(10)
    video.paused = false

    const [danmaku] = created(1)
    hook(manager, '$beforeMove')(danmaku)
    vi.advanceTimersByTime(FRAME_MS)

    expect(manager.freeze).not.toHaveBeenCalled()
  })

  it('ignores a pause while the seek settles', () => {
    bind([comment(9)])
    seekTo(10)

    video.dispatchEvent(new Event('waiting'))
    expect(manager.freeze).not.toHaveBeenCalled()
  })
})
