import * as d3 from 'd3'
import { buildDensityAreaPath } from '@/content/player/densityPlot/buildDensityAreaPath'
import type { DensityPoint } from '@/content/player/densityPlot/types'

export interface DanmakuDensityChartOptions {
  height?: number
  colors?: {
    unplayed?: string
    played?: string
  }
}

export class DanmakuDensityChart {
  private readonly wrapper: HTMLElement
  private readonly clipId =
    `danmaku-density-clip-${Math.random().toString(36).slice(2)}`

  private height: number
  private colors: Required<NonNullable<DanmakuDensityChartOptions['colors']>>

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

  constructor(wrapper: HTMLElement, options: DanmakuDensityChartOptions = {}) {
    this.wrapper = wrapper
    this.height = options.height ?? 28
    this.colors = {
      unplayed: options.colors?.unplayed ?? 'rgba(255,255,255,0.25)',
      played: options.colors?.played ?? 'rgba(255,255,255,0.6)',
    }
    this.boundResize = this.redraw.bind(this)
  }

  setup() {
    if (this.svg) return

    const svg = d3
      .select(this.wrapper)
      .append('svg')
      .attr('width', '100%')
      .attr('height', this.height)
      .style('position', 'absolute')
      .style('left', '0')
      .style('bottom', '0')
      .style('pointer-events', 'none')
      .style('z-index', '2147483647')

    const defs = svg.append('defs')
    const clip = defs.append('clipPath').attr('id', this.clipId)
    const clipRect = clip
      .append('rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', 0)
      .attr('height', this.height)

    const pathUnplayed = svg.append('path').attr('fill', this.colors.unplayed)

    const pathPlayed = svg
      .append('path')
      .attr('fill', this.colors.played)
      .attr('clip-path', `url(#${this.clipId})`)

    this.svg = svg
    this.pathUnplayed = pathUnplayed
    this.pathPlayed = pathPlayed
    this.clipRect = clipRect

    window.addEventListener('resize', this.boundResize)
  }

  teardown() {
    window.removeEventListener('resize', this.boundResize)
    this.svg?.remove()
    this.svg = null
    this.pathUnplayed = null
    this.pathPlayed = null
    this.clipRect = null
  }

  setColors(
    colors: Partial<NonNullable<DanmakuDensityChartOptions['colors']>>
  ) {
    this.colors = {
      unplayed: colors.unplayed ?? this.colors.unplayed,
      played: colors.played ?? this.colors.played,
    }
    if (this.pathUnplayed) this.pathUnplayed.attr('fill', this.colors.unplayed)
    if (this.pathPlayed) this.pathPlayed.attr('fill', this.colors.played)
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

  private getSvgSize(): { width: number; height: number } {
    const width =
      (this.svg?.node() as SVGSVGElement | null)?.clientWidth ||
      this.wrapper.clientWidth
    return { width, height: this.height }
  }

  private redraw() {
    if (!this.svg) return

    // Ensure height up-to-date
    this.svg.attr('height', this.height)
    this.clipRect?.attr('height', this.height)

    if (!this.pathUnplayed || !this.pathPlayed) return

    const { width } = this.getSvgSize()
    const d = buildDensityAreaPath(this.data, width, this.height, this.duration)

    this.pathUnplayed.attr('d', d)
    this.pathPlayed.attr('d', d)

    // Re-apply progress clip after redraw
    this.updateProgress(this.lastCurrentTime)
  }
}
