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

const FALLBACK_DOCUMENT_ID = 'FALLBACK'

async function fallbackGetCurrentFrame(): Promise<Frame> {
  const { data: frameId } = await chromeRpcClient.getFrameId()

  return {
    frameId,
    url: window.location.href,
    documentId: FALLBACK_DOCUMENT_ID,
  }
}

const urlBlacklist = ['about:blank', 'google.com']

const q = createTaskQueue()

@injectable('Singleton')
export class FrameInjector {
  private injectedFrames = new Set<number>()
  private isFirstGetAllFrames = true
  private isFallbackMode = false
  private pollInterval: ReturnType<typeof setInterval> | null = null
  private visibilityCleanup: (() => void) | null = null
  private logger: ILogger

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
        /**
         * The frames list should contain at least the main frame,
         * but some browsers, such as Lemur, will return an empty list.
         * In this case, we use the fallback frame so that
         * the user can still use the extension at least in the main frame.
         */
        this.logger.debug('No frames found, using fallback frame')
        await this.handleFallbackFrame()
        this.isFallbackMode = true
        return
      }

      // if we for some reason start getting frames, reset fallback flag
      if (frames.length > 0) {
        this.isFallbackMode = false
      }

      // if we are in fallback mode and the API still returns no frames, do nothing to preserve the fallback frame.
      if (this.isFallbackMode) {
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
    const { allFrames } = useStore.getState().frame

    if (this.injectedFrames.has(frame.frameId)) {
      // if documentId is different, it means the frame has been reloaded, we need to re-inject
      const existingFrame = allFrames.get(frame.frameId)
      if (existingFrame?.documentId !== frame.documentId) {
        this.logger.debug('Frame reloaded, re-injecting', frame)
        this.injectFrame(frame)
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
    } catch (e) {
      this.logger.error('Failed to inject into fallback frame', e)
    }
  }
}
