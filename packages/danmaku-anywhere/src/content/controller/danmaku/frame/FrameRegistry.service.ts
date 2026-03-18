import { inject, injectable } from 'inversify'
import { type ILogger, LoggerSymbol } from '@/common/Logger'
import { useStore } from '@/content/controller/store/store'

interface FrameInfo {
  frameId: number
  url: string
  documentId: string
}

@injectable('Singleton')
export class FrameRegistry {
  private logger: ILogger

  /**
   * Tracks the documentId for each frame to distinguish
   * "same script retrying handshake" from "frame reloaded with new script".
   */
  private documentIds = new Map<number, string>()

  constructor(@inject(LoggerSymbol) logger: ILogger) {
    this.logger = logger.sub('[FrameRegistry]')
  }

  /**
   * Register a frame from a playerReady event.
   * Handles re-registration if the frame reloaded (different documentId).
   * No-op if the same script retries (same documentId).
   */
  registerFrame(info: FrameInfo) {
    const knownDocId = this.documentIds.get(info.frameId)

    if (knownDocId) {
      if (knownDocId === info.documentId) {
        // Same script retrying handshake (e.g. after controllerReady), skip
        return
      }
      // Different documentId means the frame reloaded
      this.logger.debug('Frame reloaded, re-registering', {
        frameId: info.frameId,
      })
      this.removeFrameInternal(info.frameId)
    }

    this.documentIds.set(info.frameId, info.documentId)
    useStore.getState().frame.addFrame({
      frameId: info.frameId,
      url: info.url,
    })
  }

  /**
   * Unregister a frame (e.g. from playerUnload).
   * No-op if the frame isn't tracked.
   */
  unregisterFrame(frameId: number) {
    if (!this.documentIds.has(frameId)) return

    this.logger.debug('Frame unloaded, removing', { frameId })
    this.removeFrameInternal(frameId)
  }

  /**
   * Ensure there is an active frame. Sets the given frame as active if none is set.
   */
  ensureActiveFrame(frameId: number) {
    if (!useStore.getState().frame.activeFrame) {
      useStore.getState().frame.setActiveFrame(frameId)
    }
  }

  private removeFrameInternal(frameId: number) {
    this.documentIds.delete(frameId)
    useStore.getState().frame.removeFrame(frameId)
  }
}
