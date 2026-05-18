import type {
  Danmaku,
  Manager,
  ManagerPlugin,
  PushFlexOptions,
} from '@mr-quin/danmu'
import type { ParsedComment } from '../parser'

type Placement = 'top' | 'bottom'

class DanmakuStack {
  private readonly topStack: number[] = []
  private topLen = 0

  private readonly bottomStack: number[] = []
  private bottomLen = 0

  constructor(private _trackCount: number) {
    this.setTrackCount(_trackCount)
  }

  setTrackCount(trackCount: number) {
    this._trackCount = trackCount

    this.topStack.length = trackCount
    this.bottomStack.length = trackCount

    for (let i = 0; i < trackCount; i++) {
      if (typeof this.topStack[i] !== 'number') {
        this.topStack[i] = 0
      }
      if (typeof this.bottomStack[i] !== 'number') {
        this.bottomStack[i] = 0
      }
    }
  }

  getTrackCount() {
    return this._trackCount
  }

  private getSlot(placement: Placement) {
    const stack = placement === 'top' ? this.topStack : this.bottomStack

    const emptySlot = stack.findIndex((item) => item === 0)

    if (emptySlot !== -1) {
      return emptySlot % this._trackCount
    }

    if (placement === 'top') {
      return this.topLen % this._trackCount
    }
    return this.bottomLen % this._trackCount
  }

  private not(slot: number, placement: Placement) {
    if (placement === 'top') {
      return slot
    }
    // 0 -> -1, 1 -> -2
    // -1 -> 0, -2 -> 1
    return ~slot
  }

  push(placement: Placement) {
    const slot = this.getSlot(placement)

    if (placement === 'top') {
      this.topLen += 1
      this.topStack[slot] += 1
    } else {
      this.bottomLen += 1
      this.bottomStack[slot] += 1
    }

    return this.not(slot, placement)
  }

  remove(track: number, placement: Placement) {
    const slot = this.not(track, placement)

    if (placement === 'top') {
      this.topStack[slot] = Math.max(this.topStack[slot] - 1, 0)
      this.topLen = Math.max(this.topLen - 1, 0)
    } else {
      this.bottomStack[slot] = Math.max(this.bottomStack[slot] - 1, 0)
      this.bottomLen = Math.max(this.bottomLen - 1, 0)
    }
  }

  isFull(placement: Placement) {
    if (placement === 'top') {
      return this.topLen >= this._trackCount
    }
    return this.bottomLen >= this._trackCount
  }

  clear() {
    this.topStack.fill(0)
    this.bottomStack.fill(0)
    this.topLen = 0
    this.bottomLen = 0
  }
}

function waitForDimensions(
  danmaku: Danmaku<ParsedComment>,
  x: number,
  y: number,
  depth = 0
) {
  if (depth > 10) {
    return
  }

  const width = danmaku.getWidth()
  const height = danmaku.getHeight()

  if (width === 0 || height === 0) {
    requestAnimationFrame(() => {
      waitForDimensions(danmaku, x, y, depth + 1)
    })
    return
  }

  danmaku._updatePosition({
    x: (x - danmaku.getWidth()) * 0.5,
    y: y - danmaku.getHeight() * 0.5,
  })
}

export const useFixedDanmaku = (manager: Manager<ParsedComment>) => {
  const trackCount = manager.trackCount
  const stack = new DanmakuStack(trackCount)

  // `$destroyed` fires asynchronously after `manager.clear()`. Without this
  // token guard, a stale destroy could decrement a freshly-assigned slot and
  // produce overlapping danmaku after a seek.
  const activeTokens = new Set<object>()

  const isFull = (placement: Placement) => stack.isFull(placement)

  function buildOptions(
    slot: number,
    placement: Placement
  ): PushFlexOptions<ParsedComment> {
    const token = {}
    activeTokens.add(token)
    return {
      position(danmaku, container) {
        const width = danmaku.getWidth()
        const height = danmaku.getHeight()
        const track = manager.getTrack(slot)

        // Lib quirk: dimensions can read as 0 here for the first few frames.
        // Hide off-screen and retry on rAF until they're available.
        // TODO: fix dimensions on the library side.
        if (width === 0 || height === 0) {
          waitForDimensions(danmaku, container.width, track.location.middle)
          return { x: container.width, y: container.height }
        }
        return {
          x: (container.width - width) * 0.5,
          y: track.location.middle - height * 0.5,
        }
      },
      plugin: {
        destroyed: () => {
          if (!activeTokens.delete(token)) return
          stack.remove(slot, placement)
        },
      },
    }
  }

  const getDanmakuOptions = (placement: Placement) =>
    buildOptions(stack.push(placement), placement)

  /** Pills bypass the `isFull` gate but share the top stack so a regular top
   *  can't claim a track already held by a pill. */
  const getPillOptions = () => buildOptions(stack.push('top'), 'top')

  const plugin: ManagerPlugin<ParsedComment> = {
    name: 'fixed-danmaku',
    start() {
      stack.setTrackCount(manager.trackCount)
    },
    updateOptions() {
      stack.setTrackCount(manager.trackCount)
    },
    format() {
      stack.setTrackCount(manager.trackCount)

      manager.each((danmaku) => {
        if (danmaku.type === 'facile') return
        danmaku._updatePosition({
          x: (manager.container.width - danmaku.getWidth()) * 0.5,
        })
      })
    },
    clear() {
      stack.clear()
      activeTokens.clear()
    },
  }

  return {
    plugin,
    isFull,
    getDanmakuOptions,
    getPillOptions,
  }
}
