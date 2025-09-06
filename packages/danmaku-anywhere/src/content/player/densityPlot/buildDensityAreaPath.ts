import * as d3 from 'd3'
import type { DensityPoint } from '@/content/player/densityPlot/types'

export function buildDensityAreaPath(
  data: DensityPoint[],
  width: number,
  height: number,
  duration: number
): string {
  if (data.length === 0 || width <= 0 || height <= 0 || duration <= 0) {
    return ''
  }

  const x = d3.scaleLinear().domain([0, duration]).range([0, width])
  const y = d3.scaleLinear().domain([0, 1]).range([height, 0])

  const padded: DensityPoint[] = [
    { time: 0, value: 0 },
    ...data,
    { time: duration, value: 0 },
  ]

  const area = d3
    .area<DensityPoint>()
    .x((d) => x(d.time))
    .y0(() => y(0))
    .y1((d) => y(d.value))
    .curve(d3.curveMonotoneX)

  return area(padded) ?? ''
}
