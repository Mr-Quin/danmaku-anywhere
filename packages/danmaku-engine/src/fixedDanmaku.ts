import { Manager, ManagerPlugin, PushFlexOptions } from 'danmu'
import { ParsedComment } from './parser'

type Placement = 'top' | 'bottom'

class DanmakuStack {
  private readonly topStack: number[] = []
  private topLen = 0

  private readonly bottomStack: number[] = []
  private bottomLen = 0

  constructor(private _trackCount: number) {
    console.debug('Initialized DanmakuStack with trackCount', _trackCount)
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
    } else {
      return this.bottomLen % this._trackCount
    }
  }

  private not(slot: number, placement: Placement) {
    if (placement === 'top') {
      return slot
    } else {
      // 0 -> -1, 1 -> -2
      // -1 -> 0, -2 -> 1
      return ~slot
    }
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
      this.topStack[slot] -= 1
      this.topLen -= 1
    } else {
      this.bottomStack[slot] -= 1
      this.bottomLen -= 1
    }
  }

  clear() {
    this.topStack.fill(0)
    this.bottomStack.fill(0)
    this.topLen = 0
    this.bottomLen = 0
  }
}

export const useFixedDanmaku = (manager: Manager<ParsedComment>) => {
  const trackCount = manager.trackCount
  const stack = new DanmakuStack(trackCount)

  console.debug('DanmakuManager: useFixed', stack)

  const getDanmakuOptions = (
    placement: Placement
  ): PushFlexOptions<ParsedComment> => {
    const slot = stack.push(placement)
    return {
      position(danmaku, container) {
        const track = manager.getTrack(slot)

        console.debug('rendering in track', { slot, track })
        return {
          x: (container.width - danmaku.getWidth()) * 0.5,
          y: track.location.middle - danmaku.getHeight() / 2,
        }
      },
      plugin: {
        destroyed: (d) => {
          console.log('destroyed', slot, d.data)
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
      console.debug('DanmakuManager: clear')
      stack.clear()
    },
  }

  return {
    plugin,
    getDanmakuOptions,
  }
}
