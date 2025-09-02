import type { CommentEntity } from '@danmaku-anywhere/danmaku-converter'
import { Logger } from '@/common/Logger'
import { computeDensityBins } from '@/content/player/densityPlot/computeDensityBins'
import { DanmakuDensityChart } from '@/content/player/densityPlot/DanmakuDensityChart'
import type { DensityPoint } from '@/content/player/densityPlot/types'
import type { VideoEventService } from '@/content/player/monitors/VideoEvent.service'

const logger = Logger.sub('[DanmakuDensityService]')

export class DanmakuDensityService {
  private comments: CommentEntity[] = []
  private currentVideo: HTMLVideoElement | null = null

  private chart: DanmakuDensityChart

  private data: DensityPoint[] = []
  private binSizeSec = 30
  private chartHeight = 28

  private readonly boundHandleTimeUpdate: (event: Event) => void
  private readonly boundHandleSeeked: () => void

  constructor(
    private readonly videoEventService: VideoEventService,
    private readonly wrapper: HTMLElement
  ) {
    this.boundHandleTimeUpdate = this.handleTimeUpdate.bind(this)
    this.boundHandleSeeked = this.handleSeeked.bind(this)
    this.chart = new DanmakuDensityChart(this.wrapper, {
      height: this.chartHeight,
      colors: {
        unplayed: 'rgba(255,255,255,0.25)',
        played: 'rgba(255,255,255,0.6)',
      },
    })
  }

  enable() {
    logger.debug('Enabling density plot')
    this.setupEventListeners()
    this.chart.setup()
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
    this.chart.updateData(this.data, duration)
    this.chart.updateProgress(active.currentTime)
  }

  private handleSeeked() {
    if (!this.currentVideo) return
    this.chart.updateProgress(this.currentVideo.currentTime)
  }

  private handleTimeUpdate(event: Event) {
    this.currentVideo = event.target as HTMLVideoElement
    if (this.data.length === 0) {
      this.tryComputeAndRender()
    } else {
      this.chart.updateProgress(this.currentVideo.currentTime)
    }
  }

  private cleanup() {
    this.removeEventListeners()
    this.chart.teardown()
  }
}
