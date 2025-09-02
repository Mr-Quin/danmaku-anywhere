import * as d3 from 'd3'
import type { DensityPoint } from '@/content/player/densityPlot/types'

export function buildDensityAreaPath(
  data: DensityPoint[],
  width: number,
  height: number,
  duration: number
): string {
  if (!Array.isArray(data) || data.length === 0) return ''
  if (!Number.isFinite(width) || width <= 0) return ''
  if (!Number.isFinite(height) || height <= 0) return ''
  if (!Number.isFinite(duration) || duration <= 0) return ''

  const x = d3.scaleLinear().domain([0, duration]).range([0, width])
  const y = d3.scaleLinear().domain([0, 1]).range([height, 0])

  const area = d3
    .area<DensityPoint>()
    .x((d) => x(d.time))
    .y0(() => y(0))
    .y1((d) => y(d.value))
    .curve(d3.curveMonotoneX)

  return area(data) ?? ''
}
