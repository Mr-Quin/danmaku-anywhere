import type { Options } from '@/common/options/OptionsService/types'

export interface SearchHistoryData {
  entries: string[] // newest first, max 50 unique entries
}

export type SearchHistoryOptions = Options<SearchHistoryData>
