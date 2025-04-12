import type { CommentEntity } from '@danmaku-anywhere/danmaku-converter'
import { Manager, create } from 'danmu'
import { mapIter, sampleByTime } from './iterator'
import { ParsedComment, applyFilter, transformComment } from './parser'
import { bindVideo } from './plugins/bindVideo'
import { deepEqual } from './utils'

export interface DanmakuFilter {
  type: 'text' | 'regex'
  value: string
  enabled: boolean
}

export interface DanmakuStyle {
  opacity: number
  fontSize: number
  fontFamily: string
}

export type FixedCommentMode = 'normal' | 'hidden' | 'scroll'

export interface DanmakuOptions {
  readonly style: DanmakuStyle
  readonly show: boolean
  readonly trackHeight: number
  readonly allowOverlap: boolean
  readonly filters: DanmakuFilter[]
  /**
   * The maximum number of comments to show on the screen at the same time
   */
  readonly maxOnScreen: number
  readonly speed: number
  /**
   * The area to show the comments in percentage
   */
  readonly area: {
    yStart: number
    yEnd: number
    xStart: number
    xEnd: number
  }
  /**
   * The maximum number of tracks
   * -1 means no limit
   */
  readonly trackLimit: number
  /**
   * The offset in milliseconds to adjust the time of the comments
   */
  readonly offset: number
  /**
   * How to handle special comments
   */
  readonly specialComments: {
    top: FixedCommentMode
    bottom: FixedCommentMode
  }
}

const configDefaults: DanmakuOptions = {
  show: true,
  allowOverlap: false,
  trackHeight: 32,
  filters: [],
  speed: 1,
  maxOnScreen: 500,
  trackLimit: -1,
  style: {
    opacity: 1,
    fontSize: 25,
    fontFamily: 'sans-serif',
  },
  area: {
    yStart: 0,
    yEnd: 100,
    xStart: 0,
    xEnd: 100,
  },
  specialComments: {
    top: 'normal',
    bottom: 'scroll',
  },
  offset: 0,
}

export type DanmakuRenderProps = {
  text: string
  styles: Record<string, string>
  mode: ParsedComment['mode']
}

export class DanmakuRenderer {
  manager?: Manager<ParsedComment>
  container?: HTMLElement
  media?: HTMLMediaElement
  comments: CommentEntity[] = []
  config: DanmakuOptions = configDefaults
  created = false

  constructor(
    public render: (node: HTMLElement, renderProps: DanmakuRenderProps) => void
  ) {}

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
    this.config = this.mergeConfig(config)

    const commentGenerator = mapIter(comments, (comment) =>
      transformComment(comment, 0)
    )

    const sampledGenerator = sampleByTime(
      Array.from(commentGenerator)
        .toSorted((a, b) => a.time - b.time)
        .values(),
      Infinity,
      (item) => item.time
    )

    const parsedComments = Array.from(sampledGenerator)

    const manager = create<ParsedComment>({
      trackHeight: this.config.trackHeight,
      rate: this.config.speed / 2,
      durationRange: [5000, 5000],
      mode: this.config.allowOverlap ? 'adaptive' : 'strict',
      limits: {
        view: this.config.maxOnScreen,
        stash: this.config.maxOnScreen * 2,
      },
      plugin: {
        init: bindVideo(this.media, parsedComments, () => this.config),
        $createNode: (danmaku, node) => {
          this.render(node, {
            text: danmaku.data.text,
            styles: { ...danmaku.data.style },
            mode: danmaku.data.mode,
          })
        },
        willRender: (ref) => {
          if (applyFilter(ref.danmaku.data.text, this.config.filters)) {
            ref.prevent = true
          }
          return ref
        },
        $beforeMove: (ref) => {
          // TODO: remove this when the pointerEvents set on the manager is respected
          ref.setStyle('pointerEvents', 'inherit')
        },
        format: () => {
          manager.each((d) => {
            d.updateDuration(5000)
          })
        },
      },
    })
    this.manager = manager

    manager.mount(container)

    this.setArea()
    this.updateOptions()

    if (!this.media.paused) {
      manager.startPlaying()
    }

    if (this.config.show) {
      void manager.show()
    } else {
      void manager.hide()
    }

    this.created = true
  }

  updateConfig(config: Partial<DanmakuOptions>): void {
    const prevConfig = this.config
    this.config = this.mergeConfig(config)

    if (!this.manager) return

    if (!deepEqual(prevConfig.area, this.config.area)) {
      this.setArea()
    }

    this.updateOptions()
  }

  private updateOptions = () => {
    if (!this.manager) return

    this.manager.updateOptions({
      trackHeight: this.config.trackHeight,
      mode: this.config.allowOverlap ? 'adaptive' : 'strict',
      limits: {
        view: this.config.maxOnScreen,
        stash: this.config.maxOnScreen * 2,
      },
      rate: this.config.speed / 2,
    })
    this.manager.setStyle('opacity', this.config.style.opacity.toString())
    this.manager.setStyle('fontSize', `${this.config.style.fontSize}px`)
    this.manager.setStyle('fontFamily', this.config.style.fontFamily)
    this.manager.setStyle('pointerEvents', 'none')
  }

  private setArea = () => {
    if (!this.manager) return

    this.manager.setArea({
      y: {
        start: `${this.config.area.yStart}%`,
        end: `${this.config.area.yEnd}%`,
      },
      x: {
        start: `${this.config.area.xStart}%`,
        end: `${this.config.area.xEnd}%`,
      },
    })
  }

  private mergeConfig = (config?: Partial<DanmakuOptions>): DanmakuOptions => {
    if (!config) return this.config

    // manually merge styles
    const style = { ...this.config.style, ...config.style }
    return { ...this.config, ...config, style }
  }

  destroy(): void {
    this.manager?.stopPlaying()
    this.manager?.unmount()
    this.manager = undefined
    this.container = undefined
    this.media = undefined
    this.comments = []
    this.created = false
  }

  // Pass through methods
  show(): void {
    this.manager?.show()
  }

  hide(): void {
    this.manager?.hide()
  }

  clear(): void {
    this.manager?.clear()
  }

  resize(): void {
    this.manager?.format()
  }
}
