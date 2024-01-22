import Danmaku from 'danmaku'

import { DanDanComment } from './api'
import { DanmakuStyle, sampleComments, transformDanDanComments } from './parser'

export interface DanmakuOptions {
  style: DanmakuStyle
  show: boolean
  filters: string[]
  filterLevel: number
  speed: number
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
}

const BASE_SPEED = 144

const filterLevelToRatio = (level: number) => {
  return (5 - level) / 5
}

export class DanmakuManager {
  instance?: Danmaku
  container?: HTMLElement
  media?: HTMLMediaElement
  comments: DanDanComment[] = []
  config: DanmakuOptions = configDefaults
  created = false

  create(
    container: HTMLElement,
    media: HTMLMediaElement,
    comments: DanDanComment[],
    config?: Partial<DanmakuOptions>
  ): void {
    this.container = container
    this.media = media
    this.comments = comments
    this.config = this.#mergeConfig(config)

    const sampledComments = sampleComments(
      comments,
      filterLevelToRatio(this.config.filterLevel)
    )
    const parsedComments = transformDanDanComments(
      sampledComments,
      this.config.style
    )

    this.instance = new Danmaku({
      container: this.container,
      media: this.media,
      comments: parsedComments,
      speed: this.config.speed * BASE_SPEED,
    })

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
