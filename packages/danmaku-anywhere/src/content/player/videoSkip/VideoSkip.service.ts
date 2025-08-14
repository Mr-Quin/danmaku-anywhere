import type { CommentEntity } from '@danmaku-anywhere/danmaku-converter'
import { createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { Logger } from '@/common/Logger'
import { SkipButton } from '@/content/player/components/SkipButton/SkipButton'
import type { SkipTarget } from '@/content/player/videoSkip/SkipTarget'
import type { VideoEventService } from '../monitors/VideoEvent.service'
import { parseCommentsForJumpTargets } from './videoSkipParser'

type ActiveButtonEntry = { node: HTMLElement; root: Root }

const logger = Logger.sub('[VideoSkipService]')

export class VideoSkipService {
  private jumpTargets: SkipTarget[] = []
  private activeButton: ActiveButtonEntry | null = null
  private currentVideo: HTMLVideoElement | null = null

  private readonly boundHandleTimeUpdate: (event: Event) => void
  private readonly boundHandleSeek: () => void

  constructor(
    private videoEventService: VideoEventService,
    private container: HTMLElement
  ) {
    this.boundHandleTimeUpdate = this.handleTimeUpdate.bind(this)
    this.boundHandleSeek = this.handleSeek.bind(this)
  }

  enable() {
    logger.debug('Enabling')
    this.setupEventListeners()
  }

  disable() {
    logger.debug('Disabling')
    this.cleanup()
  }

  setComments(comments: CommentEntity[]) {
    this.jumpTargets = parseCommentsForJumpTargets(comments)
    logger.debug(
      `Parsed ${this.jumpTargets.length} jump targets from ${comments.length} comments`,
      this.jumpTargets
    )
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
    if (!this.container) return

    logger.debug('Creating skip buttons', target)

    const mountNode = document.createElement('div')
    this.container.appendChild(mountNode)

    const root = createRoot(mountNode)
    root.render(
      createElement(SkipButton, {
        target,
        onClick: () => {
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
      logger.debug(`Jumping to time: ${targetTime}s`)
      this.currentVideo.currentTime = targetTime
    }
  }

  private removeSkipButton() {
    const entry = this.activeButton
    if (!entry) {
      return
    }
    logger.debug('Removing active button', entry)
    entry.root.unmount()
    entry.node.remove()
    this.activeButton = null
  }

  private cleanup() {
    this.removeEventListeners()
    this.removeSkipButton()
  }
}
