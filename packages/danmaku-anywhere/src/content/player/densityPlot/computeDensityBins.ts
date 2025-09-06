import type { CommentEntity } from '@danmaku-anywhere/danmaku-converter'
import type { DensityPoint } from '@/content/player/densityPlot/types'

export function computeDensityBins(
  comments: CommentEntity[],
  duration: number,
  binSizeSec = 10
): DensityPoint[] {
  if (!Number.isFinite(duration) || duration <= 0) {
    return []
  }
  const binSize = Math.max(1, binSizeSec)
  const binCount = Math.max(1, Math.ceil(duration / binSize))
  const counts = new Array<number>(binCount).fill(0)

  for (const c of comments) {
    const [timeStr] = c.p.split(',')
    const t = Number.parseFloat(timeStr)
    if (!Number.isFinite(t) || t < 0 || t > duration) {
      continue
    }
    const idx = Math.min(binCount - 1, Math.floor(t / binSize))
    counts[idx] += 1
  }

  const maxCount = counts.reduce((m, v) => (v > m ? v : m), 0) || 1

  return counts.map((cnt, i) => {
    const time = Math.min(duration, i * binSize + binSize / 2)
    const value = cnt / maxCount
    return { time, value }
  })
}
