import { describe, expect, it } from 'vitest'
import { buildDensityAreaPath } from '@/content/player/densityPlot/buildDensityAreaPath'

describe('buildDensityAreaPath', () => {
  it('returns empty for invalid args', () => {
    expect(buildDensityAreaPath([], 100, 20, 60)).toBe('')
    expect(buildDensityAreaPath([{ time: 10, value: 0.5 }], 0, 20, 60)).toBe('')
    expect(buildDensityAreaPath([{ time: 10, value: 0.5 }], 100, 0, 60)).toBe(
      ''
    )
    expect(buildDensityAreaPath([{ time: 10, value: 0.5 }], 100, 20, 0)).toBe(
      ''
    )
  })

  it('generates an svg path string', () => {
    const d = buildDensityAreaPath(
      [
        { time: 0, value: 0 },
        { time: 30, value: 1 },
        { time: 60, value: 0 },
      ],
      120,
      20,
      60
    )
    expect(typeof d).toBe('string')
    expect(d.length).toBeGreaterThan(0)
  })
})
