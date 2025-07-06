import type { components as nextComponents } from '../../../bangumi-api/schema-next'

export type BgmTrendingSubject = nextComponents['schemas']['TrendingSubject']
export type BgmSlimSubject = nextComponents['schemas']['SlimSubject']
export type BgmSubject = nextComponents['schemas']['Subject']
export type BgmCalendar = nextComponents['schemas']['Calendar'][string][]

export type BgmTrendingQueryResponse = {
  data: BgmTrendingSubject[]
  total: number
}
