import type {
  BgmSubjectSearchFilterModel,
  BgmSubjectSearchSorting,
} from '../bangumi/types/bangumi.types'

export type SearchProvider = 'kazumi' | 'bangumi'

export interface BaseSearchModel {
  provider: SearchProvider
  term: string
  sorting?: unknown
  filter?: unknown
}

export interface BangumiSearchModel extends BaseSearchModel {
  provider: 'bangumi'
  sorting?: BgmSubjectSearchSorting
  filter?: BgmSubjectSearchFilterModel
}

export interface KazumiSearchModel extends BaseSearchModel {
  provider: 'kazumi'
}

export type SearchModel = BangumiSearchModel | KazumiSearchModel

export type SearchHistoryEntry = SearchModel & { timestamp: number }
