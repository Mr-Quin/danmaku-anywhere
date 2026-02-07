import type { CommentEntity } from '@danmaku-anywhere/danmaku-converter'
import { create, type Manager } from '@mr-quin/danmu'
import { mapIter, sampleByTime } from './iterator'
import { type DanmakuOptions, DEFAULT_DANMAKU_OPTIONS } from './options'
import { applyFilter, type ParsedComment, transformComment } from './parser'
import { bindVideo } from './plugins/bindVideo'
import { deepEqual } from './utils'

export type DanmakuRenderProps = {
  text: string
  styles: Record<string, string>
  mode: ParsedComment['mode']
  color: string
  gradient?: ParsedComment['gradient']
}

export class DanmakuRenderer {
  manager?: Manager<ParsedComment>
  container?: HTMLElement
  media?: HTMLMediaElement
  comments: CommentEntity[] = []
  config: DanmakuOptions = DEFAULT_DANMAKU_OPTIONS
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
      Number.POSITIVE_INFINITY,
      (item) => item.time
    )

    const parsedComments = Array.from(sampledGenerator)

    const manager = create<ParsedComment>({
      trackHeight: this.config.trackHeight,
      rate: this.config.speed / 2,
      interval: this.config.interval,
      durationRange: [5000, 5000],
      mode: 'strict',
      distribution: this.config.distribution,
      overlap: this.config.overlap / 100,
      limits: {
        view: this.config.maxOnScreen,
        stash: this.config.maxOnScreen * 2,
      },
      plugin: {
        init: bindVideo(this.media, parsedComments, () => this.config),
        $createNode: (danmaku, node) => {
          // font size and family are set here because it needs to be set BEFORE
          // size is calculated
          // Setting it using manager.setStyle applies the style AFTER size is calculated so it's too late
          node.style.fontSize = `${this.config.style.fontSize}px`
          node.style.fontFamily = this.config.style.fontFamily

          // apply the parser-generated styles
          Object.entries(danmaku.data.style).forEach(([key, value]) => {
            // biome-ignore lint/suspicious/noExplicitAny: key should be a valid css property
            node.style[key as any] = value
          })

          // force top/bottom comments to be on top
          if (danmaku.data.mode === 'top' || danmaku.data.mode === 'bottom') {
            node.style.zIndex = '9'
          }

          this.render(node, {
            text: danmaku.data.text,
            styles: { ...danmaku.data.style },
            mode: danmaku.data.mode,
            color: danmaku.data.color,
            gradient: danmaku.data.gradient,
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
      limits: {
        view: this.config.maxOnScreen,
        stash: this.config.maxOnScreen * 2,
      },
      rate: this.config.speed / 2,
      interval: this.config.interval,
      overlap: this.config.overlap / 100,
    })
    this.manager.setStyle('opacity', this.config.style.opacity.toString())
    this.manager.setStyle('pointerEvents', 'none')
    this.manager.setStyle('fontSize', `${this.config.style.fontSize}px`)
    this.manager.setStyle('fontFamily', this.config.style.fontFamily)
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
    if (!this.manager) return
    this.manager.format()
    if (!this.manager.isFreeze()) {
      // Freezing and unfreezing the manager to force danmaku position to be recalculated
      this.manager.freeze()
      this.manager.unfreeze()
    }
  }
}
