import { logger } from '@/common/logger'

const getIconBitmap = async (path: string) => {
  const response = await fetch(chrome.runtime.getURL(path))
  const blob = await response.blob()
  return await createImageBitmap(blob)
}

let activeIconCache: ImageData | null = null
const setActiveIcon = async (tabId: number) => {
  if (activeIconCache) {
    await chrome.action.setIcon({ imageData: activeIconCache, tabId })
    return
  }
  try {
    // Fetch the original icon
    const imgBitmap = await getIconBitmap('normal_16.png')

    const canvas = new OffscreenCanvas(16, 16)
    const ctx = canvas.getContext('2d')

    if (!ctx) {
      logger.error('Error getting canvas context')
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
    activeIconCache = imageData
    await chrome.action.setIcon({ imageData, tabId })
  } catch (err) {
    logger.error('Error overlaying icon:', err)
  }
}

const setUnavailableIcon = async (tabId: number) => {
  const imgBitmap = await getIconBitmap('normal_16.png')

  const canvas = new OffscreenCanvas(16, 16)
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    logger.error('Error getting canvas context')
    return
  }

  // make the icon gray
  ctx.filter = 'grayscale(100%)'
  ctx.drawImage(imgBitmap, 0, 0, 16, 16)

  const imageData = ctx.getImageData(0, 0, 16, 16)
  await chrome.action.setIcon({ imageData, tabId })
}

const setNormalIcon = async (tabId: number) => {
  await chrome.action.setIcon({ path: 'normal_16.png', tabId })
}

export const iconService = {
  setActive: setActiveIcon,
  setUnavailable: setUnavailableIcon,
  setNormal: setNormalIcon,
}
