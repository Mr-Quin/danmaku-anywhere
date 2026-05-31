import type { CommentEntity } from '@danmaku-anywhere/danmaku-converter'
import { create, type Manager } from '@mr-quin/danmu'
import { compile, createGroupStore } from './collapse/compile'
import type {
  BumpEvent,
  CollapseAnnotation,
  CompileResult,
  Decision,
  GroupStore,
} from './collapse/types'
import { mapIter, sampleByTime } from './iterator'
import { type DanmakuOptions, DEFAULT_DANMAKU_OPTIONS } from './options'
import { type ParsedComment, transformComment } from './parser'
import { type BindContext, bindVideo } from './plugins/bindVideo'
import { deepEqual } from './utils'

export const STAGE_DURATION_MS = 5000

/** In-place array replacement that avoids `push(...src)`'s arg-count overflow on large arrays. */
function replaceInPlace<T>(target: T[], source: readonly T[]) {
  target.length = source.length
  for (let i = 0; i < source.length; i++) target[i] = source[i]
}

export type DanmakuRenderProps = {
  text: string
  styles: Record<string, string>
  mode: ParsedComment['mode']
  color: string
  gradient?: ParsedComment['gradient']
  collapse?: CollapseAnnotation
}

export class DanmakuRenderer {
  manager?: Manager<ParsedComment>
  container?: HTMLElement
  media?: HTMLMediaElement
  comments: CommentEntity[] = []
  config: DanmakuOptions = DEFAULT_DANMAKU_OPTIONS
  created = false
  private occlusionMaskUrl?: string

  private parsedComments: ParsedComment[] = []
  private decisions: Decision[] = []
  private bumpEvents: BumpEvent[] = []
  private bumpsByHead = new Map<number, BumpEvent[]>()
  private heads: number[] = []
  private headStores = new Map<number, GroupStore>()

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
    this.parsedComments = Array.from(sampledGenerator)
    this.runCompile()

    this.bindCtx = {
      decisions: this.decisions,
      bumpEvents: this.bumpEvents,
      bumpsByHead: this.bumpsByHead,
      heads: this.heads,
      onHeadEmit: (headIndex) => this.createHeadAnnotation(headIndex),
      onSetCount: (headIndex, count) =>
        this.headStores.get(headIndex)?.setCount(count),
    }

    const manager = create<ParsedComment>({
      trackHeight: this.config.trackHeight,
      rate: this.config.speed / 2,
      interval: this.config.interval,
      durationRange: [STAGE_DURATION_MS, STAGE_DURATION_MS],
      mode: 'strict',
      distribution: this.config.distribution,
      overlap: this.config.overlap / 100,
      limits: {
        view: this.config.maxOnScreen,
        stash: this.config.maxOnScreen * 2,
      },
      plugin: {
        init: bindVideo(
          this.media,
          this.parsedComments,
          () => this.config,
          this.bindCtx
        ),
        $createNode: (danmaku, node) => {
          // Font size + family must be set before the lib measures the node.
          node.style.fontSize = `${this.config.style.fontSize}px`
          node.style.fontFamily = this.config.style.fontFamily

          Object.entries(danmaku.data.style).forEach(([key, value]) => {
            // biome-ignore lint/suspicious/noExplicitAny: key is a CSS property
            node.style[key as any] = value
          })

          if (danmaku.data.collapse) {
            // Pills win the layering contest over regular top/bottom danmaku.
            node.style.zIndex = '10'
          } else if (
            danmaku.data.mode === 'top' ||
            danmaku.data.mode === 'bottom'
          ) {
            node.style.zIndex = '9'
          }

          this.render(node, {
            text: danmaku.data.text,
            styles: { ...danmaku.data.style },
            mode: danmaku.data.mode,
            color: danmaku.data.color,
            gradient: danmaku.data.gradient,
            collapse: danmaku.data.collapse,
          })
        },
      },
    })
    this.manager = manager

    manager.mount(container)
    this.setArea()
    this.updateOptions()

    // A recreate builds a fresh manager; reapply the last occlusion mask so it
    // survives the swap (the live loop only re-pushes on the next frame, which
    // never comes while paused).
    if (this.occlusionMaskUrl) {
      manager.updateOccludedUrl(this.occlusionMaskUrl)
    }

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

    const collapseChanged = !deepEqual(
      prevConfig.collapse,
      this.config.collapse
    )
    const filtersChanged = !deepEqual(prevConfig.filters, this.config.filters)
    const speedChanged = prevConfig.speed !== this.config.speed

    if (collapseChanged || filtersChanged || speedChanged) {
      this.runCompile()
    }
    if (!deepEqual(prevConfig.area, this.config.area)) {
      this.setArea()
    }
    this.updateOptions()
  }

  private bindCtx?: BindContext

  private runCompile(): void {
    const stageDurationSec =
      STAGE_DURATION_MS / 1000 / Math.max(this.config.speed, 0.1)
    const result: CompileResult = compile(this.parsedComments, {
      filters: this.config.filters,
      collapse: this.config.collapse,
      stageDurationSec,
    })
    replaceInPlace(this.decisions, result.decisions)
    replaceInPlace(this.bumpEvents, result.bumpEvents)
    replaceInPlace(this.heads, result.heads)
    this.bumpsByHead.clear()
    for (const [headIndex, bumps] of result.bumpsByHead) {
      this.bumpsByHead.set(headIndex, bumps)
    }
    this.bindCtx?.resyncBumps?.()
  }

  private createHeadAnnotation(headIndex: number): CollapseAnnotation | null {
    const d = this.decisions[headIndex]
    if (!d || d.kind !== 'head') return null
    const store = createGroupStore()
    this.headStores.set(headIndex, store)
    return { label: d.label, pulse: d.pulse, store, headIndex }
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
    const style = { ...this.config.style, ...config.style }
    const collapse = config.collapse
      ? { ...this.config.collapse, ...config.collapse }
      : this.config.collapse
    return { ...this.config, ...config, style, collapse }
  }

  destroy(): void {
    this.manager?.stopPlaying()
    this.manager?.unmount()
    this.headStores.clear()
    this.manager = undefined
    this.container = undefined
    this.media = undefined
    this.comments = []
    this.parsedComments = []
    this.decisions = []
    this.bumpEvents = []
    this.bumpsByHead.clear()
    this.heads = []
    this.created = false
  }

  show(): void {
    this.manager?.show()
  }

  hide(): void {
    this.manager?.hide()
  }

  clear(): void {
    this.manager?.clear()
    this.headStores.clear()
  }

  resize(): void {
    if (!this.manager) return
    this.manager.format()
    if (!this.manager.isFreeze()) {
      this.manager.freeze()
      this.manager.unfreeze()
    }
  }

  setOcclusionMaskUrl(url?: string): void {
    this.occlusionMaskUrl = url
    this.manager?.updateOccludedUrl(url ?? undefined)
  }
}
