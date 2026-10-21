import type { Manager } from '@mr-quin/danmu'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Decision } from '../collapse/types'
import { DEFAULT_DANMAKU_OPTIONS } from '../options'
import type { ParsedComment } from '../parser'
import { type BindContext, bindVideo } from './bindVideo'

/**
 * After a seek on a paused video, danmaku at the new time render and then hold
 * still: the refreeze waits for danmu's next render tick and for each danmaku
 * it created to start moving or leave. Drives the plugin with a fake video and
 * a fake danmu manager whose render ticks and danmaku the test controls.
 */

type Hook = (value: unknown) => void

function fakeManager() {
  const state = {
    frozen: true,
    playing: false,
    accepts: true,
    pushes: 0,
    plugins: [] as Record<string, unknown>[],
    freeze: vi.fn(() => {
      state.frozen = true
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

  function emit(name: string, value?: unknown) {
    const plugin = manager.plugins.find((p) => name in p)
    if (!plugin) {
      throw new Error(`No plugin handles ${name}`)
    }
    ;(plugin[name] as Hook)(value)
  }

  // danmu's render tick takes danmaku from its stash and puts them on screen.
  function renderTick(count: number) {
    emit('render', 'facile')
    const danmaku = Array.from({ length: count }, (_, id) => ({ id }))
    for (const each of danmaku) {
      emit('$createNode', each)
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

  it('keeps comments that start moving more than 200 ms after the seek', () => {
    bind([comment(9), comment(9.5)])
    seekTo(10)
    expect(manager.pushes).toBe(2)

    vi.advanceTimersByTime(600)
    expect(manager.freeze).not.toHaveBeenCalled()

    const [first, second] = renderTick(2)
    vi.advanceTimersByTime(FRAME_MS)
    expect(manager.freeze).not.toHaveBeenCalled()

    emit('$beforeMove', first)
    vi.advanceTimersByTime(FRAME_MS)
    expect(manager.freeze).not.toHaveBeenCalled()

    emit('$beforeMove', second)
    vi.advanceTimersByTime(FRAME_MS)
    expect(manager.freeze).toHaveBeenCalledTimes(1)
  })

  it('freezes right after the first batch on a video with more comments than tracks', () => {
    bind(Array.from({ length: 12 }, (_, index) => comment(9 + index / 100)))
    seekTo(10)
    expect(manager.pushes).toBe(12)

    const onScreen = renderTick(4)
    for (const danmaku of onScreen) {
      emit('$beforeMove', danmaku)
    }
    vi.advanceTimersByTime(2 * FRAME_MS)

    expect(manager.freeze).toHaveBeenCalledTimes(1)
  })

  it('stops waiting for a danmaku danmu puts back in its stash', () => {
    bind([comment(9)])
    seekTo(10)

    const [danmaku] = renderTick(1)
    emit('$removeNode', danmaku)
    vi.advanceTimersByTime(FRAME_MS)

    expect(manager.freeze).toHaveBeenCalledTimes(1)
  })

  it('stops waiting for a destroyed danmaku', () => {
    bind([comment(9)])
    seekTo(10)

    const [danmaku] = renderTick(1)
    emit('$destroyed', danmaku)
    vi.advanceTimersByTime(FRAME_MS)

    expect(manager.freeze).toHaveBeenCalledTimes(1)
  })

  it('does not count danmaku from before the seek', () => {
    bind([comment(9)])
    const earlier = { id: 'earlier' }
    emit('$createNode', earlier)
    seekTo(10)

    const [danmaku] = renderTick(1)
    emit('$destroyed', earlier)
    vi.advanceTimersByTime(FRAME_MS)
    expect(manager.freeze).not.toHaveBeenCalled()

    emit('$beforeMove', danmaku)
    vi.advanceTimersByTime(FRAME_MS)
    expect(manager.freeze).toHaveBeenCalledTimes(1)
  })

  it('counts each danmaku once', () => {
    bind([comment(9), comment(9.5)])
    seekTo(10)

    const [first] = renderTick(2)
    emit('$beforeMove', first)
    emit('$destroyed', first)
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

  it('still freezes when danmu never renders the push', () => {
    bind([comment(9)])
    seekTo(10)

    vi.advanceTimersByTime(1999)
    expect(manager.freeze).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1 + FRAME_MS)
    expect(manager.freeze).toHaveBeenCalledTimes(1)
  })

  it('does not freeze a video that is playing again by the time danmaku move', () => {
    bind([comment(9)])
    seekTo(10)
    video.paused = false

    const [danmaku] = renderTick(1)
    emit('$beforeMove', danmaku)
    vi.advanceTimersByTime(FRAME_MS)

    expect(manager.freeze).not.toHaveBeenCalled()
  })

  it('freezes after the settle when a playing video started buffering during it', () => {
    bind([comment(9)], false)
    seekTo(10)
    video.dispatchEvent(new Event('waiting'))
    expect(manager.freeze).not.toHaveBeenCalled()

    const [danmaku] = renderTick(1)
    emit('$beforeMove', danmaku)
    vi.advanceTimersByTime(FRAME_MS)

    expect(manager.freeze).toHaveBeenCalledTimes(1)
  })

  it('does not freeze when playback resumed before the settle ended', () => {
    bind([comment(9)], false)
    seekTo(10)
    video.dispatchEvent(new Event('waiting'))
    video.dispatchEvent(new Event('play'))

    const [danmaku] = renderTick(1)
    emit('$beforeMove', danmaku)
    vi.advanceTimersByTime(FRAME_MS)

    expect(manager.freeze).not.toHaveBeenCalled()
  })

  it('stops danmu playing as well when the video was paused during the settle', () => {
    bind([comment(9)])
    seekTo(10)
    video.dispatchEvent(new Event('waiting'))
    expect(manager.freeze).not.toHaveBeenCalled()

    const [danmaku] = renderTick(1)
    emit('$beforeMove', danmaku)
    vi.advanceTimersByTime(FRAME_MS)

    expect(manager.freeze).toHaveBeenCalledTimes(1)
    expect(manager.isPlaying()).toBe(false)
  })
})
