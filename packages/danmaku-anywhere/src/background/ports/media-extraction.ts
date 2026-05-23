import { extractMedia } from '@danmaku-anywhere/web-scraper'
import { portNames } from '@/common/ports/portNames'

const EXTRACTION_TIMEOUT_MS = 30_000

export function setupExtractMedia() {
  chrome.runtime.onConnect.addListener((port) => {
    if (port.name !== portNames.extractMedia) {
      return
    }

    const cleanups = new Set<() => void>()
    const timers = new Set<ReturnType<typeof setTimeout>>()
    let disconnected = false

    port.onDisconnect.addListener(() => {
      disconnected = true
      timers.forEach((t) => clearTimeout(t))
      timers.clear()
      const pending = [...cleanups]
      cleanups.clear()
      pending.forEach((c) => c())
    })

    port.onMessage.addListener(async (message) => {
      if (message.action !== 'extractMedia' || !port.sender?.tab?.id) {
        return
      }

      const { url } = message.data

      try {
        const cleanup = await extractMedia(url, {
          onMediaFound: (mediaInfo) => {
            port.postMessage({
              action: 'extractMedia',
              success: true,
              data: mediaInfo,
              isLast: false,
            })
          },
          onError: (error) => {
            port.postMessage({
              action: 'extractMedia',
              success: false,
              err: error.message,
              isLast: true,
            })
          },
          onComplete: () => {
            if (!disconnected) {
              port.disconnect()
            }
          },
        })

        if (disconnected) {
          cleanup()
          return
        }

        cleanups.add(cleanup)
        const timer = setTimeout(() => {
          timers.delete(timer)
          if (cleanups.delete(cleanup)) {
            cleanup()
          }
        }, EXTRACTION_TIMEOUT_MS)
        timers.add(timer)
      } catch (err) {
        port.postMessage({
          action: 'extractMedia',
          success: false,
          err: err instanceof Error ? err.message : 'Unknown error',
          isLast: true,
        })
        if (!disconnected) {
          port.disconnect()
        }
      }
    })
  })
}
