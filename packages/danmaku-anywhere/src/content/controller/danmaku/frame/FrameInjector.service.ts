import { inject, injectable } from 'inversify'
import { useToast } from '@/common/components/Toast/toastStore'
import { type ILogger, LoggerSymbol } from '@/common/Logger'
import { i18n } from '@/common/localization/i18n'
import { chromeRpcClient } from '@/common/rpcClient/background/client'
import { createTaskQueue } from '@/common/utils/taskQueue'
import { PageVisibilityService } from '@/content/common/services/PageVisibility.service'
import { useStore } from '@/content/controller/store/store'

interface Frame {
  frameId: number
  url: string
  documentId: string
}

async function fallbackGetCurrentFrame(): Promise<Frame> {
  const { data: frameId } = await chromeRpcClient.getFrameId()

  return {
    frameId,
    url: window.location.href,
    documentId: 'FALLBACK',
  }
}

const urlBlacklist = ['about:blank', 'google.com']

const q = createTaskQueue()

@injectable('Singleton')
export class FrameInjector {
  private injectedFrames = new Set<number>()
  private isFirstGetAllFrames = true
  private pollInterval: NodeJS.Timeout | null = null
  private prevFrameIds = new Set<number>()
  private logger
  private visibilityCleanup: (() => void) | null = null

  constructor(
    @inject(LoggerSymbol) logger: ILogger,
    @inject(PageVisibilityService)
    private pageVisibilityService: PageVisibilityService
  ) {
    this.logger = logger.sub('[FrameInjector]')
  }

  public start() {
    if (this.visibilityCleanup) {
      return
    }

    this.visibilityCleanup = this.pageVisibilityService.onVisibilityChange(
      (visible) => {
        this.logger.debug('Visibility changed', visible)
        if (visible) {
          this.startPolling()
        } else {
          this.stopPolling()
        }
      }
    )

    if (this.pageVisibilityService.isVisible) {
      this.startPolling()
    }
  }

  public stop() {
    if (this.visibilityCleanup) {
      this.visibilityCleanup()
      this.visibilityCleanup = null
    }
    this.stopPolling()
  }

  private startPolling() {
    if (this.pollInterval) {
      return
    }

    q.run(() => this.pollFrames())
    this.pollInterval = setInterval(() => {
      q.run(() => this.pollFrames())
    }, 5000)
  }

  private stopPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval)
      this.pollInterval = null
    }
  }

  private async pollFrames() {
    try {
      const res = await chromeRpcClient.getAllFrames(undefined)
      const frames = res.data.filter((frame) => {
        return !urlBlacklist.some((url) => frame.url.includes(url))
      })

      // capture flag value
      const isFirstGetAllFrames = this.isFirstGetAllFrames
      this.isFirstGetAllFrames = false

      if (frames.length === 0 && isFirstGetAllFrames) {
        console.log('No frames found, handling fallback')
        await this.handleFallbackFrame()
        return
      }

      // return early if no diff
      const hasDiff = this.checkFrameDiff(frames)
      if (!hasDiff) {
        return
      }

      // inject script into all frames
      for (const frame of frames) {
        this.handleFrameLogics(frame)
      }

      const { allFrames, removeFrame } = useStore.getState().frame

      // when a frame is removed, remove it from the store
      const currentFrameIds = new Set(frames.map((frame) => frame.frameId))
      const prevFrameIds = new Set(allFrames.keys())
      const deletedIds = prevFrameIds.difference(currentFrameIds)

      deletedIds.forEach((frameId) => {
        removeFrame(frameId)
      })
    } catch (e) {
      this.logger.error('Failed to poll frames', e)
    }
  }

  private handleFrameLogics(frame: Frame) {
    const { allFrames, removeFrame, addFrame } = useStore.getState().frame

    if (this.injectedFrames.has(frame.frameId)) {
      // if documentId is different, it means the frame has been reloaded, we need to re-inject
      const existingFrame = allFrames.get(frame.frameId)
      if (existingFrame?.documentId !== frame.documentId) {
        this.logger.debug('Frame reloaded, re-injecting', frame)
        this.injectFrame(frame)
        // remove and re-add the frame to update the documentId
        removeFrame(frame.frameId)
        addFrame({
          frameId: frame.frameId,
          url: frame.url,
          documentId: frame.documentId,
        })
        return
      }
    } else {
      this.injectFrame(frame)
    }
  }

  private async injectFrame(frame: Frame) {
    const { frameId } = frame
    this.logger.debug('Injecting player into frame', frame)

    // optimistically mark as injected to prevent duplicate calls
    this.injectedFrames.add(frameId)

    try {
      await chromeRpcClient.injectScript(frameId)

      const { addFrame, activeFrame, setActiveFrame } =
        useStore.getState().frame

      addFrame({
        frameId: frame.frameId,
        url: frame.url,
        documentId: frame.documentId,
      })

      // If there is no active frame, set the first frame as active
      if (!activeFrame) {
        setActiveFrame(frame.frameId)
      }
    } catch (e) {
      this.logger.error('Failed to inject script', e)
      this.injectedFrames.delete(frame.frameId)
    }
  }

  private async handleFallbackFrame() {
    useToast
      .getState()
      .toast.warn(
        i18n.t(
          'danmaku.alert.frameListEmpty',
          'Browser returned an empty frame list, this likely indicates a bug in the browser.'
        )
      )
    try {
      const fallbackFrame = await fallbackGetCurrentFrame()
      this.handleFrameLogics(fallbackFrame)
      this.isFirstGetAllFrames = false
    } catch (e) {
      this.logger.error('Failed to inject into fallback frame', e)
    }
  }

  private checkFrameDiff(frames: Frame[]): boolean {
    const prevFrameIds = this.prevFrameIds
    const newFrameIds = new Set(frames.map((frame) => frame.frameId))
    const diff = newFrameIds.difference(prevFrameIds)

    if (diff.size > 0) {
      this.prevFrameIds = newFrameIds
      return true
    }

    return false
  }
}
