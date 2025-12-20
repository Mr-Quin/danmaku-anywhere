import type { CommentEntity } from '@danmaku-anywhere/danmaku-converter'
import { debounce } from '@mui/material'
import { inject, injectable } from 'inversify'
import { Logger } from '@/common/Logger'
import { DanmakuLayoutService } from '@/content/player/danmakuLayout/DanmakuLayout.service'
import { computeDensityBins } from '@/content/player/densityPlot/computeDensityBins'
import { DanmakuDensityChart } from '@/content/player/densityPlot/DanmakuDensityChart'
import type { DensityPoint } from '@/content/player/densityPlot/types'
import { VideoEventService } from '@/content/player/videoEvent/VideoEvent.service'

const logger = Logger.sub('[DanmakuDensityService]')

@injectable('Singleton')
export class DanmakuDensityService {
  private comments: CommentEntity[] = []
  private currentVideo: HTMLVideoElement | null = null

  private chart: DanmakuDensityChart
  private enabled = false

  private data: DensityPoint[] = []
  private binSizeSec = 10
  private chartHeight = 28

  private showChartTimeout: ReturnType<typeof setTimeout> | null = null
  private resizeObserver: ResizeObserver | null = null

  private readonly boundHandleTimeUpdate: (event: Event) => void
  private readonly boundHandleSeeked: () => void
  private readonly boundHandleMouseMove: (event: MouseEvent) => void
  private readonly boundHandleResize: () => void

  constructor(
    @inject(VideoEventService)
    private readonly videoEventService: VideoEventService,
    @inject(DanmakuLayoutService)
    private readonly layoutService: DanmakuLayoutService
  ) {
    this.boundHandleTimeUpdate = this.handleTimeUpdate.bind(this)
    this.boundHandleSeeked = this.handleSeeked.bind(this)
    this.boundHandleMouseMove = this.handleMouseMove.bind(this)
    this.boundHandleResize = debounce(this.handleResize.bind(this), 100)
    this.chart = new DanmakuDensityChart(this.layoutService.wrapper, {
      height: this.chartHeight,
      colors: {
        unplayed: 'rgba(255,255,255,0.25)',
        played: 'rgba(255, 255, 255, 0.45)',
      },
    })
  }

  enable() {
    if (this.enabled) {
      return
    }
    this.enabled = true
    logger.debug('Enabling density plot')
    this.chart.setup()
    this.tryComputeAndRender()
    this.setupEventListeners()
  }

  disable() {
    if (!this.enabled) {
      return
    }
    this.enabled = false
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
    this.chart.updateData([], 0)
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
    document.addEventListener('mousemove', this.boundHandleMouseMove)

    // Set up video resize observation
    const videoElement = this.videoEventService.getVideoElement()
    if (videoElement) {
      this.setupVideoResizeObserver(videoElement)
    }
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
    document.removeEventListener('mousemove', this.boundHandleMouseMove)
    this.cleanupVideoResizeObserver()
  }

  private computeBins(duration: number) {
    this.data = computeDensityBins(this.comments, duration, this.binSizeSec)
  }

  private tryComputeAndRender() {
    const active = this.currentVideo
    const duration = active?.duration ?? Number.NaN
    if (!active || !Number.isFinite(duration) || duration <= 0) {
      return
    }

    this.computeBins(duration)
    this.chart.updateData(this.data, duration)
    this.chart.updateProgress(active.currentTime)
  }

  private handleSeeked() {
    if (!this.currentVideo) return
    this.chart.updateProgress(this.currentVideo.currentTime)
  }

  private handleTimeUpdate(event: Event) {
    const newVideo = event.target as HTMLVideoElement
    if (this.currentVideo !== newVideo) {
      this.currentVideo = newVideo
      this.setupVideoResizeObserver(newVideo)
    }
    if (this.data.length === 0) {
      this.tryComputeAndRender()
    } else {
      this.chart.updateProgress(this.currentVideo.currentTime)
    }
  }

  private handleMouseMove(event: MouseEvent) {
    const videoElement = this.videoEventService.getVideoElement()
    if (!(event.target instanceof Element) || !videoElement) {
      return
    }
    if (
      !videoElement.isEqualNode(event.target) &&
      !event.target.contains(videoElement) &&
      !videoElement.contains(event.target)
    ) {
      return
    }
    this.chart.show()
    if (this.showChartTimeout) {
      clearTimeout(this.showChartTimeout)
    }
    this.showChartTimeout = setTimeout(() => {
      this.chart.hide()
    }, 2000)
  }

  private setupVideoResizeObserver(videoElement: HTMLVideoElement) {
    this.cleanupVideoResizeObserver()

    this.resizeObserver = new ResizeObserver(this.boundHandleResize)
    this.resizeObserver.observe(videoElement)
  }

  private cleanupVideoResizeObserver() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect()
      this.resizeObserver = null
    }
  }

  private handleResize() {
    this.chart.redraw()
  }

  private cleanup() {
    this.removeEventListeners()
    this.chart.teardown()
  }
}
