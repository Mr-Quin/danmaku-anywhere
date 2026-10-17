import type { Manager } from '@mr-quin/danmu'
import type { BumpEvent, CollapseAnnotation, Decision } from '../collapse/types'
import type { DanmakuOptions } from '../options'
import type { ParsedComment } from '../parser'
import { useFixedDanmaku } from './fixedDanmaku'

const binarySearch = (comments: ParsedComment[], time: number): number => {
  let low = 0
  let high = comments.length - 1
  let ans = comments.length
  while (low <= high) {
    const mid = Math.floor((low + high) / 2)
    if (comments[mid].time >= time) {
      ans = mid
      high = mid - 1
    } else {
      low = mid + 1
    }
  }
  return ans
}

const binarySearchBumps = (events: BumpEvent[], time: number): number => {
  let low = 0
  let high = events.length - 1
  let ans = events.length
  while (low <= high) {
    const mid = Math.floor((low + high) / 2)
    if (events[mid].atSec >= time) {
      ans = mid
      high = mid - 1
    } else {
      low = mid + 1
    }
  }
  return ans
}

const DURATION_MS = 5000
const DURATION_S = DURATION_MS / 1000
// Longest a paused video's danmaku may keep moving after a seek while danmu
// still holds pushes it has not rendered, for example with no free track.
const SEEK_SETTLE_CAP_MS = 2000

export interface BindContext {
  decisions: Decision[]
  bumpEvents: BumpEvent[]
  bumpsByHead: Map<number, BumpEvent[]>
  heads: number[]
  onHeadEmit: (headIndex: number) => CollapseAnnotation | null
  onSetCount: (headIndex: number, count: number) => void
  /** Set by bindVideo; call after mutating `bumpEvents` to re-sync the cursor. */
  resyncBumps?: () => void
}

function latestCountAt(headBumps: BumpEvent[], t: number): number {
  let lo = 0
  let hi = headBumps.length
  while (lo < hi) {
    const mid = (lo + hi) >>> 1
    if (headBumps[mid].atSec <= t) {
      lo = mid + 1
    } else {
      hi = mid
    }
  }
  return lo > 0 ? headBumps[lo - 1].count : 0
}

export const bindVideo =
  (
    video: HTMLMediaElement,
    comments: ParsedComment[],
    getConfig: () => DanmakuOptions,
    ctx: BindContext
  ) =>
  (manager: Manager<ParsedComment>) => {
    const { plugin, isFull, getDanmakuOptions, getPillOptions } =
      useFixedDanmaku(manager)

    let cursor = 0
    let bumpCursor = 0
    let offset = getConfig().offset / 1000
    // Initialize optimistically. `document.visibilityState` reads as
    // `'hidden'`/`'prerender'` for iframes at content-script injection time
    // even when the user-facing page is visible, which suppresses emission
    // forever once the cursor advances past comments.
    let documentVisible = true

    const updateCursor = () => {
      cursor = binarySearch(comments, video.currentTime - offset - DURATION_S)
      bumpCursor = binarySearchBumps(ctx.bumpEvents, video.currentTime - offset)
    }

    // After a seek on a paused video, danmu must put the seek's danmaku on
    // screen before it is frozen again: it drops a danmaku whose deferred
    // frames have not run when freeze flips, and on a busy machine that takes
    // far longer than a frame. Scrolling pushes wait in danmu's stash for its
    // next render tick, so the settle waits for that tick, then for every
    // danmaku danmu created to start moving or leave the screen. Pushes still
    // in the stash survive a freeze, so they are not waited for.
    let settlingSeek = false
    let awaitingRender = false
    let inFlight = 0
    const seekDanmaku = new WeakSet<object>()
    let settleFrame: ReturnType<typeof requestAnimationFrame> | undefined
    let settleCap: ReturnType<typeof setTimeout> | undefined

    const unshift: typeof manager.unshift = (data, options) => {
      const pushed = manager.unshift(data, options)
      if (pushed && settlingSeek) {
        awaitingRender = true
      }
      return pushed
    }

    const stopSettling = () => {
      settlingSeek = false
      awaitingRender = false
      inFlight = 0
      if (settleFrame !== undefined) {
        cancelAnimationFrame(settleFrame)
        settleFrame = undefined
      }
      if (settleCap !== undefined) {
        clearTimeout(settleCap)
        settleCap = undefined
      }
    }

    const pauseDanmaku = () => {
      manager.freeze()
      manager.stopPlaying()
    }

    const finishSettling = () => {
      stopSettling()
      if (video.paused) {
        pauseDanmaku()
      }
    }

    // Checks again on the next frame, once danmu has created the danmaku of a
    // render tick and applied the transition of those that started moving.
    const settleWhenDone = () => {
      if (
        !settlingSeek ||
        awaitingRender ||
        inFlight > 0 ||
        settleFrame !== undefined
      ) {
        return
      }
      settleFrame = requestAnimationFrame(() => {
        settleFrame = undefined
        if (settlingSeek && !awaitingRender && inFlight === 0) {
          finishSettling()
        }
      })
    }

    const trackCreated = (danmaku: object) => {
      if (!settlingSeek || seekDanmaku.has(danmaku)) {
        return
      }
      seekDanmaku.add(danmaku)
      inFlight++
    }

    const trackDone = (danmaku: object) => {
      if (!settlingSeek || !seekDanmaku.has(danmaku)) {
        return
      }
      seekDanmaku.delete(danmaku)
      inFlight = Math.max(0, inFlight - 1)
      settleWhenDone()
    }

    updateCursor()
    ctx.resyncBumps = () => {
      bumpCursor = binarySearchBumps(ctx.bumpEvents, video.currentTime - offset)
    }

    const emitNormal = (comment: ParsedComment, progress: number) => {
      switch (comment.mode) {
        case 'rtl':
          unshift(comment, { progress })
          break
        case 'ltr':
          unshift(comment, { direction: 'right', progress })
          break
        case 'top':
        case 'bottom': {
          if (manager.isFreeze()) break
          const config = getConfig()
          const fixedCommentMode = config.specialComments[comment.mode]
          if (fixedCommentMode === 'normal') {
            if (config.allowOverlap || !isFull(comment.mode)) {
              manager.pushFlexibleDanmaku(comment, {
                duration: DURATION_MS,
                direction: 'none',
                ...getDanmakuOptions(comment.mode),
              })
            }
          } else if (fixedCommentMode === 'scroll') {
            unshift({ ...comment, mode: 'rtl' }, { progress })
          }
          break
        }
      }
    }

    const emitHead = (original: ParsedComment, index: number) => {
      const decision = ctx.decisions[index]
      if (!decision || decision.kind !== 'head') return
      const annotation = ctx.onHeadEmit(index)
      if (!annotation) {
        emitNormal(original, 0)
        return
      }

      const offsetTime = video.currentTime - offset
      const config = getConfig()
      if (!config.collapse.pattern.liveCount) {
        annotation.store.setCount(decision.finalCount)
      } else {
        const headBumps = ctx.bumpsByHead.get(index)
        if (headBumps) {
          const initial = latestCountAt(headBumps, offsetTime)
          if (initial > 1) annotation.store.setCount(initial)
        }
      }

      // Live counts linger past the last absorb so the climb finishes on
      // screen; static counts get the regular top-danmaku lifetime.
      const durationMs = config.collapse.pattern.liveCount
        ? Math.max(16, (decision.endTime - offsetTime) * 1000)
        : DURATION_MS

      const headComment: ParsedComment = {
        ...original,
        mode: 'top',
        collapse: annotation,
      }
      manager.pushFlexibleDanmaku(headComment, {
        duration: durationMs,
        direction: 'none',
        ...getPillOptions(),
      })
    }

    const emitDanmaku = (
      comment: ParsedComment,
      index: number,
      progress: number
    ) => {
      const decision = ctx.decisions[index]
      if (!decision) return
      switch (decision.kind) {
        case 'block':
        case 'dedupe':
        case 'absorbed':
          return
        case 'head':
          emitHead(comment, index)
          return
        case 'whitelist':
        case 'normal':
          emitNormal(comment, progress)
          return
      }
    }

    const fireBumpsUpTo = (timeSec: number) => {
      while (
        bumpCursor < ctx.bumpEvents.length &&
        ctx.bumpEvents[bumpCursor].atSec <= timeSec
      ) {
        const ev = ctx.bumpEvents[bumpCursor]
        ctx.onSetCount(ev.headIndex, ev.count)
        bumpCursor++
      }
    }

    const handleTimeupdate = () => {
      const offsetTime = video.currentTime - offset

      // Emit before bumps so same-timestamp absorbs find their head registered.
      while (cursor < comments.length) {
        const comment = comments[cursor]
        if (comment.time > offsetTime) break
        let progress = (offsetTime - comment.time) / DURATION_S
        if (progress < 0.1) progress = 0
        if (documentVisible) {
          emitDanmaku(comment, cursor, progress)
        }
        cursor++
      }

      fireBumpsUpTo(offsetTime)
    }

    /** Re-emit heads whose lifetime spans `offsetTime` but predate the cursor's lookback. */
    const reviveOverdueHeads = (offsetTime: number) => {
      const cursorStartTime = offsetTime - DURATION_S
      for (const headIndex of ctx.heads) {
        const headTime = comments[headIndex]?.time
        if (headTime === undefined) continue
        if (headTime > offsetTime) break
        if (headTime >= cursorStartTime) continue
        const decision = ctx.decisions[headIndex]
        if (!decision || decision.kind !== 'head') continue
        if (decision.endTime <= offsetTime) continue
        emitHead(comments[headIndex], headIndex)
      }
    }

    const handleSeek = () => {
      stopSettling()
      manager.clear()
      if (manager.isFreeze()) {
        manager.unfreeze()
      } else if (!manager.isPlaying()) {
        manager.startPlaying()
      }
      settlingSeek = true
      updateCursor()
      if (documentVisible) {
        reviveOverdueHeads(video.currentTime - offset)
      }
      handleTimeupdate()

      settleCap = setTimeout(() => {
        settleCap = undefined
        if (settlingSeek) {
          finishSettling()
        }
      }, SEEK_SETTLE_CAP_MS)
      settleWhenDone()
    }

    // A transient `waiting` while a seek settles would freeze danmu before
    // the seek's danmaku render; the settle pauses danmu itself if the video
    // is paused by then.
    const handlePause = () => {
      if (settlingSeek) return
      pauseDanmaku()
    }

    const handlePlay = () => {
      if (manager.isFreeze()) manager.unfreeze()
      manager.startPlaying()
      handleTimeupdate()
    }

    const handleVisibilityChange = () => {
      documentVisible = document.visibilityState === 'visible'
    }

    video.addEventListener('timeupdate', handleTimeupdate)
    video.addEventListener('seeking', handleSeek)
    video.addEventListener('pause', handlePause)
    video.addEventListener('waiting', handlePause)
    video.addEventListener('play', handlePlay)
    video.addEventListener('playing', handlePlay)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    manager.use({
      name: 'bind-video',
      unmount() {
        video.removeEventListener('timeupdate', handleTimeupdate)
        video.removeEventListener('seeking', handleSeek)
        video.removeEventListener('play', handlePlay)
        video.removeEventListener('playing', handlePlay)
        video.removeEventListener('pause', handlePause)
        video.removeEventListener('waiting', handlePause)
        document.removeEventListener('visibilitychange', handleVisibilityChange)
        stopSettling()
      },
      render(type) {
        if (type === 'facile' && settlingSeek && awaitingRender) {
          awaitingRender = false
          settleWhenDone()
        }
      },
      $createNode(danmaku) {
        trackCreated(danmaku)
      },
      $beforeMove(danmaku) {
        trackDone(danmaku)
      },
      $removeNode(danmaku) {
        trackDone(danmaku)
      },
      $destroyed(danmaku) {
        trackDone(danmaku)
      },
      updateOptions() {
        if (getConfig().offset !== offset) {
          offset = getConfig().offset / 1000
          updateCursor()
          manager.clear()
        }
      },
    })
    manager.use(plugin)
  }
