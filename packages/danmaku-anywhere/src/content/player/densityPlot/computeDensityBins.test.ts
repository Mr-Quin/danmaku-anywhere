import type { CommentEntity } from '@danmaku-anywhere/danmaku-converter'
import { describe, expect, it } from 'vitest'
import { computeDensityBins } from '@/content/player/densityPlot/computeDensityBins'

function c(time: number, text = 'x'): CommentEntity {
  return {
    p: `${time},1,16777215`,
    m: text,
  }
}

describe('computeDensityBins', () => {
  it('returns empty for invalid duration', () => {
    expect(computeDensityBins([], Number.NaN, 30)).toEqual([])
  })

  it('bins comments by 30s and normalizes', () => {
    const duration = 180 // 3 mins
    const comments = [c(5), c(10), c(15), c(35), c(40), c(95)]
    const bins = computeDensityBins(comments, duration, 30)
    expect(bins.length).toBe(Math.ceil(duration / 30))
    // find max value equals 1
    const max = Math.max(...bins.map((b) => b.value))
    expect(max).toBeCloseTo(1)
    // first bin has 3 comments -> should be the max
    expect(bins[0].time).toBeGreaterThan(0)
    expect(bins[0].value).toBeCloseTo(1)
  })
})
