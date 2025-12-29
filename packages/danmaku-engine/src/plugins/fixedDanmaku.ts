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
    this.trackCount = _trackCount
  }

  set trackCount(trackCount: number) {
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

  get trackCount() {
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

  const getDanmakuOptions = (
    placement: Placement
  ): PushFlexOptions<ParsedComment> => {
    const slot = stack.push(placement)

    return {
      position(danmaku, container) {
        const width = danmaku.getWidth()
        const height = danmaku.getHeight()

        const track = manager.getTrack(slot)

        // TODO: maybe fix dimensions on the library side
        /**
         * Sometimes the dimensions are not available yet in this callback (returns 0, 0),
         * in such cases we wait for the dimensions to be available by
         * repeated checking for the dimensions. Typically the dimension will be available
         * after a few frames.
         * We hide the danmaku in the meantime by positioning it off-screen
         */
        if (width === 0 || height === 0) {
          waitForDimensions(danmaku, container.width, track.location.middle)

          return {
            x: container.width,
            y: container.height,
          }
        }

        return {
          x: (container.width - width) * 0.5,
          y: track.location.middle - height * 0.5,
        }
      },
      plugin: {
        destroyed: () => {
          stack.remove(slot, placement)
        },
      },
    }
  }

  const plugin: ManagerPlugin<ParsedComment> = {
    name: 'fixed-danmaku',
    start() {
      stack.trackCount = manager.trackCount
    },
    updateOptions() {
      stack.trackCount = manager.trackCount
    },
    format() {
      stack.trackCount = manager.trackCount

      // recalculate the position of all danmaku when the container size changes
      manager.each((danmaku) => {
        if (danmaku.type === 'facile') return

        danmaku._updatePosition({
          x: (manager.container.width - danmaku.getWidth()) * 0.5,
        })
      })
    },
    clear() {
      stack.clear()
    },
  }

  return {
    plugin,
    getDanmakuOptions,
  }
}
