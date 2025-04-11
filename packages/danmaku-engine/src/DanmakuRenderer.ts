import type { CommentEntity } from '@danmaku-anywhere/danmaku-converter'
import { Manager, create } from 'danmu'
import { bindVideo } from './bindVideo'
import { mapIter, sampleByTime } from './iterator'
import { ParsedComment, applyFilter, transformComment } from './parser'

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

const getStyle = (style: DanmakuStyle) => {
  return {
    opacity: style.opacity.toString(),
    fontSize: `${style.fontSize}px`,
    fontFamily: style.fontFamily,
  }
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
    this.config = this.#mergeConfig(config)

    const commentGenerator = mapIter(comments, (comment) =>
      transformComment(comment, this.config.offset)
    )

    const sampledGenerator = sampleByTime(
      // TODO: sort should be done upstream
      Array.from(commentGenerator)
        .toSorted((a, b) => a.time - b.time)
        .values(),
      this.config.limitPerSec === -1 ? Infinity : this.config.limitPerSec,
      (item) => item.time
    )

    const parsedComments = Array.from(sampledGenerator)

    const manager = create<ParsedComment>({
      trackHeight: 40,
      durationRange: [5000, 5000],
      rate: 0.5,
      mode: 'adaptive',
      plugin: {
        init: bindVideo(this.media, parsedComments),
        $createNode: (danmaku, node) => {
          this.render(node, {
            text: danmaku.data.text,
            styles: { ...getStyle(this.config.style), ...danmaku.data.style },
            mode: danmaku.data.mode,
          })
        },
        willRender: (ref) => {
          if (applyFilter(ref.danmaku.data.text, this.config.filters)) {
            ref.prevent = true
          }
          return ref
        },
      },
    })

    this.manager = manager

    manager.mount(container)

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
    this.config = this.#mergeConfig(config)

    if (
      !Object.is(this.config.offset, prevConfig.offset) ||
      !Object.is(this.config.limitPerSec, prevConfig.limitPerSec)
    ) {
      // Recreate if offset changed
      if (this.created) {
        this.create(this.container!, this.media!, this.comments, this.config)
      }
    }
  }

  #mergeConfig = (config?: Partial<DanmakuOptions>): DanmakuOptions => {
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
