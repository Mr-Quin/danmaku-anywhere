import { inject, injectable } from 'inversify'
import { type ILogger, LoggerSymbol } from '@/common/Logger'

/**
 * Maps frameId → <iframe> DOM element using a postMessage identification protocol.
 * Works cross-origin since postMessage is not restricted by same-origin policy.
 *
 * The player script in each iframe responds to 'danmaku:identify' messages
 * with its frameId, allowing the controller to associate DOM elements with frames.
 */
@injectable('Singleton')
export class IframeResolver {
  private iframeMap = new Map<number, HTMLIFrameElement>()
  private logger: ILogger

  constructor(@inject(LoggerSymbol) logger: ILogger) {
    this.logger = logger.sub('[IframeResolver]')
  }

  /**
   * Resolve all iframes on the page by sending postMessage to each
   * and waiting for the player script to respond with its frameId.
   */
  async resolve(): Promise<Map<number, HTMLIFrameElement>> {
    const iframes = document.querySelectorAll('iframe')
    if (iframes.length === 0) return this.iframeMap

    return new Promise((resolve) => {
      const pending = new Map<string, HTMLIFrameElement>()

      const timeout = setTimeout(() => {
        this.logger.debug(
          `Resolve timed out, ${pending.size} iframes unresolved`
        )
        cleanup()
        resolve(this.iframeMap)
      }, 2000)

      const handler = (e: MessageEvent) => {
        if (e.data?.type !== 'danmaku:identify-response') return

        const iframe = pending.get(e.data.nonce)
        if (iframe) {
          this.iframeMap.set(e.data.frameId, iframe)
          pending.delete(e.data.nonce)
          this.logger.debug(
            `Resolved frameId ${e.data.frameId} → iframe element`
          )
        }

        if (pending.size === 0) {
          cleanup()
          resolve(this.iframeMap)
        }
      }

      const cleanup = () => {
        clearTimeout(timeout)
        window.removeEventListener('message', handler)
      }

      window.addEventListener('message', handler)

      for (const iframe of iframes) {
        const nonce = crypto.randomUUID()
        pending.set(nonce, iframe)
        try {
          iframe.contentWindow?.postMessage(
            { type: 'danmaku:identify', nonce },
            '*'
          )
        } catch {
          pending.delete(nonce)
        }
      }

      // If no iframes had contentWindow, resolve immediately
      if (pending.size === 0) {
        cleanup()
        resolve(this.iframeMap)
      }
    })
  }

  get(frameId: number): HTMLIFrameElement | undefined {
    return this.iframeMap.get(frameId)
  }

  clear() {
    this.iframeMap.clear()
  }
}
