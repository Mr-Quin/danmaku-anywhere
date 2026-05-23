import { extractMedia } from '@danmaku-anywhere/web-scraper'
import { portNames } from '@/common/ports/portNames'

export function setupExtractMedia() {
  chrome.runtime.onConnect.addListener((port) => {
    if (port.name !== portNames.extractMedia) {
      return
    }

    let cleanup: (() => void) | undefined
    let timer: ReturnType<typeof setTimeout> | undefined
    let disconnected = false

    port.onDisconnect.addListener(() => {
      disconnected = true
      if (timer) {
        clearTimeout(timer)
      }
      cleanup?.()
    })

    port.onMessage.addListener(async (message) => {
      if (message.action !== 'extractMedia' || !port.sender?.tab?.id) {
        return
      }

      const { url } = message.data

      try {
        const c = await extractMedia(url, {
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
          c()
          return
        }

        cleanup = c
        timer = setTimeout(c, 30_000)
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
