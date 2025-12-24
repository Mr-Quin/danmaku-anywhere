import type { CommentEntity } from '@danmaku-anywhere/danmaku-converter'
import { inject, injectable } from 'inversify'
import { createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { type ILogger, LoggerSymbol } from '@/common/Logger'
import { getTrackingService } from '@/common/telemetry/getTrackingService'
import { SkipButton } from '@/content/player/components/SkipButton/SkipButton'
import { DanmakuLayoutService } from '@/content/player/danmakuLayout/DanmakuLayout.service'
import type { SkipTarget } from '@/content/player/videoSkip/SkipTarget'
import { VideoEventService } from '../videoEvent/VideoEvent.service'
import { parseCommentsForJumpTargets } from './videoSkipParser'

type ActiveButtonEntry = { node: HTMLElement; root: Root }

@injectable('Singleton')
export class VideoSkipService {
  private logger: ILogger

  private jumpTargets: SkipTarget[] = []
  private activeButton: ActiveButtonEntry | null = null
  private currentVideo: HTMLVideoElement | null = null

  private lastChecked = 0

  private readonly boundHandleTimeUpdate: (event: Event) => void
  private readonly boundHandleSeek: () => void

  constructor(
    @inject(VideoEventService)
    private videoEventService: VideoEventService,
    @inject(DanmakuLayoutService)
    private layoutManager: DanmakuLayoutService,
    @inject(LoggerSymbol) logger: ILogger
  ) {
    this.logger = logger.sub('[VideoSkipService]')
    this.boundHandleTimeUpdate = this.handleTimeUpdate.bind(this)
    this.boundHandleSeek = this.handleSeek.bind(this)
  }

  enable() {
    this.logger.debug('Enabling')
    this.setupEventListeners()
  }

  disable() {
    this.logger.debug('Disabling')
    this.cleanup()
  }

  setComments(comments: CommentEntity[]) {
    this.jumpTargets = parseCommentsForJumpTargets(comments)
    this.logger.debug(
      `Parsed ${this.jumpTargets.length} jump targets from ${comments.length} comments`,
      this.jumpTargets
    )
  }

  clear() {
    this.jumpTargets = []
    if (this.activeButton) {
      this.activeButton.root.unmount()
      this.activeButton = null
    }
    this.currentVideo = null
  }

  private setupEventListeners() {
    this.videoEventService.addVideoEventListener(
      'timeupdate',
      this.boundHandleTimeUpdate
    )
    this.videoEventService.addVideoEventListener('seeked', this.boundHandleSeek)
  }

  private removeEventListeners() {
    this.videoEventService.removeVideoEventListener(
      'timeupdate',
      this.boundHandleTimeUpdate
    )
    this.videoEventService.removeVideoEventListener(
      'seeked',
      this.boundHandleSeek
    )
  }

  private handleTimeUpdate(event: Event) {
    const now = Date.now()

    // throttle check to every 2s
    if (now - this.lastChecked < 2000) {
      return
    }

    this.lastChecked = now

    const video = event.target as HTMLVideoElement
    this.currentVideo = video
    const currentTime = video.currentTime

    for (const target of this.jumpTargets) {
      if (!target.shown && target.isInRange(currentTime)) {
        // show the skip button when we are in its range
        this.showSkipButton(target)
      } else if (
        target.shown &&
        this.activeButton !== null &&
        !target.isInRange(currentTime)
      ) {
        // hide the button after the range elapses
        this.removeSkipButton()
      }
    }
  }

  private handleSeek() {
    // reset shown status after seeking
    this.removeSkipButton()
    this.jumpTargets.forEach((target: SkipTarget) => {
      target.shown = false
    })
  }

  private showSkipButton(target: SkipTarget) {
    if (!this.layoutManager.wrapper) return

    this.logger.debug('Creating skip buttons', target)

    const mountNode = document.createElement('div')
    this.layoutManager.wrapper.appendChild(mountNode)

    const root = createRoot(mountNode)
    root.render(
      createElement(SkipButton, {
        target,
        onClick: () => {
          getTrackingService().track('clickSkipButton', { target })
          this.jumpToTime(target.endTime)
          this.removeSkipButton()
        },
        onClose: () => {
          this.removeSkipButton()
        },
      })
    )

    this.activeButton = { node: mountNode, root }
    target.shown = true
  }

  private jumpToTime(targetTime: number) {
    if (this.currentVideo) {
      this.logger.debug(`Jumping to time: ${targetTime}s`)
      this.currentVideo.currentTime = targetTime
    }
  }

  private removeSkipButton() {
    const entry = this.activeButton
    if (!entry) {
      return
    }
    this.logger.debug('Removing active button', entry)
    entry.root.unmount()
    entry.node.remove()
    this.activeButton = null
  }

  private cleanup() {
    this.removeEventListeners()
    this.removeSkipButton()
  }
}
