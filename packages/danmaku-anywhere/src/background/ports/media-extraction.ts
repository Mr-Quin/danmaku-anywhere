import { extractMedia } from '@danmaku-anywhere/web-scraper'
import { portNames } from '@/common/ports/portNames'

export const setupExtractMedia = () => {
  // cleanup keyed by tab id
  const portCleanupCallbacks = new Map<number, () => void>()

  chrome.runtime.onConnect.addListener((port) => {
    if (port.name !== portNames.extractMedia) return

    port.onMessage.addListener(async (message) => {
      if (message.action === 'extractMedia' && port.sender?.tab?.id) {
        const tabId = port.sender.tab.id
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
              port.disconnect()
            },
          })

          // abort after 30 seconds
          setTimeout(() => {
            cleanup()
          }, 30000)

          portCleanupCallbacks.set(tabId, cleanup)
        } catch (err) {
          port.postMessage({
            action: 'extractMedia',
            success: false,
            err: err instanceof Error ? err.message : 'Unknown error',
            isLast: true,
          })
          port.disconnect()
        }
      }
    })

    port.onDisconnect.addListener((port) => {
      if (port.sender?.tab?.id) {
        const tabId = port.sender.tab.id
        const cleanup = portCleanupCallbacks.get(tabId)
        if (cleanup) {
          cleanup()
          portCleanupCallbacks.delete(tabId)
        }
      }
    })
  })
}
