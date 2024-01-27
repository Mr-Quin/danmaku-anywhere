import { Logger } from '@/common/services/Logger'
import { invariant, isServiceWorker } from '@/common/utils'

type Chrome = typeof chrome

export class IconService {
  private chrome: Chrome
  private activeIconCache: ImageData | null = null

  constructor(chrome: Chrome) {
    invariant(
      isServiceWorker(),
      'IconService is only available in service worker'
    )

    this.chrome = chrome
  }

  async getIconBitmap(path: string) {
    const response = await fetch(this.chrome.runtime.getURL(path))
    const blob = await response.blob()
    return await createImageBitmap(blob)
  }

  async setActive(tabId: number) {
    if (this.activeIconCache) {
      await this.chrome.action.setIcon({
        imageData: this.activeIconCache,
        tabId,
      })
      return
    }
    try {
      // Fetch the original icon
      const imgBitmap = await this.getIconBitmap('normal_16.png')

      const canvas = new OffscreenCanvas(16, 16)
      const ctx = canvas.getContext('2d')

      if (!ctx) {
        Logger.error('Error getting canvas context')
        return
      }

      // Draw the original icon
      ctx.drawImage(imgBitmap, 0, 0, 16, 16)

      // Define green dot size and position
      const dotRadius = 6 // Size of green dot
      const dotX = 14 // X-position (right corner)
      const dotY = 2 // Y-position (top corner)

      // Draw the green circle overlay
      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.arc(dotX, dotY, dotRadius, 0, 2 * Math.PI)
      ctx.fill()

      const imageData = ctx.getImageData(0, 0, 16, 16)
      this.activeIconCache = imageData
      await this.chrome.action.setIcon({ imageData, tabId })
    } catch (err) {
      Logger.error('Error overlaying icon:', err)
    }
  }

  async setUnavailable(tabId: number) {
    const imgBitmap = await this.getIconBitmap('normal_16.png')

    const canvas = new OffscreenCanvas(16, 16)
    const ctx = canvas.getContext('2d')

    if (!ctx) {
      Logger.error('Error getting canvas context')
      return
    }

    // make the icon gray
    ctx.filter = 'grayscale(100%)'
    ctx.drawImage(imgBitmap, 0, 0, 16, 16)

    const imageData = ctx.getImageData(0, 0, 16, 16)
    await this.chrome.action.setIcon({ imageData, tabId })
  }

  async setNormal(tabId: number) {
    await this.chrome.action.setIcon({ path: 'normal_16.png', tabId })
  }
}
