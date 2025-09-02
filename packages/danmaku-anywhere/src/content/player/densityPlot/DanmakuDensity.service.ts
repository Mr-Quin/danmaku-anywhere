import type { CommentEntity } from '@danmaku-anywhere/danmaku-converter'
import { Logger } from '@/common/Logger'
import { buildDensityAreaPath } from '@/content/player/densityPlot/buildDensityAreaPath'
import { computeDensityBins } from '@/content/player/densityPlot/computeDensityBins'
import type { DensityPoint } from '@/content/player/densityPlot/types'
import type { VideoEventService } from '@/content/player/monitors/VideoEvent.service'

const logger = Logger.sub('[DanmakuDensityService]')

export class DanmakuDensityService {
  private comments: CommentEntity[] = []
  private currentVideo: HTMLVideoElement | null = null

  private svg: SVGSVGElement | null = null
  private pathUnplayed: Element | null = null
  private pathPlayed: Element | null = null
  private clipRect: Element | null = null
  private clipId = `danmaku-density-clip-${Math.random().toString(36).slice(2)}`

  private data: DensityPoint[] = []
  private binSizeSec = 30
  private chartHeight = 28

  private readonly boundHandleTimeUpdate: (event: Event) => void
  private readonly boundHandleSeeked: () => void
  private readonly boundHandleResize: () => void

  constructor(
    private readonly videoEventService: VideoEventService,
    private readonly wrapper: HTMLElement
  ) {
    this.boundHandleTimeUpdate = this.handleTimeUpdate.bind(this)
    this.boundHandleSeeked = this.updateClipWidth.bind(this)
    this.boundHandleResize = this.redraw.bind(this)
  }

  enable() {
    logger.debug('Enabling density plot')
    this.setupEventListeners()
    this.mountSvg()
    this.tryComputeAndRender()
  }

  disable() {
    logger.debug('Disabling density plot')
    this.cleanup()
  }

  setComments(comments: CommentEntity[]) {
    this.comments = comments
    this.tryComputeAndRender()
  }

  clear() {
    this.comments = []
    this.data = []
    this.teardownSvg()
  }

  private setupEventListeners() {
    this.videoEventService.addVideoEventListener(
      'timeupdate',
      this.boundHandleTimeUpdate
    )
    this.videoEventService.addVideoEventListener(
      'seeked',
      this.boundHandleSeeked
    )
    this.videoEventService.addVideoEventListener(
      'loadedmetadata',
      this.boundHandleTimeUpdate
    )
    window.addEventListener('resize', this.boundHandleResize)
  }

  private removeEventListeners() {
    this.videoEventService.removeVideoEventListener(
      'timeupdate',
      this.boundHandleTimeUpdate
    )
    this.videoEventService.removeVideoEventListener(
      'seeked',
      this.boundHandleSeeked
    )
    this.videoEventService.removeVideoEventListener(
      'loadedmetadata',
      this.boundHandleTimeUpdate
    )
    window.removeEventListener('resize', this.boundHandleResize)
  }

  private mountSvg() {
    if (this.svg) {
      return
    }
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('width', '100%')
    svg.setAttribute('height', `${this.chartHeight}`)
    svg.style.position = 'absolute'
    svg.style.left = '0'
    svg.style.bottom = '0'
    svg.style.pointerEvents = 'none'
    svg.style.zIndex = '2147483647'

    const defs = document.createElementNS(svg.namespaceURI, 'defs')
    const clip = document.createElementNS(svg.namespaceURI, 'clipPath')
    clip.setAttribute('id', this.clipId)
    const clipRect = document.createElementNS(svg.namespaceURI, 'rect')
    clipRect.setAttribute('x', '0')
    clipRect.setAttribute('y', '0')
    clipRect.setAttribute('width', '0')
    clipRect.setAttribute('height', `${this.chartHeight}`)
    clip.appendChild(clipRect)
    defs.appendChild(clip)

    const pathUnplayed = document.createElementNS(svg.namespaceURI, 'path')
    pathUnplayed.setAttribute('fill', 'rgba(255,255,255,0.25)')

    const pathPlayed = document.createElementNS(svg.namespaceURI, 'path')
    pathPlayed.setAttribute('fill', 'rgba(255,255,255,0.6)')
    pathPlayed.setAttribute('clip-path', `url(#${this.clipId})`)

    svg.appendChild(defs)
    svg.appendChild(pathUnplayed)
    svg.appendChild(pathPlayed)

    this.wrapper.appendChild(svg)

    this.svg = svg
    this.pathUnplayed = pathUnplayed
    this.pathPlayed = pathPlayed
    this.clipRect = clipRect
  }

  private teardownSvg() {
    if (this.svg) {
      this.svg.remove()
    }
    this.svg = null
    this.pathUnplayed = null
    this.pathPlayed = null
    this.clipRect = null
  }

  private computeBins(duration: number) {
    console.debug('computeBins')
    this.data = computeDensityBins(this.comments, duration, this.binSizeSec)
  }

  private tryComputeAndRender() {
    // Defer until we have video duration
    const active = this.currentVideo
    const duration = active?.duration ?? Number.NaN
    console.debug('tryComputeAndRender')
    if (!active || !Number.isFinite(duration) || duration <= 0) {
      return
    }
    // Ensure we know the active video for clip updates
    this.currentVideo = active

    this.computeBins(duration)
    this.redraw()
  }

  private getSvgSize(): { width: number; height: number } {
    if (!this.svg) return { width: 0, height: 0 }
    const width = this.svg.clientWidth || this.wrapper.clientWidth
    return { width, height: this.chartHeight }
  }

  private buildAreaPath(): string {
    if (!this.svg || this.data.length === 0 || !this.currentVideo) return ''
    const { width, height } = this.getSvgSize()
    const duration = this.currentVideo.duration
    return buildDensityAreaPath(this.data, width, height, duration)
  }

  private redraw() {
    console.debug('redraw')
    if (!this.svg || !this.currentVideo) {
      return
    }
    if (this.data.length === 0) {
      return
    }

    // Update clip rect height/width baseline
    this.clipRect?.setAttribute('height', `${this.chartHeight}`)

    const d = this.buildAreaPath()
    if (d) {
      this.pathUnplayed?.setAttribute('d', d)
      this.pathPlayed?.setAttribute('d', d)
      this.updateClipWidth()
    }
  }

  private updateClipWidth() {
    if (!this.svg || !this.currentVideo || !this.clipRect) {
      return
    }
    const { width } = this.getSvgSize()
    const duration = this.currentVideo.duration
    if (!Number.isFinite(duration) || duration <= 0) return
    const playedRatio = Math.min(
      1,
      Math.max(0, this.currentVideo.currentTime / duration)
    )
    const clipWidth = Math.round(width * playedRatio)
    this.clipRect.setAttribute('width', `${clipWidth}`)
  }

  private handleTimeUpdate(event: Event) {
    this.currentVideo = event.target as HTMLVideoElement
    if (this.data.length === 0) {
      this.tryComputeAndRender()
    } else {
      this.updateClipWidth()
    }
  }

  private cleanup() {
    this.removeEventListeners()
    this.teardownSvg()
  }
}
