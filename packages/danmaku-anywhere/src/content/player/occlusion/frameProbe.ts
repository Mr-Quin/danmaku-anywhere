export type Readability = 'readable' | 'tainted' | 'undetermined'

// A tainted video only surfaces its taint at the pixel read.
export function probeReadability(video: HTMLVideoElement): Readability {
  // No decoded frame: drawImage no-ops and getImageData would read clean.
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
