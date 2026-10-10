export type Readability = 'readable' | 'tainted' | 'undetermined'

export function probeReadability(video: HTMLVideoElement): Readability {
  // Without a decoded frame drawImage no-ops and the read looks clean.
  if (video.readyState < 2) {
    return 'undetermined'
  }
  const canvas = document.createElement('canvas')
  canvas.width = 2
  canvas.height = 2
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return 'readable'
  }
  try {
    ctx.drawImage(video, 0, 0, 2, 2)
    ctx.getImageData(0, 0, 1, 1)
    return 'readable'
  } catch (e) {
    if (e instanceof DOMException && e.name === 'SecurityError') {
      return 'tainted'
    }
    return 'readable'
  }
}
