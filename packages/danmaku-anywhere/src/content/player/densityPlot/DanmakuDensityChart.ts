import * as d3 from 'd3'
import { buildDensityAreaPath } from '@/content/player/densityPlot/buildDensityAreaPath'
import type { DensityPoint } from '@/content/player/densityPlot/types'

export interface DanmakuDensityChartOptions {
  height?: number
  colors?: {
    unplayed?: string
    played?: string
  }
  opacity?: number
}

export class DanmakuDensityChart {
  private readonly wrapper: HTMLElement
  private readonly clipId =
    `danmaku-density-clip-${Math.random().toString(36).slice(2)}`

  private options: {
    height: number
    colors: { unplayed: string; played: string }
    opacity: number
  }

  private svg: d3.Selection<SVGSVGElement, unknown, null, undefined> | null =
    null
  private pathUnplayed: d3.Selection<
    SVGPathElement,
    unknown,
    null,
    undefined
  > | null = null
  private pathPlayed: d3.Selection<
    SVGPathElement,
    unknown,
    null,
    undefined
  > | null = null
  private clipRect: d3.Selection<
    SVGRectElement,
    unknown,
    null,
    undefined
  > | null = null

  private data: DensityPoint[] = []
  private duration = 0
  private lastCurrentTime = 0

  private readonly boundResize: () => void
  private resizeObserver: ResizeObserver | null = null
  private videoElement: HTMLVideoElement | null = null

  constructor(wrapper: HTMLElement, options: DanmakuDensityChartOptions = {}) {
    this.wrapper = wrapper
    this.options = {
      height: options.height ?? 28,
      colors: {
        unplayed: options.colors?.unplayed ?? 'rgba(255,255,255,0.25)',
        played: options.colors?.played ?? 'rgba(255,255,255,0.6)',
      },
      opacity: options.opacity ?? 1,
    }
    this.boundResize = this.redraw.bind(this)
  }

  setup() {
    if (this.svg) {
      return
    }

    const svg = d3
      .select(this.wrapper)
      .append('svg')
      .classed('da-density-chart', true)
      .attr('width', '100%')
      .attr('height', this.options.height)
      .attr('opacity', this.options.opacity)

    const defs = svg.append('defs')
    const clip = defs.append('clipPath').attr('id', this.clipId)
    const clipRect = clip
      .append('rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', 0)
      .attr('height', this.options.height)

    const pathUnplayed = svg
      .append('path')
      .attr('fill', this.options.colors.unplayed)

    const pathPlayed = svg
      .append('path')
      .attr('fill', this.options.colors.played)
      .attr('clip-path', `url(#${this.clipId})`)

    this.svg = svg
    this.pathUnplayed = pathUnplayed
    this.pathPlayed = pathPlayed
    this.clipRect = clipRect

    window.addEventListener('resize', this.boundResize)
    this.setupVideoResizeObserver()
  }

  teardown() {
    window.removeEventListener('resize', this.boundResize)
    this.cleanupVideoResizeObserver()
    this.svg?.remove()
    this.svg = null
    this.pathUnplayed = null
    this.pathPlayed = null
    this.clipRect = null
  }

  setOptions(options: DanmakuDensityChartOptions) {
    const next = {
      height: options.height ?? this.options.height,
      colors: {
        unplayed: options.colors?.unplayed ?? this.options.colors.unplayed,
        played: options.colors?.played ?? this.options.colors.played,
      },
      opacity: options.opacity ?? this.options.opacity,
    }
    const heightChanged = next.height !== this.options.height
    const colorsChanged =
      next.colors.unplayed !== this.options.colors.unplayed ||
      next.colors.played !== this.options.colors.played
    const opacityChanged = next.opacity !== this.options.opacity

    this.options = next

    if (this.svg && heightChanged) {
      this.svg.attr('height', this.options.height)
      this.clipRect?.attr('height', this.options.height)
      this.redraw()
    }
    if (colorsChanged) {
      if (this.pathUnplayed)
        this.pathUnplayed.attr('fill', this.options.colors.unplayed)
      if (this.pathPlayed)
        this.pathPlayed.attr('fill', this.options.colors.played)
    }
    if (this.svg && opacityChanged) {
      this.svg.attr('opacity', this.options.opacity)
    }
  }

  updateData(data: DensityPoint[], duration: number) {
    this.data = data
    this.duration = duration
    this.redraw()
  }

  updateProgress(currentTime: number) {
    this.lastCurrentTime = currentTime
    if (
      !this.svg ||
      !this.clipRect ||
      !Number.isFinite(this.duration) ||
      this.duration <= 0
    ) {
      return
    }
    const { width } = this.getSvgSize()
    const playedRatio = Math.min(1, Math.max(0, currentTime / this.duration))
    const clipWidth = Math.round(width * playedRatio)
    this.clipRect.attr('width', clipWidth)
  }

  show() {
    this.svg?.classed('da-density-chart-visible', true)
  }

  hide() {
    this.svg?.classed('da-density-chart-visible', false)
  }

  setVideoElement(videoElement: HTMLVideoElement | null) {
    this.cleanupVideoResizeObserver()
    this.videoElement = videoElement
    if (this.videoElement) {
      this.setupVideoResizeObserver()
    }
  }

  private getSvgSize(): { width: number; height: number } {
    const width =
      (this.svg?.node() as SVGSVGElement | null)?.clientWidth ||
      this.wrapper.clientWidth

    return { width, height: this.options.height }
  }

  private redraw() {
    if (!this.svg) {
      return
    }

    this.svg.attr('height', this.options.height)
    this.clipRect?.attr('height', this.options.height)

    if (!this.pathUnplayed || !this.pathPlayed) {
      return
    }

    const { width } = this.getSvgSize()

    const d = buildDensityAreaPath(
      this.data,
      width,
      this.options.height,
      this.duration
    )

    this.pathUnplayed.attr('d', d)
    this.pathPlayed.attr('d', d)

    this.updateProgress(this.lastCurrentTime)
  }

  private setupVideoResizeObserver() {
    if (!this.videoElement || this.resizeObserver) {
      return
    }

    this.resizeObserver = new ResizeObserver(() => {
      this.redraw()
    })
    this.resizeObserver.observe(this.videoElement)
  }

  private cleanupVideoResizeObserver() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect()
      this.resizeObserver = null
    }
  }
}
