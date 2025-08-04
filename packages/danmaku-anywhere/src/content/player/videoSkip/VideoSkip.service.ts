import type { CommentEntity } from '@danmaku-anywhere/danmaku-converter'
import { Logger } from '@/common/Logger'
import type { SkipTarget } from '@/content/player/videoSkip/SkipTarget'
import type { VideoEventService } from '../monitors/VideoEvent.service'
import { parseCommentsForJumpTargets } from './videoSkipParser'

const logger = Logger.sub('[VideoSkipService]')

export class VideoSkipService {
  private jumpTargets: SkipTarget[] = []
  private activeButtons = new Map<number, HTMLElement>()
  private currentVideo: HTMLVideoElement | null = null

  constructor(
    private videoEventService: VideoEventService,
    private container: HTMLElement
  ) {}

  enable() {
    logger.debug('Enabling VideoSkipService')
    this.setupEventListeners()
  }

  disable() {
    logger.debug('Disabling VideoSkipService')
    this.cleanup()
  }

  setComments(comments: CommentEntity[]) {
    this.jumpTargets = parseCommentsForJumpTargets(comments)
    logger.debug(
      `Parsed ${this.jumpTargets.length} jump targets from ${comments.length} comments`
    )
  }

  private setupEventListeners() {
    this.videoEventService.addVideoEventListener(
      'timeupdate',
      this.handleTimeUpdate.bind(this)
    )
  }

  private handleTimeUpdate = (event: Event) => {
    const video = event.target as HTMLVideoElement
    this.currentVideo = video
    const currentTime = video.currentTime

    // Check if we should show any skip buttons
    for (const target of this.jumpTargets) {
      if (!target.shown && Math.abs(currentTime - target.commentTime) <= 1) {
        this.showSkipButton(target)
        target.shown = true
      }
    }
  }

  private showSkipButton(target: SkipTarget) {
    if (!this.container) return

    const button = this.createSkipButton(target)
    this.container.appendChild(button)
    this.activeButtons.set(target.commentTime, button)

    // Auto-hide after 30 seconds
    setTimeout(() => {
      this.hideSkipButton(target.commentTime)
    }, 30000)
  }

  private createSkipButton(target: SkipTarget): HTMLElement {
    const wrapper = document.createElement('div')
    wrapper.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 20px;
      z-index: 10000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      pointer-events: auto;
    `

    const button = document.createElement('button')
    button.textContent = `空降至 ${target.timestamp}`
    button.style.cssText = `
      background: rgba(0, 0, 0, 0.8);
      color: white;
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 6px;
      padding: 8px 16px;
      font-size: 14px;
      cursor: pointer;
      margin-right: 8px;
      transition: background-color 0.2s;
    `

    button.addEventListener('mouseenter', () => {
      button.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'
    })

    button.addEventListener('mouseleave', () => {
      button.style.backgroundColor = 'rgba(0, 0, 0, 0.8)'
    })

    button.addEventListener('click', () => {
      this.jumpToTime(target.targetTime)
      this.hideSkipButton(target.commentTime)
    })

    const closeButton = document.createElement('button')
    closeButton.textContent = '✕'
    closeButton.style.cssText = `
      background: rgba(255, 255, 255, 0.1);
      color: white;
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 6px;
      padding: 6px 8px;
      font-size: 12px;
      cursor: pointer;
      line-height: 1;
      transition: background-color 0.2s;
    `

    closeButton.addEventListener('mouseenter', () => {
      closeButton.style.backgroundColor = 'rgba(255, 0, 0, 0.3)'
    })

    closeButton.addEventListener('mouseleave', () => {
      closeButton.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'
    })

    closeButton.addEventListener('click', () => {
      this.hideSkipButton(target.commentTime)
    })

    wrapper.appendChild(button)
    wrapper.appendChild(closeButton)

    return wrapper
  }

  private jumpToTime(targetTime: number) {
    if (this.currentVideo) {
      logger.debug(`Jumping to time: ${targetTime}s`)
      this.currentVideo.currentTime = targetTime
    }
  }

  private hideSkipButton(commentTime: number) {
    const button = this.activeButtons.get(commentTime)
    if (button) {
      button.remove()
      this.activeButtons.delete(commentTime)
    }
  }

  private cleanup() {
    // Remove event listeners
    this.videoEventService.removeVideoEventListener(
      'timeupdate',
      this.handleTimeUpdate
    )

    // Remove buttons
    for (const button of this.activeButtons.values()) {
      button.remove()
    }
    this.activeButtons.clear()

    this.jumpTargets = []
  }
}
