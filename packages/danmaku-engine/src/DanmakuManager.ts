import Danmaku from 'danmaku'

import type { CachedComment, DanmakuStyle } from './parser'
import {
  filterComments,
  sampleComments,
  transformDanDanComments,
} from './parser'

export interface DanmakuFilter {
  type: 'text' | 'regex'
  value: string
  enabled: boolean
}

export interface DanmakuOptions {
  readonly style: DanmakuStyle
  readonly show: boolean
  readonly filters: DanmakuFilter[]
  readonly filterLevel: number
  readonly speed: number
  /**
   * The offset in milliseconds to adjust the time of the comments.
   */
  readonly offset: number
}

const configDefaults: DanmakuOptions = {
  show: true,
  filters: [],
  speed: 1,
  filterLevel: 0,
  style: {
    opacity: 1,
    fontSize: 25,
    fontFamily: 'sans-serif',
  },
  offset: 0,
}

const BASE_SPEED = 144

const filterLevelToRatio = (level: number) => {
  return (5 - level) / 5
}

export class DanmakuManager {
  instance?: Danmaku
  container?: HTMLElement
  media?: HTMLMediaElement
  comments: CachedComment[] = []
  config: DanmakuOptions = configDefaults
  created = false

  create(
    container: HTMLElement,
    media: HTMLMediaElement,
    comments: CachedComment[],
    config?: Partial<DanmakuOptions>
  ): void {
    if (this.created) this.destroy()

    this.container = container
    this.media = media
    this.comments = comments
    this.config = this.#mergeConfig(config)

    const filteredComments = filterComments(comments, this.config.filters)

    const sampledComments = sampleComments(
      filteredComments,
      filterLevelToRatio(this.config.filterLevel)
    )

    const parsedComments = transformDanDanComments(
      Array.from(sampledComments),
      this.config.style,
      this.config.offset
    )

    this.instance = new Danmaku({
      container: this.container,
      media: this.media,
      comments: parsedComments,
      speed: this.config.speed * BASE_SPEED,
    })

    if (this.config.show) {
      this.instance.show()
    } else {
      this.instance.hide()
    }

    this.created = true
  }

  updateConfig(config: Partial<DanmakuOptions>): void {
    if (this.created) {
      this.create(
        this.container!,
        this.media!,
        this.comments,
        this.#mergeConfig(config)
      )
    }
  }

  #mergeConfig = (config?: Partial<DanmakuOptions>): DanmakuOptions => {
    if (!config) return this.config

    // manually merge styles
    const style = { ...this.config.style, ...config.style }
    return { ...this.config, ...config, style }
  }

  destroy(): void {
    this.instance?.destroy()
    this.instance = undefined
    this.container = undefined
    this.media = undefined
    this.comments = []
    this.created = false
  }

  // Pass through methods
  show(): void {
    this.instance?.show()
  }

  hide(): void {
    this.instance?.hide()
  }

  clear(): void {
    this.instance?.clear()
  }

  resize(): void {
    this.instance?.resize()
  }
}
