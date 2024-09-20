import type { CommentEntity } from '@danmaku-anywhere/danmaku-converter'
import Danmaku from 'danmaku'

import { mapIter, sampleByTime } from './iterator'
import type { DanmakuStyle } from './parser'
import { transformComment, filterComments } from './parser'

export interface DanmakuFilter {
  type: 'text' | 'regex'
  value: string
  enabled: boolean
}

export interface DanmakuOptions {
  readonly style: DanmakuStyle
  readonly show: boolean
  readonly filters: DanmakuFilter[]
  /**
   * The maximum number of comments to add to the screen per second.
   * -1 means no limit since Infinity is not a valid JSON value.
   */
  readonly limitPerSec: number
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
  limitPerSec: 10,
  style: {
    opacity: 1,
    fontSize: 25,
    fontFamily: 'sans-serif',
  },
  offset: 0,
}

const BASE_SPEED = 144

export class DanmakuManager {
  instance?: Danmaku
  container?: HTMLElement
  media?: HTMLMediaElement
  comments: CommentEntity[] = []
  config: DanmakuOptions = configDefaults
  created = false

  create(
    container: HTMLElement,
    media: HTMLMediaElement,
    comments: CommentEntity[],
    config?: Partial<DanmakuOptions>
  ): void {
    if (this.created) this.destroy()

    this.container = container
    this.media = media
    this.comments = comments
    this.config = this.#mergeConfig(config)

    const filteredComments = filterComments(comments, this.config.filters)
    const commentGenerator = mapIter(filteredComments, (comment) =>
      transformComment(comment, this.config.style, this.config.offset)
    )
    const sampledGenerator = sampleByTime(
      // TODO: sort should be done upstream
      Array.from(commentGenerator)
        .toSorted((a, b) => a.time - b.time)
        .values(),
      this.config.limitPerSec === -1 ? Infinity : this.config.limitPerSec,
      (item) => item.time
    )

    this.instance = new Danmaku({
      container: this.container,
      media: this.media,
      comments: Array.from(sampledGenerator),
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
    this.config = this.#mergeConfig(config)

    // If already created, recreate the instance
    if (this.created) {
      this.create(this.container!, this.media!, this.comments, this.config)
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
